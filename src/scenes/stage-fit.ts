/**
 * 场景舞台适配与图区画布尺寸（场景共享层）
 *
 * 固定逻辑画布（baseWidth × baseHeight）按 contain 放进舞台，并避让浮动
 * 读数面板。此前这些函数逐字复制在十余个场景里，现统一在此。
 */

import { applyCanvasSize, getResponsiveScale } from '../core/canvas-sizing';
import { readoutOccludesStage } from '../platform/stage-readout';

/** 浮动读数面板对舞台的遮挡信息（stageLayoutFrom 产出） */
export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

/** 逻辑画布在舞台上的放置：缩放与左上角偏移（CSS px） */
export type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

/** 把 boxW × boxH 等比放进可用区域；alignX 控制水平对齐，垂直居中 */
export function containInRect(
  boxW: number,
  boxH: number,
  availW: number,
  availH: number,
  originX: number,
  originY: number,
  alignX: 'left' | 'center'
): StagePose {
  const w = Math.max(1, availW);
  const h = Math.max(1, availH);
  const fit = Math.min(w / boxW, h / boxH);
  const stageW = boxW * fit;
  const stageH = boxH * fit;
  return {
    fit,
    offsetX: originX + (alignX === 'center' ? (w - stageW) / 2 : 0),
    offsetY: originY + (h - stageH) / 2
  };
}

/** 取缩放更大（更清晰）的放置；相等时保留 a */
export function betterPose(a: StagePose, b: StagePose): StagePose {
  return b.fit > a.fit + 1e-9 ? b : a;
}

/**
 * 宿主内容盒尺寸（扣除 padding）。
 *
 * 注意：仍以 getBoundingClientRect 测量（debt-ledger B23），舞台被
 * panzoom 缩放时会得到屏幕尺寸。修复只需改这一处为 offsetWidth 系
 * （core/canvas-sizing.readElementLayoutSize），但会改动图区像素，
 * 需同步重生视觉基线。
 */
export function contentBoxSize(host: HTMLElement): {
  width: number;
  height: number;
} {
  const cs = getComputedStyle(host);
  const rect = host.getBoundingClientRect();
  const padX =
    (Number.parseFloat(cs.paddingLeft) || 0) +
    (Number.parseFloat(cs.paddingRight) || 0);
  const padY =
    (Number.parseFloat(cs.paddingTop) || 0) +
    (Number.parseFloat(cs.paddingBottom) || 0);
  return {
    width: Math.max(1, Math.floor(rect.width - padX)),
    height: Math.max(1, Math.floor(rect.height - padY))
  };
}

/** 图区画布按宿主内容盒定尺寸（dpr ≤ 2）；无宿主时用 fallback */
export function sizeCanvasToHostBox(
  canvas: HTMLCanvasElement,
  fallback: { width: number; height: number }
): {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  responsiveScale: number;
} {
  const host = canvas.parentElement;
  let cssWidth: number;
  let cssHeight: number;
  if (host) {
    const box = contentBoxSize(host);
    cssWidth = box.width;
    cssHeight = box.height;
  } else {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width || fallback.width));
    cssHeight = Math.max(1, Math.floor(rect.height || fallback.height));
  }
  const dpr = Math.min(
    2,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
  const responsiveScale = getResponsiveScale(cssWidth, cssHeight);
  const ctx = applyCanvasSize(canvas, {
    width: Math.max(1, Math.floor(cssWidth * dpr)),
    height: Math.max(1, Math.floor(cssHeight * dpr)),
    cssWidth,
    cssHeight,
    dpr,
    responsiveScale
  });
  return { ctx, cssWidth, cssHeight, responsiveScale };
}

/** 固定逻辑画布 + 浮动读数避让的场景常量 */
export type StageFitConfig = {
  baseWidth: number;
  baseHeight: number;
  /** 舞台与读数浮层之间的留白（CSS px） */
  overlayGapPx: number;
  /** 低于此缩放视为看不清，改用整幅 contain */
  minReadableFit: number;
  /** 逻辑画布顶部可被浮层压住的高度（逻辑单位） */
  overlayClearTop: number;
  /** 测不到浮层宽度时假定的遮挡宽度（CSS px） */
  overlayFallbackPx: number;
};

/** 测量浮动读数面板对画布的遮挡（读数面板为画布父节点内的兄弟元素） */
export function measureStageLayout(
  canvas: Element | null | undefined,
  overlayFallbackPx: number
): StageLayoutHint {
  const floatingReadout = readoutOccludesStage(canvas);
  if (!floatingReadout) return { floatingReadout: false, overlayPx: 0 };
  let overlayPx = 0;
  let overlayTopPx = 0;
  let overlayHeightPx = 0;
  if (canvas instanceof HTMLElement) {
    const panel = canvas.parentElement?.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel'
    );
    if (panel instanceof HTMLElement) {
      const cr = canvas.getBoundingClientRect();
      const rr = panel.getBoundingClientRect();
      if (
        rr.left < cr.right &&
        rr.right > cr.left &&
        rr.top < cr.bottom &&
        rr.bottom > cr.top
      ) {
        overlayPx = Math.max(0, cr.right - rr.left);
        const top = Math.max(rr.top, cr.top);
        const bottom = Math.min(rr.bottom, cr.bottom);
        overlayTopPx = Math.max(0, top - cr.top);
        overlayHeightPx = Math.max(0, bottom - top);
      }
    }
  }
  return {
    floatingReadout: true,
    overlayPx: overlayPx || overlayFallbackPx,
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

/**
 * 把逻辑画布放进舞台：无浮层时整幅居中；有浮层时优先放在浮层左侧，
 * 窄屏再尝试浮层下方，仍看不清则回退整幅 contain（贴底）。
 */
export function fitStage(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint,
  config: StageFitConfig
): StagePose & { boxW: number; boxH: number; floatingReadout: boolean } {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const boxW = config.baseWidth;
  const boxH = config.baseHeight;

  if (!layout.floatingReadout) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    return { ...pose, boxW, boxH, floatingReadout: false };
  }

  const overlay = layout.overlayPx ?? config.overlayFallbackPx;
  const gap = config.overlayGapPx;
  let chosen = containInRect(
    boxW,
    boxH,
    Math.max(1, width - overlay - gap),
    height,
    0,
    0,
    'left'
  );

  const overlayTop = layout.overlayTopPx;
  const overlayH = layout.overlayHeightPx;
  const wideColumn =
    width + 1e-6 >= boxW && chosen.fit >= config.minReadableFit;
  if (
    !wideColumn &&
    typeof overlayTop === 'number' &&
    typeof overlayH === 'number' &&
    overlayH > 0
  ) {
    const overlayBottom = overlayTop + overlayH;
    const clearTop = config.overlayClearTop;
    const denom = boxH - clearTop;
    if (overlayBottom + gap < height - 1 && denom > 1) {
      const fit = Math.min(
        width / boxW,
        height / boxH,
        (height - overlayBottom - gap) / denom
      );
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        const minOY = overlayBottom + gap - clearTop * fit;
        const maxOY = height - stageH;
        chosen = betterPose(chosen, {
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: Math.max(0, Math.min(minOY, maxOY))
        });
      }
    }
  }

  if (chosen.fit < config.minReadableFit) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    chosen = betterPose(chosen, {
      ...pose,
      offsetY: Math.max(0, height - boxH * pose.fit)
    });
  }

  return { ...chosen, boxW, boxH, floatingReadout: true };
}

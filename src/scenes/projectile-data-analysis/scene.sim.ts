import { clamp } from '../../core/math';

export type ProjectileDataMode = 'trajectory' | 'strobe';

export type ProjectileDataParams = {
  v0: number;
  gravity: number;
  period: number;
  mode: ProjectileDataMode;
  showVectors: boolean;
};

export type ProjectileDataPoint = {
  index: number;
  time: number;
  x: number;
  y: number;
  deltaY: number;
};

export type ProjectileDataState = {
  params: ProjectileDataParams;
  time: number;
  currentIndex: number;
  points: ProjectileDataPoint[];
  current: ProjectileDataPoint;
  deltaX: number;
  deltaY2: number;
  restoredV0: number;
  vx: number;
  vy: number;
  speed: number;
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const BASE_W = 820;
const BASE_H = 620;
const ORIGIN_X = 88;
const ORIGIN_Y = 78;
const AXIS_END_X = 790;
const AXIS_END_Y = 548;
const GRID_STEP_X = 112;
const GRID_STEP_Y = 90;
const GRID_COUNT_X = 6;
const GRID_COUNT_Y = 5;
const GRID_MINOR_DIV = 4;
const X_SCALE = 280;
const Y_SCALE = 240;
/** Default strobe samples: O(0) … D(4T). */
const SAMPLE_COUNT = 5;
const LAST_SAMPLE_INDEX = SAMPLE_COUNT - 1;
const POINT_RADIUS = 7;
const LABEL_OFFSET_X = 12;
const LABEL_OFFSET_Y = 14;
const TRAJECTORY_SAMPLE_COUNT = 72;
const VECTOR_SCALE = 10;
const ANALYSIS_LEFT = 505;
const ANALYSIS_TOP = 118;
const ANALYSIS_WIDTH = 248;
const ANALYSIS_HEIGHT = 88;
const FORMULA_LEFT = 72;
const FORMULA_TOP = 564;
const FORMULA_MID = 390;
const FORMULA_RIGHT = 748;
const FORMULA_HEIGHT = 40;
const TITLE_Y = 28;
const INITIAL_INDEX = 3;
const DEFAULT_V0 = 2;
const DEFAULT_GRAVITY = 10;
const DEFAULT_PERIOD = 0.15;

export const projectileDataConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  originX: ORIGIN_X,
  originY: ORIGIN_Y,
  axisEndX: AXIS_END_X,
  axisEndY: AXIS_END_Y,
  gridStepX: GRID_STEP_X,
  gridStepY: GRID_STEP_Y,
  gridCountX: GRID_COUNT_X,
  gridCountY: GRID_COUNT_Y,
  gridMinorDiv: GRID_MINOR_DIV,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  sampleCount: SAMPLE_COUNT,
  lastSampleIndex: LAST_SAMPLE_INDEX,
  pointRadius: POINT_RADIUS,
  labelOffsetX: LABEL_OFFSET_X,
  labelOffsetY: LABEL_OFFSET_Y,
  trajectorySampleCount: TRAJECTORY_SAMPLE_COUNT,
  vectorScale: VECTOR_SCALE,
  analysisLeft: ANALYSIS_LEFT,
  analysisTop: ANALYSIS_TOP,
  analysisWidth: ANALYSIS_WIDTH,
  analysisHeight: ANALYSIS_HEIGHT,
  formulaLeft: FORMULA_LEFT,
  formulaTop: FORMULA_TOP,
  formulaMid: FORMULA_MID,
  formulaRight: FORMULA_RIGHT,
  formulaHeight: FORMULA_HEIGHT,
  titleY: TITLE_Y,
  initialIndex: INITIAL_INDEX,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /** Title stays in the stage; do not tuck the viewBox under the overlay. */
  overlayClearTop: 0,
  minReadableFit: 0.48,
  defaultV0: DEFAULT_V0,
  defaultGravity: DEFAULT_GRAVITY,
  defaultPeriod: DEFAULT_PERIOD
} as const;

const C = projectileDataConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(
  input: Partial<ProjectileDataParams>
): ProjectileDataParams {
  return {
    v0: clamp(finite(input.v0, DEFAULT_V0), 0.5, 5),
    gravity: clamp(finite(input.gravity, DEFAULT_GRAVITY), 1.6, 15),
    period: clamp(finite(input.period, DEFAULT_PERIOD), 0.05, 0.3),
    mode: input.mode === 'trajectory' ? 'trajectory' : 'strobe',
    showVectors: input.showVectors !== false
  };
}

export function projectileDataPoint(
  v0: number,
  gravity: number,
  period: number,
  index: number
): ProjectileDataPoint {
  const safeV0 = Math.max(0, v0);
  const safeGravity = Math.max(0, gravity);
  const safePeriod = Math.max(0, period);
  const safeIndex = Math.max(0, Math.floor(index));
  const time = safeIndex * safePeriod;
  const x = safeV0 * time;
  const y = 0.5 * safeGravity * time * time;
  const previousY =
    safeIndex === 0 ? 0 : 0.5 * safeGravity * (time - safePeriod) ** 2;
  return { index: safeIndex, time, x, y, deltaY: y - previousY };
}

export function projectileDataDeltaY2(gravity: number, period: number): number {
  return Math.max(0, gravity) * Math.max(0, period) ** 2;
}

export function projectileDataToCanvas(
  x: number,
  y: number
): { x: number; y: number } {
  return { x: ORIGIN_X + x * X_SCALE, y: ORIGIN_Y + y * Y_SCALE };
}

function containInRect(
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

function betterPose(a: StagePose, b: StagePose): StagePose {
  return b.fit > a.fit + 1e-9 ? b : a;
}

/**
 * 浮动读数判定：看布局 DOM，不看 canvas 宽度。
 * 项目断点 width<768 → mobile-stack（读数在 Tab）；≥768 → split-right（读数叠在动画区）。
 */
export function hasFloatingReadout(anchor?: Element | null): boolean {
  if (typeof document === 'undefined') return true;
  const node = anchor ?? document.body;
  if (
    node.closest('.mobile-stack-layout, [data-testid="mobile-stack-layout"]')
  ) {
    return false;
  }
  if (node.closest('.split-right-shell, [data-testid="split-right-layout"]')) {
    return true;
  }
  const panel = document.querySelector(
    '.teaching-readout-panel, .srgb-readout-panel'
  );
  if (panel instanceof HTMLElement && anchor?.parentElement) {
    const overlay =
      getComputedStyle(panel).position === 'absolute' ||
      getComputedStyle(panel).position === 'fixed';
    return overlay && panel.parentElement === anchor.parentElement;
  }
  return true;
}

/** view 共用：从布局 DOM 读浮动读数与叠占宽度。 */
export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  const floatingReadout = hasFloatingReadout(canvas);
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
    overlayPx: overlayPx || FLOATING_OVERLAY_FALLBACK,
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

/**
 * 820×620 基准几何。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先把舞台缩进 overlay 左侧；窄分栏左侧过窄时
 * 改为把舞台放到实测 overlay 下方。标题与公式卡必须留在 overlay 之外。
 */
export function stageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): {
  fit: number;
  offsetX: number;
  offsetY: number;
  boxW: number;
  boxH: number;
  floatingReadout: boolean;
} {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const boxW = C.baseWidth;
  const boxH = C.baseHeight;

  if (!layout.floatingReadout) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    return { ...pose, boxW, boxH, floatingReadout: false };
  }

  const overlay = layout.overlayPx ?? FLOATING_OVERLAY_FALLBACK;
  const gap = C.overlayGapPx;
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
  const wideColumn = width + 1e-6 >= boxW && chosen.fit >= C.minReadableFit;
  if (
    !wideColumn &&
    typeof overlayTop === 'number' &&
    typeof overlayH === 'number' &&
    overlayH > 0
  ) {
    const overlayBottom = overlayTop + overlayH;
    const clearTop = C.overlayClearTop;
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

  if (chosen.fit < C.minReadableFit) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    chosen = betterPose(chosen, {
      ...pose,
      offsetY: Math.max(0, height - boxH * pose.fit)
    });
  }

  return { ...chosen, boxW, boxH, floatingReadout: true };
}

export function createProjectileDataSim(
  initial: Partial<ProjectileDataParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function makePoints(): ProjectileDataPoint[] {
    return Array.from({ length: SAMPLE_COUNT }, (_, index) =>
      projectileDataPoint(params.v0, params.gravity, params.period, index)
    );
  }

  return {
    getState(): ProjectileDataState {
      const points = makePoints();
      const currentIndex = Math.min(
        LAST_SAMPLE_INDEX,
        Math.floor(time / Math.max(params.period, 0.001))
      );
      const current = points[currentIndex];
      const vx = params.v0;
      const vy = params.gravity * current.time;
      return {
        params: { ...params },
        time,
        currentIndex,
        points,
        current,
        deltaX: params.v0 * params.period,
        deltaY2: projectileDataDeltaY2(params.gravity, params.period),
        restoredV0:
          params.period > 0 ? (params.v0 * params.period) / params.period : 0,
        vx,
        vy,
        speed: Math.hypot(vx, vy)
      };
    },
    getSnapshot(): ProjectileDataState {
      return this.getState();
    },
    getParams(): ProjectileDataParams {
      return { ...params };
    },
    setParams(next: Partial<ProjectileDataParams>): ProjectileDataParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
      const cycle = Math.max(params.period * SAMPLE_COUNT, 0.1);
      if (time > cycle) time %= cycle;
    },
    reset(): void {
      time = 0;
      params = { ...defaults };
    }
  };
}

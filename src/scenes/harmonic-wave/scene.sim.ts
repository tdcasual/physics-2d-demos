import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type HarmonicWaveDirection = 'right' | 'left';

export type HarmonicWaveParams = {
  amplitude: number;
  wavelength: number;
  period: number;
  direction: HarmonicWaveDirection;
  pointX: number;
  showGhost: boolean;
  showVelocity: boolean;
  showAcceleration: boolean;
};

export type HarmonicWaveState = {
  params: HarmonicWaveParams;
  time: number;
  waveSpeed: number;
  pointY: number;
  pointVelocity: number;
  pointAcceleration: number;
  velocityDirection: 'up' | 'down' | 'zero';
  accelerationDirection: 'up' | 'down' | 'zero';
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

const TAU = Math.PI * 2;

/**
 * 源 SVG viewBox 960×660；动画区是上半（不含底部看板/滑块）。
 * 坐标与源 physics-zone 一致：原点 (80, 260)，x: 100px/m，y: 12px/cm。
 */
export const harmonicWaveConstants = {
  baseWidth: 960,
  baseHeight: 430,
  originX: 80,
  originY: 260,
  xScale: 100,
  yScale: 12,
  xMaxMeters: 8,
  waveWidth: 800,
  axisLength: 820,
  xLabelOffset: 825,
  yAxisHalf: 140,
  amplitudeGuide: 120,
  indicatorCx: 480,
  indicatorCy: 100,
  indicatorHalfWidth: 70,
  indicatorWidth: 140,
  indicatorHeight: 24,
  indicatorRadius: 12,
  directionArrowHalf: 40,
  particleXs: [0, 1, 2, 3, 4, 5, 6, 7, 8] as const,
  particleRadius: 4,
  pointRadius: 6,
  defaultPointX: 2,
  velocityDisplayScale: 1.5,
  accelerationDisplayScale: 1,
  vectorMinPx: 2,
  /** 源课件 Δt = 0.05 T 的微平移虚线。 */
  ghostDtFraction: 0.05,
  directionThreshold: 0.1,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /**
   * 方向指示以上视为 viewBox 垫边。窄分栏允许伸进 overlay，
   * 指示器、波形和质点 P 必须留在 overlay 之外。
   */
  overlayClearTop: 88,
  minReadableFit: 0.4,
  amplitudeMin: 4,
  amplitudeMax: 10,
  wavelengthMin: 2,
  wavelengthMax: 8,
  periodMin: 1,
  periodMax: 4
} as const;

const C = harmonicWaveConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return fallback;
}

function directionOf(
  value: unknown,
  fallback: HarmonicWaveDirection = 'right'
): HarmonicWaveDirection {
  if (value === 'left' || value === -1 || value === '-1') return 'left';
  if (value === 'right' || value === 1 || value === '1') return 'right';
  return fallback;
}

export function directionSign(
  direction: HarmonicWaveDirection | number | string
): 1 | -1 {
  return direction === 'left' || direction === -1 || direction === '-1'
    ? -1
    : 1;
}

function normalizeParams(
  input: Partial<HarmonicWaveParams>
): HarmonicWaveParams {
  return {
    amplitude: clamp(
      finite(input.amplitude, 10),
      C.amplitudeMin,
      C.amplitudeMax
    ),
    wavelength: clamp(
      finite(input.wavelength, 4),
      C.wavelengthMin,
      C.wavelengthMax
    ),
    period: clamp(finite(input.period, 2), C.periodMin, C.periodMax),
    direction: directionOf(input.direction),
    pointX: clamp(finite(input.pointX, C.defaultPointX), 0, C.xMaxMeters),
    showGhost: flag(input.showGhost, false),
    showVelocity: flag(input.showVelocity, true),
    showAcceleration: flag(input.showAcceleration, true)
  };
}

/**
 * 相位 2π(t/T − dir·x/λ)。向右 dir=+1 → y = A sin[2π(t/T − x/λ)]；
 * 向左 dir=−1 → y = A sin[2π(t/T + x/λ)]。不加 π/2 参考相位。
 */
export function harmonicWavePhase(
  x: number,
  t: number,
  wavelength: number,
  period: number,
  direction: HarmonicWaveDirection | number | string
): number {
  const dir = directionSign(direction);
  return TAU * (t / period - (dir * x) / wavelength);
}

export function harmonicWaveY(
  x: number,
  t: number,
  amplitude: number,
  wavelength: number,
  period: number,
  direction: HarmonicWaveDirection | number | string
): number {
  return (
    amplitude * Math.sin(harmonicWavePhase(x, t, wavelength, period, direction))
  );
}

/** v_y = ∂y/∂t = (2πA/T) cos(phase)。传播方向只改空间项，不乘 dir。 */
export function harmonicWaveVelocity(
  x: number,
  t: number,
  amplitude: number,
  wavelength: number,
  period: number,
  direction: HarmonicWaveDirection | number | string
): number {
  const phase = harmonicWavePhase(x, t, wavelength, period, direction);
  return ((amplitude * TAU) / period) * Math.cos(phase);
}

/** a_y = −ω² y，ω = 2π/T。 */
export function harmonicWaveAcceleration(y: number, period: number): number {
  const omega = TAU / period;
  return -omega * omega * y;
}

export function ghostTime(t: number, period: number): number {
  return t + period * C.ghostDtFraction;
}

function directionLabel(value: number): 'up' | 'down' | 'zero' {
  if (value > C.directionThreshold) return 'up';
  if (value < -C.directionThreshold) return 'down';
  return 'zero';
}

export function worldX(xMeters: number): number {
  return C.originX + xMeters * C.xScale;
}

export function worldY(yCm: number): number {
  return C.originY - yCm * C.yScale;
}

export function hasFloatingReadout(anchor?: Element | null): boolean {
  return readoutOccludesStage(anchor);
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
 * 960×430 动画区。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先把舞台缩进 overlay 左侧；窄分栏左侧过窄时
 * 改为把舞台放到实测 overlay 下方，并允许 viewBox 顶部垫边伸进 overlay。
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

export function pointerToBaseNorm(
  cssX: number,
  cssY: number,
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): { x: number; y: number } {
  const { fit, offsetX, offsetY } = stageTransform(cssWidth, cssHeight, layout);
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * C.baseWidth),
    y: (cssY - offsetY) / (scale * C.baseHeight)
  };
}

/** CSS 像素 → 波形 x（米）。必须与 stageTransform 同一套拟合。 */
export function pointerToWorldX(
  cssX: number,
  cssY: number,
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): number {
  const n = pointerToBaseNorm(cssX, cssY, cssWidth, cssHeight, layout);
  return (n.x * C.baseWidth - C.originX) / C.xScale;
}

export function createHarmonicWaveSim(
  initial: Partial<HarmonicWaveParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  return {
    getState(): HarmonicWaveState {
      const pointY = harmonicWaveY(
        params.pointX,
        time,
        params.amplitude,
        params.wavelength,
        params.period,
        params.direction
      );
      const pointVelocity = harmonicWaveVelocity(
        params.pointX,
        time,
        params.amplitude,
        params.wavelength,
        params.period,
        params.direction
      );
      const pointAcceleration = harmonicWaveAcceleration(pointY, params.period);
      return {
        params: { ...params },
        time,
        waveSpeed: params.wavelength / params.period,
        pointY,
        pointVelocity,
        pointAcceleration,
        velocityDirection: directionLabel(pointVelocity),
        accelerationDirection: directionLabel(pointAcceleration)
      };
    },
    getSnapshot(): HarmonicWaveState {
      return this.getState();
    },
    getParams(): HarmonicWaveParams {
      return { ...params };
    },
    setParams(next: Partial<HarmonicWaveParams>): HarmonicWaveParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    setPointX(pointX: number): void {
      params.pointX = clamp(finite(pointX, params.pointX), 0, C.xMaxMeters);
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

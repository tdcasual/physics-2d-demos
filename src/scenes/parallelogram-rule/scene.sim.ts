import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type ParallelogramStage = 'components' | 'construct' | 'compare';

export type ParallelogramParams = {
  f1: number;
  f2: number;
  angle: number;
  stage: ParallelogramStage;
};

export type Vector = { x: number; y: number };

export type ParallelogramState = {
  params: ParallelogramParams;
  time: number;
  f1: Vector;
  f2: Vector;
  resultant: Vector;
  measured: Vector;
  theoreticalMagnitude: number;
  measuredMagnitude: number;
  magnitudeError: number;
  angleError: number;
  samePoint: boolean;
  sameDirection: boolean;
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

const DEG = Math.PI / 180;
const BASE_W = 720;
const BASE_H = 660;
const ORIGIN = { x: 360, y: 248 };
const HOOK = { x: 360, y: 78 };
const VECTOR_SCALE = 54;
const PAPER_INSET = 22;
const PIN_INSET = 26;
const PIN_RADIUS = 9;
const POINT_RADIUS = 11;
const ARC_RADIUS = 46;
const LABEL_OFFSET = 16;
const AXIS_TOP = 46;
const AXIS_BOTTOM = 560;
const HANDLE_PAD = 36;
const RULER = { x: 86, y: 548, width: 236, height: 36, angle: -9 };
const SET_SQUARE = { x: 478, y: 438, size: 168, angle: 16 };
const F1_MIN = 0.5;
const F1_MAX = 4;
const F2_MIN = 0.5;
const F2_MAX = 4;
const ANGLE_MIN = 20;
const ANGLE_MAX = 160;
const DEFAULT_F1 = 1.82;
const DEFAULT_F2 = 1.82;
const DEFAULT_ANGLE = 90;

/**
 * 学生直尺最小分度 1 mm，估读约 0.5 mm；封面作图矢量约 250 mm → 0.2%。
 * 量角器估读约 0.5°，对应高中作图实验的典型方向偏差。
 */
export const PARALLELOGRAM_MAGNITUDE_REL_ERROR = 0.002;
export const PARALLELOGRAM_ANGLE_ERROR_DEG = 0.5;

export const parallelogramConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  origin: ORIGIN,
  hook: HOOK,
  vectorScale: VECTOR_SCALE,
  paperInset: PAPER_INSET,
  pinInset: PIN_INSET,
  pinRadius: PIN_RADIUS,
  pointRadius: POINT_RADIUS,
  arcRadius: ARC_RADIUS,
  labelOffset: LABEL_OFFSET,
  axisTop: AXIS_TOP,
  axisBottom: AXIS_BOTTOM,
  handlePad: HANDLE_PAD,
  ruler: RULER,
  setSquare: SET_SQUARE,
  f1Min: F1_MIN,
  f1Max: F1_MAX,
  f2Min: F2_MIN,
  f2Max: F2_MAX,
  angleMin: ANGLE_MIN,
  angleMax: ANGLE_MAX,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.48
} as const;

const C = parallelogramConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStage(value: unknown): ParallelogramStage {
  return value === 'construct' || value === 'compare' ? value : 'components';
}

function normalizeParams(
  input: Partial<ParallelogramParams>
): ParallelogramParams {
  return {
    f1: clamp(finite(input.f1, DEFAULT_F1), F1_MIN, F1_MAX),
    f2: clamp(finite(input.f2, DEFAULT_F2), F2_MIN, F2_MAX),
    angle: clamp(finite(input.angle, DEFAULT_ANGLE), ANGLE_MIN, ANGLE_MAX),
    stage: normalizeStage(input.stage)
  };
}

function containInRect(
  boxW: number,
  boxH: number,
  availW: number,
  availH: number,
  alignX: 'left' | 'center'
): StagePose {
  const width = Math.max(1, availW);
  const height = Math.max(1, availH);
  const fit = Math.min(width / boxW, height / boxH);
  return {
    fit,
    offsetX: alignX === 'center' ? (width - boxW * fit) / 2 : 0,
    offsetY: (height - boxH * fit) / 2
  };
}

function betterPose(a: StagePose, b: StagePose): StagePose {
  return b.fit > a.fit + 1e-9 ? b : a;
}

export function hasFloatingReadout(anchor?: Element | null): boolean {
  return readoutOccludesStage(anchor);
}

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
      const canvasRect = canvas.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      if (
        panelRect.left < canvasRect.right &&
        panelRect.right > canvasRect.left &&
        panelRect.top < canvasRect.bottom &&
        panelRect.bottom > canvasRect.top
      ) {
        overlayPx = Math.max(0, canvasRect.right - panelRect.left);
        overlayTopPx = Math.max(panelRect.top, canvasRect.top) - canvasRect.top;
        overlayHeightPx =
          Math.min(panelRect.bottom, canvasRect.bottom) -
          Math.max(panelRect.top, canvasRect.top);
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
 * 720×660 白纸舞台。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先缩进 overlay 左侧；窄分栏改为放到实测 overlay 下方。
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
    return {
      ...containInRect(boxW, boxH, width, height, 'center'),
      boxW,
      boxH,
      floatingReadout: false
    };
  }
  const overlay = layout.overlayPx ?? FLOATING_OVERLAY_FALLBACK;
  const gap = C.overlayGapPx;
  let chosen = containInRect(
    boxW,
    boxH,
    Math.max(1, width - overlay - gap),
    height,
    'left'
  );
  const overlayTop = layout.overlayTopPx;
  const overlayHeight = layout.overlayHeightPx;
  const wideColumn = width >= boxW && chosen.fit >= C.minReadableFit;
  if (
    !wideColumn &&
    typeof overlayTop === 'number' &&
    typeof overlayHeight === 'number' &&
    overlayHeight > 0
  ) {
    const overlayBottom = overlayTop + overlayHeight;
    if (overlayBottom + gap < height - 1) {
      const fit = Math.min(
        width / boxW,
        height / boxH,
        (height - overlayBottom - gap) / boxH
      );
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        chosen = betterPose(chosen, {
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: Math.max(0, Math.min(overlayBottom + gap, height - stageH))
        });
      }
    }
  }
  if (chosen.fit < C.minReadableFit) {
    const pose = containInRect(boxW, boxH, width, height, 'center');
    chosen = betterPose(chosen, {
      ...pose,
      offsetY: Math.max(0, height - boxH * pose.fit)
    });
  }
  return { ...chosen, boxW, boxH, floatingReadout: true };
}

export function vectorMagnitude(v: Vector): number {
  return Math.hypot(v.x, v.y);
}

export function addVectors(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function includedAngleDeg(a: Vector, b: Vector): number {
  const la = vectorMagnitude(a);
  const lb = vectorMagnitude(b);
  if (la < 1e-12 || lb < 1e-12) return 0;
  const cos = clamp((a.x * b.x + a.y * b.y) / (la * lb), -1, 1);
  return Math.acos(cos) / DEG;
}

export function rotateVector(v: Vector, deg: number): Vector {
  const theta = deg * DEG;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function resultantMagnitude(
  f1: number,
  f2: number,
  angle: number
): number {
  return Math.sqrt(
    Math.max(0, f1 * f1 + f2 * f2 + 2 * f1 * f2 * Math.cos(angle * DEG))
  );
}

/**
 * 橡皮条沿竖直轴固定时，两分力夹角为 θ 且水平分量平衡：
 * tan α₁ = F₂ sin θ / (F₁ + F₂ cos θ)，α₂ = θ − α₁。
 * 合力因此始终沿竖直轴（过 O 点），与等效替代实验一致。
 */
export function splitAngles(
  f1: number,
  f2: number,
  angle: number
): { a1: number; a2: number } {
  const theta = angle * DEG;
  const denom = f1 + f2 * Math.cos(theta);
  const a1 =
    Math.abs(denom) < 1e-12
      ? theta / 2
      : Math.atan2(f2 * Math.sin(theta), denom);
  return { a1, a2: theta - a1 };
}

export function componentVectors(
  f1: number,
  f2: number,
  angle: number
): { f1: Vector; f2: Vector } {
  const { a1, a2 } = splitAngles(f1, f2, angle);
  return {
    f1: { x: -f1 * Math.sin(a1), y: f1 * Math.cos(a1) },
    f2: { x: f2 * Math.sin(a2), y: f2 * Math.cos(a2) }
  };
}

export function resultantVector(f1: number, f2: number, angle: number): Vector {
  const parts = componentVectors(f1, f2, angle);
  return addVectors(parts.f1, parts.f2);
}

/** 平行四边形对角线：从 O 出发的 F₁ + F₂。 */
export function parallelogramDiagonal(f1: Vector, f2: Vector): Vector {
  return addVectors(f1, f2);
}

/** 实测合力 F′：在理论合力上叠加直尺/量角器读数误差。 */
export function measuredResultant(resultant: Vector): Vector {
  return rotateVector(
    {
      x: resultant.x * (1 + PARALLELOGRAM_MAGNITUDE_REL_ERROR),
      y: resultant.y * (1 + PARALLELOGRAM_MAGNITUDE_REL_ERROR)
    },
    PARALLELOGRAM_ANGLE_ERROR_DEG
  );
}

function tipPixel(v: Vector, scale: number): { x: number; y: number } {
  return {
    x: ORIGIN.x + v.x * scale,
    y: ORIGIN.y + v.y * scale
  };
}

/**
 * 默认保持 VECTOR_SCALE；仅当矢量端点会画出白纸内边距时整体缩小。
 */
export function diagramFitScale(state: ParallelogramState): number {
  const tips = [state.f1, state.f2, state.resultant, state.measured];
  const left = PAPER_INSET + HANDLE_PAD;
  const right = BASE_W - PAPER_INSET - HANDLE_PAD;
  const top = PAPER_INSET + HANDLE_PAD;
  const bottom = BASE_H - PAPER_INSET - HANDLE_PAD;
  let scale = 1;
  for (const vector of tips) {
    const tip = tipPixel(vector, VECTOR_SCALE);
    const dx = tip.x - ORIGIN.x;
    const dy = tip.y - ORIGIN.y;
    if (dx > 0) {
      const room = right - ORIGIN.x;
      if (dx > room) scale = Math.min(scale, room / dx);
    } else if (dx < 0) {
      const room = ORIGIN.x - left;
      if (-dx > room) scale = Math.min(scale, room / -dx);
    }
    if (dy > 0) {
      const room = bottom - ORIGIN.y;
      if (dy > room) scale = Math.min(scale, room / dy);
    } else if (dy < 0) {
      const room = ORIGIN.y - top;
      if (-dy > room) scale = Math.min(scale, room / -dy);
    }
  }
  return clamp(scale, 0.42, 1);
}

function computeState(
  params: ParallelogramParams,
  time: number
): ParallelogramState {
  const parts = componentVectors(params.f1, params.f2, params.angle);
  const resultant = addVectors(parts.f1, parts.f2);
  const measured = measuredResultant(resultant);
  const theoreticalMagnitude = vectorMagnitude(resultant);
  const measuredMagnitude = vectorMagnitude(measured);
  const magnitudeError =
    theoreticalMagnitude > 1e-12
      ? (Math.abs(measuredMagnitude - theoreticalMagnitude) /
          theoreticalMagnitude) *
        100
      : 0;
  const angleError = includedAngleDeg(resultant, measured);
  const comparing = params.stage === 'compare';
  return {
    params: { ...params },
    time,
    f1: parts.f1,
    f2: parts.f2,
    resultant,
    measured,
    theoreticalMagnitude,
    measuredMagnitude,
    magnitudeError,
    angleError,
    samePoint: comparing,
    sameDirection:
      comparing && angleError <= PARALLELOGRAM_ANGLE_ERROR_DEG + 1e-6
  };
}

export function createParallelogramSim(
  initial: Partial<ParallelogramParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): ParallelogramState {
    return computeState(params, time);
  }

  return {
    getState,
    getSnapshot: getState,
    getParams(): ParallelogramParams {
      return { ...params };
    },
    setParams(next: Partial<ParallelogramParams>): ParallelogramParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
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

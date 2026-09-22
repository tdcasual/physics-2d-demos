import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type ForceCompositionTab =
  | 'synthesis'
  | 'range'
  | 'orthogonal'
  | 'effect';
export type ForceCompositionRule = 'parallelogram' | 'triangle';

export type ForceCompositionParams = {
  tab: ForceCompositionTab;
  rule: ForceCompositionRule;
  f1: number;
  f2: number;
  angle: number;
  orthogonalF: number;
  orthogonalAngle: number;
  gravity: number;
  inclineAngle: number;
  rangeSweep: boolean;
};

export type Vector = { x: number; y: number };

export type ForceCompositionState = {
  params: ForceCompositionParams;
  t: number;
  f1: Vector;
  f2: Vector;
  resultant: Vector;
  fx: Vector;
  fy: Vector;
  g1: Vector;
  g2: Vector;
  gravityVector: Vector;
};

const DEG = Math.PI / 180;
/** 原 mainSVG viewBox 宽；右侧 340 是看板/读数安全区，不是绘图区。 */
const STAGE_W = 960;
const STAGE_H = 660;
/** 网格与物理绘图区（原 `<rect width="620">`）。 */
const DRAW_W = 620;
const ORIGIN = { x: 300, y: 350 };
// 原参考 SVG 的力值→像素换算（SCALE=4）
const VECTOR_SCALE = 4;
const HANDLE_PAD = 28;
/** 原 30° 楔形直角顶点与斜边长（140,480）→(480,480)/(140,283)。 */
const WEDGE_RIGHT_ANGLE = { x: 140, y: 480 };
const WEDGE_HYPOTENUSE = Math.hypot(480 - 140, 480 - 283);
const BLOCK_WIDTH = 70;
const BLOCK_HEIGHT = 36;
const BLOCK_ALONG = 0.52;

export type StageLayoutHint = {
  floatingReadout: boolean;
  /** 浮动读数叠在 canvas 右侧的像素宽度；仅 floatingReadout 时有效。 */
  overlayPx?: number;
};

export type InclineGeometry = {
  theta: number;
  rightAngle: { x: number; y: number };
  baseEnd: { x: number; y: number };
  topEnd: { x: number; y: number };
  slopeDir: { x: number; y: number };
  outwardNormal: { x: number; y: number };
  blockCenter: { x: number; y: number };
  blockRotation: number;
  blockWidth: number;
  blockHeight: number;
  hypotenuseLength: number;
};

/**
 * 斜面、物块、角弧共用同一 inclineAngle。
 * 原 HTML 楔形 polygon 写死 30°，15/60° 时物块会离面——这里按物理重算。
 */
export function inclineGeometry(inclineAngle: number): InclineGeometry {
  const theta = clamp(finite(inclineAngle, 30), 15, 60) * DEG;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const rightAngle = { x: WEDGE_RIGHT_ANGLE.x, y: WEDGE_RIGHT_ANGLE.y };
  const baseEnd = {
    x: rightAngle.x + WEDGE_HYPOTENUSE * cos,
    y: rightAngle.y
  };
  const topEnd = {
    x: rightAngle.x,
    y: rightAngle.y - WEDGE_HYPOTENUSE * sin
  };
  const hx = baseEnd.x - topEnd.x;
  const hy = baseEnd.y - topEnd.y;
  const hypotenuseLength = Math.hypot(hx, hy);
  const slopeDir = {
    x: hx / hypotenuseLength,
    y: hy / hypotenuseLength
  };
  const outwardNormal = { x: sin, y: -cos };
  const foot = {
    x: topEnd.x + BLOCK_ALONG * hx,
    y: topEnd.y + BLOCK_ALONG * hy
  };
  const blockCenter = {
    x: foot.x + (BLOCK_HEIGHT / 2) * outwardNormal.x,
    y: foot.y + (BLOCK_HEIGHT / 2) * outwardNormal.y
  };
  return {
    theta,
    rightAngle,
    baseEnd,
    topEnd,
    slopeDir,
    outwardNormal,
    blockCenter,
    blockRotation: theta,
    blockWidth: BLOCK_WIDTH,
    blockHeight: BLOCK_HEIGHT,
    hypotenuseLength
  };
}

export function pointLineDistance(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs(dx * (a.y - point.y) - (a.x - point.x) * dy) / len;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTab(value: unknown): ForceCompositionTab {
  return value === 'range' || value === 'orthogonal' || value === 'effect'
    ? value
    : 'synthesis';
}

function normalizeRule(value: unknown): ForceCompositionRule {
  return value === 'triangle' ? value : 'parallelogram';
}

function normalizeRangeSweep(value: unknown): boolean {
  return !(
    value === false ||
    value === 0 ||
    value === '0' ||
    value === 'false'
  );
}

function normalizeParams(
  input: Partial<ForceCompositionParams> & { rangeSweep?: unknown }
): ForceCompositionParams {
  return {
    tab: normalizeTab(input.tab),
    rule: normalizeRule(input.rule),
    f1: clamp(finite(input.f1, 40), 10, 60),
    f2: clamp(finite(input.f2, 30), 10, 60),
    angle: clamp(finite(input.angle, 60), 0, 180),
    orthogonalF: clamp(finite(input.orthogonalF, 55), 10, 80),
    orthogonalAngle: clamp(finite(input.orthogonalAngle, 60), 0, 90),
    gravity: clamp(finite(input.gravity, 40), 10, 60),
    inclineAngle: clamp(finite(input.inclineAngle, 30), 15, 60),
    rangeSweep: normalizeRangeSweep(input.rangeSweep)
  };
}

export function vectorMagnitude(v: Vector): number {
  return Math.hypot(v.x, v.y);
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

function vectorForAngle(magnitude: number, angle: number): Vector {
  const theta = angle * DEG;
  return { x: magnitude * Math.cos(theta), y: magnitude * Math.sin(theta) };
}

function add(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

function computeState(
  params: ForceCompositionParams,
  t: number
): ForceCompositionState {
  const f1 = vectorForAngle(params.f1, 0);
  const f2 = vectorForAngle(params.f2, params.angle);
  const resultant = add(f1, f2);

  const orthogonal = vectorForAngle(params.orthogonalF, params.orthogonalAngle);
  const fx = { x: orthogonal.x, y: 0 };
  const fy = { x: 0, y: orthogonal.y };

  const incline = params.inclineAngle * DEG;
  const g = params.gravity;
  const g1 = {
    x: g * Math.sin(incline) * Math.cos(incline),
    y: -g * Math.sin(incline) ** 2
  };
  const g2 = {
    x: -g * Math.sin(incline) * Math.cos(incline),
    y: -g * Math.cos(incline) ** 2
  };
  const gravityVector = { x: 0, y: -g };

  return {
    params: { ...params },
    t,
    f1,
    f2,
    resultant,
    fx,
    fy,
    g1,
    g2,
    gravityVector
  };
}

export function createForceCompositionSim(
  initial: Partial<ForceCompositionParams> = {}
) {
  const initialParams = normalizeParams(initial);
  let params = { ...initialParams };
  let t = 0;

  function getState(): ForceCompositionState {
    return computeState(params, t);
  }

  return {
    getState,
    getParams(): ForceCompositionParams {
      return { ...params };
    },
    setParams(next: Partial<ForceCompositionParams>): ForceCompositionParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      const delta = Math.max(0, finite(dt, 0));
      t += delta;
      if (params.tab === 'range' && params.rangeSweep) {
        params.angle = 90 + 90 * Math.sin(t * 0.8);
      }
    },
    reset(): void {
      params = { ...initialParams };
      t = 0;
    },
    pickHandle(
      x: number,
      y: number,
      radius = 18
    ): 'f1' | 'f2' | 'orthogonal' | null {
      if (params.tab === 'effect') return null;
      const px = clamp(finite(x, 0), 0, 1) * DRAW_W;
      const py = clamp(finite(y, 0), 0, 1) * STAGE_H;
      const state = getState();
      const fit = diagramFitScale(state);
      const endpoints =
        params.tab === 'orthogonal'
          ? [
              {
                id: 'orthogonal' as const,
                x: state.fx.x + state.fy.x,
                y: state.fx.y + state.fy.y
              }
            ]
          : [
              { id: 'f1' as const, x: state.f1.x, y: state.f1.y },
              { id: 'f2' as const, x: state.f2.x, y: state.f2.y }
            ];
      let best: 'f1' | 'f2' | 'orthogonal' | null = null;
      let distance = radius;
      for (const endpoint of endpoints) {
        const ex = ORIGIN.x + endpoint.x * VECTOR_SCALE * fit;
        const ey = ORIGIN.y - endpoint.y * VECTOR_SCALE * fit;
        const d = Math.hypot(px - ex, py - ey);
        if (d <= distance) {
          best = endpoint.id;
          distance = d;
        }
      }
      return best;
    },
    moveHandle(handle: 'f1' | 'f2' | 'orthogonal', x: number, y: number): void {
      const px = clamp(finite(x, 0), 0, 1) * DRAW_W;
      const py = clamp(finite(y, 0), 0, 1) * STAGE_H;
      const fit = Math.max(diagramFitScale(getState()), 1e-6);
      const dx = (px - ORIGIN.x) / (VECTOR_SCALE * fit);
      const dy = (ORIGIN.y - py) / (VECTOR_SCALE * fit);
      const magnitude = Math.round(
        Math.max(10, Math.min(80, Math.hypot(dx, dy)))
      );
      const angle = Math.round(
        Math.max(0, Math.min(180, Math.atan2(dy, dx) / DEG))
      );
      if (handle === 'orthogonal') {
        params.orthogonalF = clamp(magnitude, 10, 80);
        params.orthogonalAngle = clamp(angle, 0, 90);
      } else if (handle === 'f1') {
        params.f1 = clamp(Math.round(Math.abs(dx)), 10, 60);
      } else {
        params.f2 = clamp(magnitude, 10, 60);
        params.angle = clamp(angle, 0, 180);
      }
    }
  };
}

export const forceCompositionConstants = {
  stageWidth: STAGE_W,
  stageHeight: STAGE_H,
  drawWidth: DRAW_W,
  baseWidth: DRAW_W,
  baseHeight: STAGE_H,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE
};

/**
 * 浮动读数判定：看布局 DOM，不看 canvas 宽度。
 * 项目断点 width<768 → mobile-stack（读数在 Tab）；≥768 → split-right（读数叠在动画区）。
 */
export function hasFloatingReadout(anchor?: Element | null): boolean {
  return readoutOccludesStage(anchor);
}

const FLOATING_OVERLAY_FALLBACK = 228;

/** view / pointer 共用：从布局 DOM 读浮动读数与叠占宽度。 */
export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  const floatingReadout = hasFloatingReadout(canvas);
  if (!floatingReadout) return { floatingReadout: false, overlayPx: 0 };
  let overlayPx = 0;
  if (canvas instanceof HTMLElement) {
    const panel = canvas.parentElement?.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel'
    );
    if (panel instanceof HTMLElement) {
      const cr = canvas.getBoundingClientRect();
      const rr = panel.getBoundingClientRect();
      if (rr.left < cr.right && rr.right > cr.left) {
        overlayPx = Math.max(0, cr.right - rr.left);
      }
    }
  }
  return {
    floatingReadout: true,
    overlayPx: overlayPx || FLOATING_OVERLAY_FALLBACK
  };
}

/**
 * 桌面浮动读数：按原 SVG 960×660 拟合，物理只画 0..620；
 * 若实测读数更宽，再把绘图缩进 overlay 左侧。
 * 移动 Tab 读数：按 620×660 吃满动画区。
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
  drawW: number;
  floatingReadout: boolean;
} {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const floatingReadout = layout.floatingReadout;
  const boxW = floatingReadout ? STAGE_W : DRAW_W;
  const boxH = STAGE_H;
  let fit = Math.min(width / boxW, height / boxH);
  if (floatingReadout) {
    const overlay = layout.overlayPx ?? FLOATING_OVERLAY_FALLBACK;
    const safe = Math.max(1, width - overlay - 16);
    fit = Math.min(fit, safe / DRAW_W);
  }
  return {
    fit,
    offsetX: 0,
    offsetY: (height - boxH * fit) / 2,
    boxW,
    boxH,
    drawW: DRAW_W,
    floatingReadout
  };
}

/**
 * CSS 像素 → 绘图区 0–1（相对 620×660）。必须与 stageTransform 同一套拟合。
 */
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
    x: (cssX - offsetX) / (scale * DRAW_W),
    y: (cssY - offsetY) / (scale * STAGE_H)
  };
}

function tipPixel(v: Vector): { x: number; y: number } {
  return {
    x: ORIGIN.x + v.x * VECTOR_SCALE,
    y: ORIGIN.y - v.y * VECTOR_SCALE
  };
}

/**
 * 默认保持 SCALE=4；仅当端点/手柄会画出 620 绘图区时才整体缩小。
 */
export function diagramFitScale(state: ForceCompositionState): number {
  if (state.params.tab === 'effect') return 1;
  const tips =
    state.params.tab === 'orthogonal'
      ? [
          tipPixel({ x: state.fx.x, y: state.fy.y }),
          tipPixel(state.fx),
          tipPixel(state.fy)
        ]
      : [tipPixel(state.f1), tipPixel(state.f2), tipPixel(state.resultant)];
  let scale = 1;
  for (const tip of tips) {
    const dx = tip.x - ORIGIN.x;
    const dy = tip.y - ORIGIN.y;
    if (dx > 0) {
      const room = DRAW_W - HANDLE_PAD - ORIGIN.x;
      if (dx + HANDLE_PAD > room) scale = Math.min(scale, room / dx);
    } else if (dx < 0) {
      const room = ORIGIN.x - HANDLE_PAD;
      if (-dx + HANDLE_PAD > room) scale = Math.min(scale, room / -dx);
    }
    if (dy > 0) {
      const room = STAGE_H - HANDLE_PAD - ORIGIN.y;
      if (dy + HANDLE_PAD > room) scale = Math.min(scale, room / dy);
    } else if (dy < 0) {
      const room = ORIGIN.y - HANDLE_PAD;
      if (-dy + HANDLE_PAD > room) scale = Math.min(scale, room / -dy);
    }
  }
  return clamp(scale, 0.45, 1);
}

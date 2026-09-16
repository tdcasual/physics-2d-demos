import { clamp } from '../../core/math';

export type AccelForceMode = 'force' | 'inverseMass';

export type AccelForceParams = {
  mode: AccelForceMode;
  cartMass: number;
  hangerMass: number;
  balanced: boolean;
  autoRun: boolean;
};

export type AccelForceRecord = {
  mode: AccelForceMode;
  x: number;
  y: number;
};

export type AccelForceVec = { x: number; y: number };

export type AccelForceArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type AccelForceState = {
  params: AccelForceParams;
  time: number;
  acceleration: number;
  force: number;
  hangerWeight: number;
  friction: number;
  velocity: number;
  position: number;
  finished: boolean;
  aTape: number | null;
  ticks: number[];
  records: AccelForceRecord[];
  curve: AccelForceRecord[];
  inverseMass: number;
  massRatio: number;
  status: string;
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

export type ApparatusLayout = {
  trackStart: AccelForceVec;
  trackEnd: AccelForceVec;
  ux: number;
  uy: number;
  upX: number;
  upY: number;
  cart: AccelForceVec;
  pulley: AccelForceVec;
  ticker: AccelForceVec;
  hanger: AccelForceVec;
  pad: AccelForceVec;
  tapeFrom: AccelForceVec;
  tapeTo: AccelForceVec;
  forceArrow: AccelForceArrow | null;
  frictionArrow: AccelForceArrow | null;
};

export type GraphFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const G = 9.8;
const CART_MIN = 0.2;
const CART_MAX = 1;
const CART_DEFAULT = 0.4;
const HANGER_MIN = 0;
const HANGER_MAX = 0.2;
const HANGER_DEFAULT = 0.03;
const FRICTION_MU = 0.05;
const TICK_PERIOD = 0.02;
const COUNT_EVERY = 5;
const COUNT_DT = TICK_PERIOD * COUNT_EVERY;
const S_MAX = 0.55;
const FRAME_DT = 1 / 60;
const KEYBOARD_DT = 0.016;
const REST_EPS = 1e-9;
const BASE_W = 860;
const BASE_H = 540;
const TRACK_LEFT = 72;
const TRACK_RIGHT = 700;
const TRACK_Y = 268;
const INCLINE_DROP = 22;
const CART_W = 78;
const CART_H = 30;
const WHEEL_R = 7;
const CART_START_MARGIN = 132;
const CART_END_MARGIN = 54;
const TICKER_ALONG = 28;
const TICKER_LIFT = 38;
const TICKER_W = 34;
const TICKER_H = 22;
const PULLEY_R = 16;
const HANGER_DISC_H = 9;
const HANGER_DISC_W = 26;
const HANGER_GAP = 14;
const FORCE_ARROW_LEN = 56;
const FRICTION_ARROW_LEN = 44;
const ARROW_LIFT = 26;
const GRAPH_PAD_L = 56;
const GRAPH_PAD_R = 22;
const GRAPH_PAD_T = 26;
const GRAPH_PAD_B = 44;
const GRAPH_MAX_FORCE = 1.4;
const GRAPH_MAX_INV_MASS = 5.2;
const GRAPH_MAX_ACCEL = 3.5;

const DEFAULTS: AccelForceParams = {
  mode: 'force',
  cartMass: CART_DEFAULT,
  hangerMass: HANGER_DEFAULT,
  balanced: true,
  autoRun: true
};

export const accelForceConstants = {
  g: G,
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  cartMin: CART_MIN,
  cartMax: CART_MAX,
  cartDefault: CART_DEFAULT,
  hangerMin: HANGER_MIN,
  hangerMax: HANGER_MAX,
  hangerDefault: HANGER_DEFAULT,
  frictionMu: FRICTION_MU,
  tickPeriod: TICK_PERIOD,
  countEvery: COUNT_EVERY,
  countDt: COUNT_DT,
  sMax: S_MAX,
  frameDt: FRAME_DT,
  keyboardDt: KEYBOARD_DT,
  trackLeft: TRACK_LEFT,
  trackRight: TRACK_RIGHT,
  trackY: TRACK_Y,
  inclineDrop: INCLINE_DROP,
  cartWidth: CART_W,
  cartHeight: CART_H,
  wheelRadius: WHEEL_R,
  cartStartMargin: CART_START_MARGIN,
  cartEndMargin: CART_END_MARGIN,
  tickerAlong: TICKER_ALONG,
  tickerLift: TICKER_LIFT,
  tickerWidth: TICKER_W,
  tickerHeight: TICKER_H,
  pulleyRadius: PULLEY_R,
  hangerDiscHeight: HANGER_DISC_H,
  hangerDiscWidth: HANGER_DISC_W,
  hangerGap: HANGER_GAP,
  forceArrowLen: FORCE_ARROW_LEN,
  frictionArrowLen: FRICTION_ARROW_LEN,
  arrowLift: ARROW_LIFT,
  graphPadLeft: GRAPH_PAD_L,
  graphPadRight: GRAPH_PAD_R,
  graphPadTop: GRAPH_PAD_T,
  graphPadBottom: GRAPH_PAD_B,
  graphMaxForce: GRAPH_MAX_FORCE,
  graphMaxInvMass: GRAPH_MAX_INV_MASS,
  graphMaxAccel: GRAPH_MAX_ACCEL,
  gridStep: 40,
  tableThickness: 14,
  tableLeg: 36,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.5,
  transportClearY: 96
} as const;

export const ACCEL_FORCE_X_TITLE_FORCE = 'F / N';
export const ACCEL_FORCE_X_TITLE_MASS = '1/M / kg⁻¹';
export const ACCEL_FORCE_Y_TITLE = 'a / (m·s⁻²)';

const C = accelForceConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

export function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '0' || text === 'false' || text === 'off' || text === 'no') {
      return false;
    }
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') {
      return true;
    }
  }
  return fallback;
}

export function parseAccelForceMode(
  value: unknown,
  fallback: AccelForceMode = 'force'
): AccelForceMode {
  if (value === 'inverseMass' || value === 1 || value === '1') {
    return 'inverseMass';
  }
  if (value === 'force' || value === 0 || value === '0') return 'force';
  return fallback;
}

function normalizeParams(
  input: Partial<AccelForceParams>,
  previous: AccelForceParams = DEFAULTS
): AccelForceParams {
  return {
    mode: parseAccelForceMode(input.mode, previous.mode),
    cartMass: clamp(
      finite(input.cartMass, previous.cartMass),
      CART_MIN,
      CART_MAX
    ),
    hangerMass: clamp(
      finite(input.hangerMass, previous.hangerMass),
      HANGER_MIN,
      HANGER_MAX
    ),
    balanced:
      input.balanced === undefined
        ? previous.balanced
        : asBool(input.balanced, previous.balanced),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun)
  };
}

export type AccelForceDynamics = {
  hangerWeight: number;
  friction: number;
  acceleration: number;
  tension: number;
  stalled: boolean;
};

/**
 * 平衡后沿轨道等效阻力为 0，系统 a = mg/(M+m)，绳拉力 F = Ma。
 * 未平衡时 f = μMg，a = (mg − f)/(M+m)，小车 F − f = Ma。
 */
export function accelForceDynamics(
  cartMass: number,
  hangerMass: number,
  balanced: boolean
): AccelForceDynamics {
  const M = Math.max(finite(cartMass, CART_DEFAULT), 1e-9);
  const m = Math.max(0, finite(hangerMass, 0));
  const hangerWeight = m * G;
  const friction = balanced ? 0 : FRICTION_MU * M * G;
  if (hangerWeight <= friction + REST_EPS) {
    return {
      hangerWeight,
      friction,
      acceleration: 0,
      tension: hangerWeight,
      stalled: hangerWeight > REST_EPS || friction > REST_EPS
    };
  }
  const acceleration = (hangerWeight - friction) / (M + m);
  return {
    hangerWeight,
    friction,
    acceleration,
    tension: M * acceleration + friction,
    stalled: false
  };
}

/** 系统理论加速度。平衡后即 a = mg/(M+m)。 */
export function theoreticalAcceleration(
  cartMass: number,
  hangerMass: number,
  balanced = true
): number {
  return accelForceDynamics(cartMass, hangerMass, balanced).acceleration;
}

/** 绳对小车的拉力（系统方程，不是 mg）。 */
export function ropeTension(
  cartMass: number,
  hangerMass: number,
  balanced = true
): number {
  return accelForceDynamics(cartMass, hangerMass, balanced).tension;
}

export function cartNewtonResidual(
  cartMass: number,
  hangerMass: number,
  balanced: boolean
): number {
  const d = accelForceDynamics(cartMass, hangerMass, balanced);
  return d.tension - d.friction - cartMass * d.acceleration;
}

export function tickPositions(time: number, acceleration: number): number[] {
  const tEnd = Math.max(0, finite(time, 0));
  const a = Math.max(0, finite(acceleration, 0));
  const ticks: number[] = [];
  const n = Math.floor(tEnd / TICK_PERIOD + 1e-12);
  for (let i = 0; i <= n; i += 1) {
    const t = i * TICK_PERIOD;
    ticks.push(Math.min(S_MAX, 0.5 * a * t * t));
  }
  return ticks;
}

/**
 * 纸带逐差：计数点间隔 Δt = 0.10 s，s_{n+1} − s_n = a(Δt)²。
 * 至少 3 个计数点才给出加速度。
 */
export function tapeAcceleration(
  ticks: number[],
  countEvery = COUNT_EVERY,
  countDt = COUNT_DT
): number | null {
  if (!Array.isArray(ticks) || ticks.length < countEvery * 2 + 1) return null;
  const points: number[] = [];
  for (let i = 0; i < ticks.length; i += countEvery) {
    const value = ticks[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    points.push(value);
  }
  if (points.length < 3) return null;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const first = points[i]! - points[i - 1]!;
    const second = points[i + 1]! - points[i]!;
    const delta = second - first;
    if (!Number.isFinite(delta)) return null;
    sum += delta;
    count += 1;
  }
  if (count === 0) return null;
  const dt2 = countDt * countDt;
  if (dt2 <= REST_EPS) return null;
  const accel = sum / count / dt2;
  return Number.isFinite(accel) ? accel : null;
}

export function theoreticalCurve(params: AccelForceParams): AccelForceRecord[] {
  const n = 17;
  if (params.mode === 'force') {
    return Array.from({ length: n }, (_, i) => {
      const m = (i / (n - 1)) * HANGER_MAX;
      const d = accelForceDynamics(params.cartMass, m, params.balanced);
      return { mode: 'force', x: d.tension, y: d.acceleration };
    });
  }
  return Array.from({ length: n }, (_, i) => {
    const M = CART_MIN + (i / (n - 1)) * (CART_MAX - CART_MIN);
    const d = accelForceDynamics(M, params.hangerMass, params.balanced);
    return { mode: 'inverseMass', x: 1 / M, y: d.acceleration };
  });
}

export function hangerDiscCount(hangerMass: number): number {
  const m = Math.max(0, finite(hangerMass, 0));
  if (m <= REST_EPS) return 0;
  return Math.max(1, Math.round(m / 0.02));
}

export function statusText(params: AccelForceParams, stalled: boolean): string {
  if (!params.balanced) return '未平衡：不得宣称正比';
  if (stalled) return '已平衡，槽码不足';
  return '已平衡摩擦力';
}

function kinematics(
  acceleration: number,
  time: number
): { time: number; position: number; velocity: number; finished: boolean } {
  const a = Math.max(0, finite(acceleration, 0));
  let t = Math.max(0, finite(time, 0));
  if (a <= REST_EPS) {
    return { time: t, position: 0, velocity: 0, finished: false };
  }
  const tEnd = Math.sqrt((2 * S_MAX) / a);
  let finished = false;
  if (t >= tEnd - 1e-9) {
    t = tEnd;
    finished = true;
  }
  const position = Math.min(S_MAX, 0.5 * a * t * t);
  const velocity = a * t;
  return { time: t, position, velocity, finished };
}

function makeState(
  params: AccelForceParams,
  time: number,
  records: AccelForceRecord[]
): AccelForceState {
  const d = accelForceDynamics(
    params.cartMass,
    params.hangerMass,
    params.balanced
  );
  const motion = kinematics(d.acceleration, time);
  const ticks = tickPositions(motion.time, d.acceleration);
  const aTape = tapeAcceleration(ticks);
  return {
    params: { ...params },
    time: motion.time,
    acceleration: d.acceleration,
    force: d.tension,
    hangerWeight: d.hangerWeight,
    friction: d.friction,
    velocity: motion.velocity,
    position: motion.position,
    finished: motion.finished,
    aTape,
    ticks,
    records: records.map((item) => ({ ...item })),
    curve: theoreticalCurve(params),
    inverseMass: 1 / params.cartMass,
    massRatio: params.hangerMass / params.cartMass,
    status: statusText(params, d.stalled)
  };
}

export function trackPose(balanced: boolean): {
  start: AccelForceVec;
  end: AccelForceVec;
  ux: number;
  uy: number;
  upX: number;
  upY: number;
  length: number;
} {
  const start = {
    x: TRACK_LEFT,
    y: TRACK_Y - (balanced ? INCLINE_DROP : 0)
  };
  const end = { x: TRACK_RIGHT, y: TRACK_Y };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return { start, end, ux, uy, upX: uy, upY: -ux, length };
}

function along(
  pose: ReturnType<typeof trackPose>,
  distance: number,
  lift = 0
): AccelForceVec {
  return {
    x: pose.start.x + pose.ux * distance + pose.upX * lift,
    y: pose.start.y + pose.uy * distance + pose.upY * lift
  };
}

export function apparatusLayout(state: AccelForceState): ApparatusLayout {
  const pose = trackPose(state.params.balanced);
  const travel = Math.max(1, pose.length - CART_START_MARGIN - CART_END_MARGIN);
  const t = clamp(state.position / S_MAX, 0, 1);
  const cartAlong = CART_START_MARGIN + t * travel;
  const cartLift = WHEEL_R + CART_H / 2;
  const cart = along(pose, cartAlong, cartLift);
  const pulley = { x: pose.end.x, y: pose.end.y };
  const ticker = along(pose, TICKER_ALONG, TICKER_LIFT);
  const discs = hangerDiscCount(state.params.hangerMass);
  const stack = discs * HANGER_DISC_H;
  const hanger = {
    x: pulley.x + 1,
    y: pulley.y + PULLEY_R + HANGER_GAP + stack / 2
  };
  const pad = {
    x: pose.start.x + 22,
    y: Math.max(pose.start.y, pose.end.y) + 10
  };
  const rear = along(pose, cartAlong - CART_W / 2, 4);
  const tapeFrom = { x: ticker.x + TICKER_W / 2, y: ticker.y };
  const forceLen = state.force > REST_EPS ? FORCE_ARROW_LEN : 0;
  const frictionLen =
    !state.params.balanced && state.friction > REST_EPS
      ? FRICTION_ARROW_LEN
      : 0;
  const arrowY = cart.y - CART_H / 2 - ARROW_LIFT;
  const forceArrow =
    forceLen > 0
      ? {
          x1: cart.x + pose.ux * 18,
          y1: arrowY,
          x2: cart.x + pose.ux * (18 + forceLen),
          y2: arrowY + pose.uy * forceLen
        }
      : null;
  const frictionArrow =
    frictionLen > 0
      ? {
          x1: cart.x - pose.ux * 18,
          y1: arrowY,
          x2: cart.x - pose.ux * (18 + frictionLen),
          y2: arrowY - pose.uy * frictionLen
        }
      : null;
  return {
    trackStart: pose.start,
    trackEnd: pose.end,
    ux: pose.ux,
    uy: pose.uy,
    upX: pose.upX,
    upY: pose.upY,
    cart,
    pulley,
    ticker,
    hanger,
    pad,
    tapeFrom,
    tapeTo: rear,
    forceArrow,
    frictionArrow
  };
}

export function tapeDotPositions(
  state: AccelForceState,
  _layout: ApparatusLayout
): AccelForceVec[] {
  const pose = trackPose(state.params.balanced);
  const travel = Math.max(1, pose.length - CART_START_MARGIN - CART_END_MARGIN);
  return state.ticks.map((s) => {
    const t = clamp(s / S_MAX, 0, 1);
    const dist = CART_START_MARGIN + t * travel - CART_W / 2;
    const p = along(pose, Math.max(TICKER_ALONG + 10, dist), 3);
    return p;
  });
}

export function graphFrame(width: number, height: number): GraphFrame {
  const w = Math.max(1, finite(width, 400));
  const h = Math.max(1, finite(height, 200));
  return {
    left: GRAPH_PAD_L,
    right: Math.max(GRAPH_PAD_L + 48, w - GRAPH_PAD_R),
    top: GRAPH_PAD_T,
    bottom: Math.max(GRAPH_PAD_T + 48, h - GRAPH_PAD_B)
  };
}

export function graphToPx(
  xVal: number,
  yVal: number,
  mode: AccelForceMode,
  frame: GraphFrame
): AccelForceVec {
  const xMax = mode === 'force' ? GRAPH_MAX_FORCE : GRAPH_MAX_INV_MASS;
  const x = frame.left + ((frame.right - frame.left) * finite(xVal, 0)) / xMax;
  const y =
    frame.bottom -
    ((frame.bottom - frame.top) * finite(yVal, 0)) / GRAPH_MAX_ACCEL;
  return {
    x: clamp(x, frame.left, frame.right),
    y: clamp(y, frame.top, frame.bottom)
  };
}

export function pointInsideFrame(x: number, y: number, pad = 0): boolean {
  return x >= pad && x <= BASE_W - pad && y >= pad && y <= BASE_H - pad;
}

export function apparatusInsideFrame(layout: ApparatusLayout): boolean {
  const limit = BASE_H - C.transportClearY;
  const points: AccelForceVec[] = [
    layout.trackStart,
    layout.trackEnd,
    layout.cart,
    layout.pulley,
    layout.ticker,
    layout.hanger,
    layout.pad,
    layout.tapeFrom,
    layout.tapeTo
  ];
  if (layout.forceArrow) {
    points.push(
      { x: layout.forceArrow.x1, y: layout.forceArrow.y1 },
      { x: layout.forceArrow.x2, y: layout.forceArrow.y2 }
    );
  }
  if (layout.frictionArrow) {
    points.push(
      { x: layout.frictionArrow.x1, y: layout.frictionArrow.y1 },
      { x: layout.frictionArrow.x2, y: layout.frictionArrow.y2 }
    );
  }
  return points.every((p) => pointInsideFrame(p.x, p.y, 4) && p.y <= limit);
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

export function hasFloatingReadout(anchor?: Element | null): boolean {
  if (typeof document === 'undefined') return true;
  const node = anchor ?? document.body;
  if (
    node.closest('.mobile-stack-layout, [data-testid="mobile-stack-layout"]')
  ) {
    return false;
  }
  if (
    node.closest(
      '.split-right-shell, [data-testid="split-right-layout"], .layout-srgb-graph-bottom, [data-testid="split-right-graph-bottom-layout"]'
    )
  ) {
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
  const boxW = BASE_W;
  const boxH = BASE_H;

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

export function createAccelForceSim(initial: Partial<AccelForceParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let records: AccelForceRecord[] = [];

  function current(): AccelForceState {
    return makeState(params, time, records);
  }

  function resetMotion(): void {
    time = 0;
  }

  return {
    getState(): AccelForceState {
      return current();
    },
    getSnapshot(): AccelForceState {
      return current();
    },
    getParams(): AccelForceParams {
      return { ...params };
    },
    setParams(next: Partial<AccelForceParams>): AccelForceParams {
      const previous = params;
      params = normalizeParams({ ...params, ...next }, params);
      const heldChanged =
        (params.mode === 'force' && params.cartMass !== previous.cartMass) ||
        (params.mode === 'inverseMass' &&
          params.hangerMass !== previous.hangerMass);
      const physicsChanged =
        params.cartMass !== previous.cartMass ||
        params.hangerMass !== previous.hangerMass ||
        params.balanced !== previous.balanced;
      if (heldChanged) {
        records = records.filter((item) => item.mode !== params.mode);
      }
      if (physicsChanged) resetMotion();
      return { ...params };
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!Number.isFinite(delta) || delta === 0) return;
      const keyboard = Math.abs(Math.abs(delta) - KEYBOARD_DT) < 1e-12;
      if (!params.autoRun && !keyboard) return;
      const nextTime = Math.max(0, time + delta);
      const state = makeState(params, nextTime, records);
      time = state.time;
      if (state.finished) params = { ...params, autoRun: false };
    },
    stepFrame(dt: number = FRAME_DT): void {
      const delta = finite(dt, FRAME_DT);
      if (!Number.isFinite(delta) || delta === 0) return;
      const state = makeState(params, Math.max(0, time + delta), records);
      time = state.time;
      if (state.finished) params = { ...params, autoRun: false };
    },
    release(): void {
      resetMotion();
      params = { ...params, autoRun: true };
    },
    resetCart(): void {
      resetMotion();
      params = { ...params, autoRun: false };
    },
    recordPoint(): AccelForceRecord {
      const state = current();
      const y =
        state.aTape !== null && Number.isFinite(state.aTape)
          ? state.aTape
          : state.acceleration;
      const x = state.params.mode === 'force' ? state.force : state.inverseMass;
      const point: AccelForceRecord = {
        mode: state.params.mode,
        x,
        y: Number.isFinite(y) ? y : 0
      };
      records = [...records, point];
      return { ...point };
    },
    clearRecords(): void {
      records = records.filter((item) => item.mode !== params.mode);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      records = [];
    }
  };
}

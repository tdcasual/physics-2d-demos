import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type BlockBoardParams = {
  blockMass: number;
  boardMass: number;
  initialVelocity: number;
  friction: number;
  autoRun: boolean;
  showArea: boolean;
  showForces: boolean;
};

export type BlockBoardState = {
  params: BlockBoardParams;
  time: number;
  blockPosition: number;
  boardPosition: number;
  blockVelocity: number;
  boardVelocity: number;
  blockAcceleration: number;
  boardAcceleration: number;
  commonVelocity: number;
  syncTime: number;
  relativeDisplacement: number;
  sliding: boolean;
};

export type BlockBoardVec = { x: number; y: number };

export type BlockBoardArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type BlockBoardGraphPoint = { t: number; v: number };

export type BlockBoardGraphSeries = {
  id: 'block' | 'board';
  label: string;
  points: BlockBoardGraphPoint[];
};

export type GraphFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
  transportClearY?: number;
};

export type ApparatusLayout = {
  trackStart: BlockBoardVec;
  trackEnd: BlockBoardVec;
  board: { x: number; y: number; w: number; h: number };
  block: { x: number; y: number; w: number; h: number };
  blockArrow: BlockBoardArrow | null;
  boardArrow: BlockBoardArrow | null;
  frictionBlock: BlockBoardArrow | null;
  frictionBoard: BlockBoardArrow | null;
  syncX: number;
  syncVisible: boolean;
  ticks: Array<{ x: number; meter: number }>;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const G = 10;
const BLOCK_MIN = 0.5;
const BLOCK_MAX = 8;
const BLOCK_DEFAULT = 2;
const BOARD_MIN = 0.5;
const BOARD_MAX = 10;
const BOARD_DEFAULT = 2;
const V0_MIN = 0;
const V0_MAX = 12;
const V0_DEFAULT = 6;
const MU_MIN = 0.05;
const MU_MAX = 0.8;
const MU_DEFAULT = 0.2;
const FRAME_DT = 1 / 60;
const BASE_W = 960;
const BASE_H = 360;
const TRACK_START_X = 40;
const TRACK_SCALE = 40;
const TRACK_LENGTH_M = 22;
const TRACK_END_X = TRACK_START_X + TRACK_LENGTH_M * TRACK_SCALE;
const TRACK_Y = 168;
const BOARD_ORIGIN_M = 3.2;
const BLOCK_ORIGIN_M = 8;
const BOARD_LENGTH_M = 9;
const BOARD_WIDTH = BOARD_LENGTH_M * TRACK_SCALE;
const BOARD_HEIGHT = 36;
const BLOCK_WIDTH = 52;
const BLOCK_HEIGHT = 44;
const ARROW_LEN = 48;
const FRICTION_ARROW_LEN = 40;
const VISUAL_EDGE_PAD_M = (ARROW_LEN + FRICTION_ARROW_LEN + 12) / TRACK_SCALE;
const TICK_EVERY_M = 2;
const GRAPH_VIEW_TIME = 3.2;
const GRAPH_MAX_VELOCITY = 12;
const GRAPH_HOLD = 1.2;
const GRAPH_PAD_L = 48;
const GRAPH_PAD_R = 28;
const GRAPH_PAD_T = 28;
const GRAPH_PAD_B = 36;
const GRAPH_FALLBACK_WIDTH = 400;
const GRAPH_FALLBACK_HEIGHT = 200;
const SLIDE_EPS = 0.001;

const DEFAULTS: BlockBoardParams = {
  blockMass: BLOCK_DEFAULT,
  boardMass: BOARD_DEFAULT,
  initialVelocity: V0_DEFAULT,
  friction: MU_DEFAULT,
  autoRun: true,
  showArea: true,
  showForces: false
};

export const blockBoardConstants = {
  g: G,
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  blockMassMin: BLOCK_MIN,
  blockMassMax: BLOCK_MAX,
  blockMassDefault: BLOCK_DEFAULT,
  boardMassMin: BOARD_MIN,
  boardMassMax: BOARD_MAX,
  boardMassDefault: BOARD_DEFAULT,
  v0Min: V0_MIN,
  v0Max: V0_MAX,
  v0Default: V0_DEFAULT,
  frictionMin: MU_MIN,
  frictionMax: MU_MAX,
  frictionDefault: MU_DEFAULT,
  frameDt: FRAME_DT,
  trackStartX: TRACK_START_X,
  trackEndX: TRACK_END_X,
  trackY: TRACK_Y,
  trackScale: TRACK_SCALE,
  trackLengthM: TRACK_LENGTH_M,
  boardOriginM: BOARD_ORIGIN_M,
  blockOriginM: BLOCK_ORIGIN_M,
  boardLengthM: BOARD_LENGTH_M,
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
  blockWidth: BLOCK_WIDTH,
  blockHeight: BLOCK_HEIGHT,
  arrowLen: ARROW_LEN,
  frictionArrowLen: FRICTION_ARROW_LEN,
  tickEveryM: TICK_EVERY_M,
  graphViewTime: GRAPH_VIEW_TIME,
  graphMaxVelocity: GRAPH_MAX_VELOCITY,
  graphHold: GRAPH_HOLD,
  graphPadLeft: GRAPH_PAD_L,
  graphPadRight: GRAPH_PAD_R,
  graphPadTop: GRAPH_PAD_T,
  graphPadBottom: GRAPH_PAD_B,
  graphFallbackWidth: GRAPH_FALLBACK_WIDTH,
  graphFallbackHeight: GRAPH_FALLBACK_HEIGHT,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  transportClearY: 96,
  minReadableFit: 0.5,
  hatchStep: 10,
  groundTick: 12,
  labelLift: 22,
  syncDash: 8
} as const;

export const BLOCK_BOARD_X_TITLE = 't / s';
export const BLOCK_BOARD_Y_TITLE = 'v / (m·s⁻¹)';

const C = blockBoardConstants;
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

function normalizeParams(
  input: Partial<BlockBoardParams>,
  previous = DEFAULTS
): BlockBoardParams {
  return {
    blockMass: clamp(
      finite(input.blockMass, previous.blockMass),
      BLOCK_MIN,
      BLOCK_MAX
    ),
    boardMass: clamp(
      finite(input.boardMass, previous.boardMass),
      BOARD_MIN,
      BOARD_MAX
    ),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      V0_MIN,
      V0_MAX
    ),
    friction: clamp(finite(input.friction, previous.friction), MU_MIN, MU_MAX),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun),
    showArea:
      input.showArea === undefined
        ? previous.showArea
        : asBool(input.showArea, previous.showArea),
    showForces:
      input.showForces === undefined
        ? previous.showForces
        : asBool(input.showForces, previous.showForces)
  };
}

/** a₁ = −μg，木块相对地面减速。 */
export function blockAcceleration(params: Partial<BlockBoardParams>): number {
  return -finite(params.friction, MU_DEFAULT) * G;
}

/** a₂ = μmg / M，木板被摩擦力加速。 */
export function boardAcceleration(params: Partial<BlockBoardParams>): number {
  const M = Math.max(finite(params.boardMass, BOARD_DEFAULT), 1e-9);
  const m = finite(params.blockMass, BLOCK_DEFAULT);
  const mu = finite(params.friction, MU_DEFAULT);
  return (mu * m * G) / M;
}

/** 相对加速度 μg(1 + m/M)。 */
export function relativeAcceleration(
  params: Partial<BlockBoardParams>
): number {
  const M = Math.max(finite(params.boardMass, BOARD_DEFAULT), 1e-9);
  const m = finite(params.blockMass, BLOCK_DEFAULT);
  const mu = finite(params.friction, MU_DEFAULT);
  return mu * G * (1 + m / M);
}

/**
 * 共速时刻 tc = v₀ / (μg(1 + m/M))。
 * 返回完整物理值，不用图表视口截断。
 */
export function syncTimeFor(params: Partial<BlockBoardParams>): number {
  const v0 = Math.max(0, finite(params.initialVelocity, 0));
  const aRel = relativeAcceleration(params);
  if (v0 <= 0 || !(aRel > 0) || !Number.isFinite(aRel)) return 0;
  const tc = v0 / aRel;
  return Number.isFinite(tc) ? Math.max(0, tc) : 0;
}

/**
 * 光滑地面动量守恒：m v₀ = (m + M) vc。
 * vc = m v₀ / (M + m)。
 */
export function commonVelocityFor(params: Partial<BlockBoardParams>): number {
  const m = finite(params.blockMass, BLOCK_DEFAULT);
  const M = finite(params.boardMass, BOARD_DEFAULT);
  const v0 = Math.max(0, finite(params.initialVelocity, 0));
  const total = m + M;
  if (!(total > 0) || !Number.isFinite(total)) return 0;
  const vc = (m / total) * v0;
  return Number.isFinite(vc) ? vc : 0;
}

/** 相对位移在共速后保持 Δx = ½ v₀ tc。 */
export function relativeSlideFor(params: Partial<BlockBoardParams>): number {
  const v0 = Math.max(0, finite(params.initialVelocity, 0));
  const tc = syncTimeFor(params);
  const dx = 0.5 * v0 * tc;
  return Number.isFinite(dx) ? Math.max(0, dx) : 0;
}

export function loopHorizonFor(params: Partial<BlockBoardParams>): number {
  const tc = syncTimeFor(params);
  const horizon = Math.max(GRAPH_VIEW_TIME, tc + GRAPH_HOLD);
  return Number.isFinite(horizon) && horizon > 0 ? horizon : GRAPH_VIEW_TIME;
}

export function wrapBlockBoardTime(time: number, horizon: number): number {
  const t = finite(time, 0);
  const h = Math.max(finite(horizon, GRAPH_VIEW_TIME), 1e-6);
  if (!Number.isFinite(t)) return 0;
  if (t < 0 || t > h) return ((t % h) + h) % h;
  return t;
}

function velocityAt(
  v0: number,
  accel: number,
  time: number,
  tc: number,
  vc: number
): number {
  if (time < tc) return v0 + accel * time;
  return vc;
}

function positionAt(
  v0: number,
  accel: number,
  time: number,
  tc: number,
  vc: number
): number {
  if (time < tc) return v0 * time + 0.5 * accel * time * time;
  const xTc = v0 * tc + 0.5 * accel * tc * tc;
  return xTc + vc * (time - tc);
}

export function stateAt(
  params: Partial<BlockBoardParams>,
  time: number
): BlockBoardState {
  const safe = normalizeParams(params);
  const t = Math.max(0, finite(time, 0));
  const a1 = blockAcceleration(safe);
  const a2 = boardAcceleration(safe);
  const tc = syncTimeFor(safe);
  const vc = commonVelocityFor(safe);
  const v0 = safe.initialVelocity;
  const sliding = t < tc - SLIDE_EPS;
  const blockPosition = positionAt(v0, a1, t, tc, vc);
  const boardPosition = positionAt(0, a2, t, tc, vc);
  const relativeDisplacement =
    t >= tc - SLIDE_EPS
      ? relativeSlideFor(safe)
      : Math.abs(blockPosition - boardPosition);
  return {
    params: { ...safe },
    time: t,
    blockPosition,
    boardPosition,
    blockVelocity: velocityAt(v0, a1, t, tc, vc),
    boardVelocity: velocityAt(0, a2, t, tc, vc),
    blockAcceleration: a1,
    boardAcceleration: a2,
    commonVelocity: vc,
    syncTime: tc,
    relativeDisplacement,
    sliding
  };
}

/** v-t 系列：图表视口截断，不改写 tc / 状态。 */
export function graphSeries(
  params: Partial<BlockBoardParams>
): BlockBoardGraphSeries[] {
  const safe = normalizeParams(params);
  const tc = syncTimeFor(safe);
  const viewT = GRAPH_VIEW_TIME;
  const v0 = safe.initialVelocity;
  const a1 = blockAcceleration(safe);
  const a2 = boardAcceleration(safe);
  const vc = commonVelocityFor(safe);
  const end = Math.min(viewT, Math.max(viewT, 0));
  const block: BlockBoardGraphPoint[] = [{ t: 0, v: v0 }];
  const board: BlockBoardGraphPoint[] = [{ t: 0, v: 0 }];
  if (tc > 0 && tc < end - 1e-9) {
    block.push({ t: tc, v: vc });
    board.push({ t: tc, v: vc });
    block.push({ t: end, v: vc });
    board.push({ t: end, v: vc });
  } else {
    const tClip = Math.min(end, Math.max(0, tc > 0 ? end : 0));
    block.push({
      t: tClip,
      v: velocityAt(v0, a1, tClip, tc, vc)
    });
    board.push({
      t: tClip,
      v: velocityAt(0, a2, tClip, tc, vc)
    });
  }
  return [
    { id: 'block', label: 'm', points: block },
    { id: 'board', label: 'M', points: board }
  ];
}

export function graphFrame(width: number, height: number): GraphFrame {
  const w = Math.max(1, finite(width, GRAPH_FALLBACK_WIDTH));
  const h = Math.max(1, finite(height, GRAPH_FALLBACK_HEIGHT));
  return {
    left: GRAPH_PAD_L,
    right: Math.max(GRAPH_PAD_L + 48, w - GRAPH_PAD_R),
    top: GRAPH_PAD_T,
    bottom: Math.max(GRAPH_PAD_T + 48, h - GRAPH_PAD_B)
  };
}

export function graphToPx(
  time: number,
  velocity: number,
  frame: GraphFrame
): BlockBoardVec {
  const t = clamp(finite(time, 0), 0, GRAPH_VIEW_TIME);
  const v = clamp(finite(velocity, 0), 0, GRAPH_MAX_VELOCITY);
  const spanT = Math.max(GRAPH_VIEW_TIME, 1e-9);
  const x = frame.left + ((frame.right - frame.left) * t) / spanT;
  const y =
    frame.bottom -
    ((frame.bottom - frame.top) * v) / Math.max(GRAPH_MAX_VELOCITY, 1e-9);
  return {
    x: clamp(x, frame.left, frame.right),
    y: clamp(y, frame.top, frame.bottom)
  };
}

function meterToX(meter: number): number {
  return TRACK_START_X + finite(meter, 0) * TRACK_SCALE;
}

export function apparatusLayout(state: BlockBoardState): ApparatusLayout {
  // The simulation keeps unbounded positions for exact readouts and graphs.
  // For the fixed-size animation canvas, project each body to a safe visual
  // interval once it would leave the frame; this avoids an empty stage during
  // long valid runs without changing any physics state.
  const boardMeter = clamp(
    BOARD_ORIGIN_M + finite(state.boardPosition, 0),
    VISUAL_EDGE_PAD_M,
    TRACK_LENGTH_M - BOARD_LENGTH_M - VISUAL_EDGE_PAD_M
  );
  const halfBlockM = BLOCK_WIDTH / (2 * TRACK_SCALE);
  const blockMeter = clamp(
    BLOCK_ORIGIN_M + finite(state.blockPosition, 0),
    Math.max(VISUAL_EDGE_PAD_M + halfBlockM, boardMeter + halfBlockM + 0.1),
    Math.min(
      TRACK_LENGTH_M - VISUAL_EDGE_PAD_M - halfBlockM,
      boardMeter + BOARD_LENGTH_M - halfBlockM - 0.1
    )
  );
  const boardX = meterToX(boardMeter);
  const blockCenterX = meterToX(blockMeter);
  const boardY = TRACK_Y - BOARD_HEIGHT / 2;
  const blockY = boardY - BLOCK_HEIGHT;
  const blockTop = blockY;
  const blockDir = Math.sign(state.blockVelocity);
  const boardDir = Math.sign(state.boardVelocity);
  const blockArrow =
    Math.abs(state.blockVelocity) < 1e-6
      ? null
      : {
          x1: blockCenterX,
          y1: blockTop - 18,
          x2: blockCenterX + blockDir * ARROW_LEN,
          y2: blockTop - 18
        };
  const boardArrow =
    Math.abs(state.boardVelocity) < 1e-6
      ? null
      : {
          x1: boardX + BOARD_WIDTH,
          y1: TRACK_Y - 4,
          x2: boardX + BOARD_WIDTH + boardDir * ARROW_LEN,
          y2: TRACK_Y - 4
        };
  const showF = state.params.showForces && state.sliding;
  const frictionBlock = showF
    ? {
        x1: blockCenterX - 6,
        y1: blockTop - 40,
        x2: blockCenterX - 6 - FRICTION_ARROW_LEN,
        y2: blockTop - 40
      }
    : null;
  const frictionBoard = showF
    ? {
        x1: boardX + BOARD_WIDTH + 6,
        y1: TRACK_Y + 16,
        x2: boardX + BOARD_WIDTH + 6 + FRICTION_ARROW_LEN,
        y2: TRACK_Y + 16
      }
    : null;
  const syncBlockPos =
    state.params.initialVelocity * state.syncTime +
    0.5 * state.blockAcceleration * state.syncTime ** 2;
  const syncX = meterToX(BLOCK_ORIGIN_M + syncBlockPos);
  // Keep the marker and its label wholly inside the animation frame. The
  // physical sync time/position remain exact in the state and graph; this is
  // only a presentation guard for long sliding runs.
  const syncVisible = syncX >= TRACK_START_X + 24 && syncX <= TRACK_END_X - 24;
  const ticks: Array<{ x: number; meter: number }> = [];
  for (let meter = 0; meter <= TRACK_LENGTH_M + 1e-9; meter += 1) {
    ticks.push({ x: meterToX(meter), meter });
  }
  return {
    trackStart: { x: TRACK_START_X, y: TRACK_Y },
    trackEnd: { x: TRACK_END_X, y: TRACK_Y },
    board: { x: boardX, y: boardY, w: BOARD_WIDTH, h: BOARD_HEIGHT },
    block: {
      x: blockCenterX - BLOCK_WIDTH / 2,
      y: blockY,
      w: BLOCK_WIDTH,
      h: BLOCK_HEIGHT
    },
    blockArrow,
    boardArrow,
    frictionBlock,
    frictionBoard,
    syncX,
    syncVisible,
    ticks
  };
}

export function pointInsideFrame(x: number, y: number, pad = 0): boolean {
  return x >= pad && x <= BASE_W - pad && y >= pad && y <= BASE_H - pad;
}

export function apparatusInsideFrame(layout: ApparatusLayout): boolean {
  const limit = BASE_H - C.transportClearY;
  const points: BlockBoardVec[] = [
    layout.trackStart,
    layout.trackEnd,
    { x: layout.board.x, y: layout.board.y },
    { x: layout.board.x + layout.board.w, y: layout.board.y + layout.board.h },
    { x: layout.block.x, y: layout.block.y },
    { x: layout.block.x + layout.block.w, y: layout.block.y + layout.block.h }
  ];
  if (layout.blockArrow) {
    points.push(
      { x: layout.blockArrow.x1, y: layout.blockArrow.y1 },
      { x: layout.blockArrow.x2, y: layout.blockArrow.y2 }
    );
  }
  if (layout.boardArrow) {
    points.push(
      { x: layout.boardArrow.x1, y: layout.boardArrow.y1 },
      { x: layout.boardArrow.x2, y: layout.boardArrow.y2 }
    );
  }
  return points.every((p) => pointInsideFrame(p.x, p.y, 2) && p.y <= limit);
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
  const w = Math.max(1, finite(availW, 1));
  const h = Math.max(1, finite(availH, 1));
  const bw = Math.max(1, finite(boxW, 1));
  const bh = Math.max(1, finite(boxH, 1));
  const fit = Math.min(w / bw, h / bh);
  const stageW = bw * fit;
  const stageH = bh * fit;
  return {
    fit,
    offsetX: finite(originX, 0) + (alignX === 'center' ? (w - stageW) / 2 : 0),
    offsetY: finite(originY, 0) + (h - stageH) / 2
  };
}

function finitePose(pose: StagePose): StagePose {
  return {
    fit: finite(pose.fit, 0),
    offsetX: finite(pose.offsetX, 0),
    offsetY: finite(pose.offsetY, 0)
  };
}

function withFrame(
  pose: StagePose,
  boxW: number,
  boxH: number,
  floatingReadout: boolean,
  scaleX = 1
): StagePose & {
  boxW: number;
  boxH: number;
  floatingReadout: boolean;
  scaleX: number;
} {
  return {
    ...finitePose(pose),
    boxW,
    boxH,
    floatingReadout,
    scaleX: finite(scaleX, 1)
  };
}

function stretchCentered(
  pose: StagePose,
  width: number,
  boxW: number,
  maxScaleX = 1.35
): StagePose & { scaleX: number } {
  const fit = Math.max(0, finite(pose.fit, 0));
  const safeWidth = Math.max(1, finite(width, 1));
  const naturalWidth = Math.max(1, boxW * fit);
  const scaleX = Math.min(maxScaleX, safeWidth / naturalWidth);
  return {
    ...finitePose(pose),
    offsetX: (safeWidth - naturalWidth * scaleX) / 2,
    scaleX: finite(scaleX, 1)
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
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
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
 * 960×360 仅动画舞台。
 * 演示模式底部读数把整框放在面板上方；侧栏遮挡时让到左侧并避开 transport。
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
  scaleX: number;
} {
  const width = Math.max(1, finite(cssWidth, 1));
  const height = Math.max(1, finite(cssHeight, 1));
  const boxW = C.baseWidth;
  const boxH = C.baseHeight;

  if (!layout.floatingReadout) {
    return withFrame(
      containInRect(boxW, boxH, width, height, 0, 0, 'center'),
      boxW,
      boxH,
      false
    );
  }

  const overlay = Math.max(
    0,
    finite(layout.overlayPx, FLOATING_OVERLAY_FALLBACK)
  );
  const gap = C.overlayGapPx;
  const transportClearY = clamp(
    finite(layout.transportClearY, C.transportClearY),
    0,
    Math.max(0, height - 1)
  );
  const candidates: StagePose[] = [];

  if (overlay + gap < width * 0.75) {
    candidates.push(
      containInRect(
        boxW,
        boxH,
        Math.max(1, width - overlay - gap),
        Math.max(1, height - transportClearY),
        0,
        transportClearY,
        'left'
      )
    );
  }

  const overlayTop = layout.overlayTopPx;
  const overlayH = layout.overlayHeightPx;
  if (
    typeof overlayTop === 'number' &&
    Number.isFinite(overlayTop) &&
    typeof overlayH === 'number' &&
    Number.isFinite(overlayH) &&
    overlayH > 0
  ) {
    const panelTop = clamp(overlayTop, 0, height);
    const panelBottom = clamp(overlayTop + overlayH, 0, height);
    const aboveH = panelTop - gap;
    if (aboveH > 1) {
      candidates.push(containInRect(boxW, boxH, width, aboveH, 0, 0, 'center'));
    }
    const belowH = height - panelBottom - gap;
    if (belowH > 1) {
      const pose = containInRect(boxW, boxH, width, belowH, 0, 0, 'center');
      candidates.push({
        fit: pose.fit,
        offsetX: pose.offsetX,
        offsetY: panelBottom + gap + pose.offsetY
      });
    }

    const lowerDock = panelTop + overlayH * 0.5 >= height * 0.45;
    if (lowerDock && aboveH > 1) {
      const above = containInRect(boxW, boxH, width, aboveH, 0, 0, 'center');
      if (above.offsetY + boxH * above.fit <= panelTop - gap + 1e-6) {
        const stretched = stretchCentered(above, width, boxW);
        return withFrame(stretched, boxW, boxH, true, stretched.scaleX);
      }
    }
  }

  if (candidates.length > 0) {
    const chosen = candidates.reduce((best, candidate) =>
      betterPose(best, candidate)
    );
    return withFrame(chosen, boxW, boxH, true);
  }

  return withFrame(
    containInRect(boxW, boxH, width, height, 0, 0, 'center'),
    boxW,
    boxH,
    true
  );
}

export function createBlockBoardSim(initial: Partial<BlockBoardParams> = {}) {
  let params = normalizeParams(initial);
  let time = 0;

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const delta = finite(dt, 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    time = wrapBlockBoardTime(time + delta, loopHorizonFor(params));
  }

  return {
    getState(): BlockBoardState {
      return stateAt(params, time);
    },
    getSnapshot(): BlockBoardState {
      return stateAt(params, time);
    },
    getParams(): BlockBoardParams {
      return { ...params };
    },
    setParams(next: Partial<BlockBoardParams>): BlockBoardParams {
      params = normalizeParams({ ...params, ...next }, params);
      time = wrapBlockBoardTime(time, loopHorizonFor(params));
      return { ...params };
    },
    step(dt: number): void {
      advance(Math.max(0, finite(dt, 0)), false);
    },
    stepFrame(dt: number = FRAME_DT): void {
      advance(finite(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

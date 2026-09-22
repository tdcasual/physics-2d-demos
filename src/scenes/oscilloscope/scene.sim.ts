import { clamp } from '../../core/math';
import {
  READOUT_OVERLAY_ATTR,
  readoutOccludesStage
} from '../../platform/stage-readout';

export type OscilloscopeParams = {
  signalAmplitude: number;
  signalFrequency: number;
  scanEnabled: boolean;
  scanAmplitude: number;
  scanFrequency: number;
  autoRun: boolean;
};

export type OscilloscopeState = {
  params: OscilloscopeParams;
  time: number;
  phase: number;
  electronX: number;
  electronY: number;
  screenX: number;
  screenY: number;
  cyclesPerScan: number;
  stable: boolean;
};

export type OscilloscopeVec = { x: number; y: number };

export type OscilloscopeBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type OscilloscopeGraphPoint = { t: number; u: number };

export type GraphFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type OscilloscopeGraphFrames = {
  signal: GraphFrame;
  scan: GraphFrame;
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
  transportClearY?: number;
};

export type ApparatusLayout = {
  tube: { left: number; right: number; centerY: number; height: number };
  gun: OscilloscopeVec;
  anodes: OscilloscopeBox[];
  yPlateTop: OscilloscopeBox;
  yPlateBottom: OscilloscopeBox;
  xPlate: OscilloscopeBox;
  screenHit: OscilloscopeVec;
  beam: OscilloscopeVec[];
  scope: { cx: number; cy: number; r: number };
  labels: Array<{ text: string; x: number; y: number }>;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const AMP_MIN = 5;
const AMP_MAX = 80;
const AMP_SIGNAL_DEFAULT = 35;
const AMP_SCAN_DEFAULT = 40;
const F_SIGNAL_MIN = 20;
const F_SIGNAL_MAX = 400;
const F_SIGNAL_DEFAULT = 210;
const F_SCAN_MIN = 10;
const F_SCAN_MAX = 200;
const F_SCAN_DEFAULT = 70;
const FRAME_DT = 1 / 60;
const BASE_W = 960;
const BASE_H = 540;
const TUBE_LEFT = 40;
const TUBE_RIGHT = 920;
const TUBE_CENTER_Y = 158;
const TUBE_HEIGHT = 148;
const GUN_X = 68;
const Y_PLATE_X = 248;
const Y_PLATE_W = 64;
const Y_PLATE_H = 12;
const Y_PLATE_GAP = 48;
const X_PLATE_X = 360;
const X_PLATE_W = 32;
const X_PLATE_H = 100;
const SCOPE_CX = 480;
const SCOPE_CY = 396;
const SCOPE_R = 110;
const STABLE_EPS = 0.035;
const VISUAL_TIME_SCALE = 0.35;
const TRACE_SAMPLES = 180;
const GRAPH_SAMPLES = 160;
const GRAPH_PERIODS = 2;
const GRAPH_PAD_L = 44;
const GRAPH_PAD_R = 28;
const GRAPH_PAD_T = 22;
const GRAPH_PAD_B = 26;
const GRAPH_GAP = 18;
const GRAPH_FALLBACK_WIDTH = 400;
const GRAPH_FALLBACK_HEIGHT = 240;
const OVERLAY_FALLBACK_PX = 228;
const OVERLAY_GAP_PX = 16;
const TRANSPORT_CLEAR_Y = 56;

const DEFAULTS: OscilloscopeParams = {
  signalAmplitude: AMP_SIGNAL_DEFAULT,
  signalFrequency: F_SIGNAL_DEFAULT,
  scanEnabled: true,
  scanAmplitude: AMP_SCAN_DEFAULT,
  scanFrequency: F_SCAN_DEFAULT,
  autoRun: true
};

export const oscilloscopeConstants = {
  ampMin: AMP_MIN,
  ampMax: AMP_MAX,
  signalAmpDefault: AMP_SIGNAL_DEFAULT,
  scanAmpDefault: AMP_SCAN_DEFAULT,
  signalFreqMin: F_SIGNAL_MIN,
  signalFreqMax: F_SIGNAL_MAX,
  signalFreqDefault: F_SIGNAL_DEFAULT,
  scanFreqMin: F_SCAN_MIN,
  scanFreqMax: F_SCAN_MAX,
  scanFreqDefault: F_SCAN_DEFAULT,
  frameDt: FRAME_DT,
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  tubeLeft: TUBE_LEFT,
  tubeRight: TUBE_RIGHT,
  tubeCenterY: TUBE_CENTER_Y,
  tubeHeight: TUBE_HEIGHT,
  gunX: GUN_X,
  yPlateX: Y_PLATE_X,
  yPlateW: Y_PLATE_W,
  yPlateH: Y_PLATE_H,
  yPlateGap: Y_PLATE_GAP,
  xPlateX: X_PLATE_X,
  xPlateW: X_PLATE_W,
  xPlateH: X_PLATE_H,
  scopeCenterX: SCOPE_CX,
  scopeCenterY: SCOPE_CY,
  scopeRadius: SCOPE_R,
  stableEps: STABLE_EPS,
  visualTimeScale: VISUAL_TIME_SCALE,
  traceSamples: TRACE_SAMPLES,
  graphSamples: GRAPH_SAMPLES,
  graphPeriods: GRAPH_PERIODS,
  graphPadLeft: GRAPH_PAD_L,
  graphPadRight: GRAPH_PAD_R,
  graphPadTop: GRAPH_PAD_T,
  graphPadBottom: GRAPH_PAD_B,
  graphGap: GRAPH_GAP,
  graphFallbackWidth: GRAPH_FALLBACK_WIDTH,
  graphFallbackHeight: GRAPH_FALLBACK_HEIGHT,
  overlayFallbackPx: OVERLAY_FALLBACK_PX,
  overlayGapPx: OVERLAY_GAP_PX,
  transportClearY: TRANSPORT_CLEAR_Y,
  sampleDt: FRAME_DT
} as const;

export const OSCILLOSCOPE_SIGNAL_TITLE = 'Uy';
export const OSCILLOSCOPE_SCAN_TITLE = 'Ux';

const C = oscilloscopeConstants;

export function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
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

function normalize(
  input: Partial<OscilloscopeParams>,
  previous = DEFAULTS
): OscilloscopeParams {
  return {
    signalAmplitude: clamp(
      finite(input.signalAmplitude, previous.signalAmplitude),
      AMP_MIN,
      AMP_MAX
    ),
    signalFrequency: clamp(
      finite(input.signalFrequency, previous.signalFrequency),
      F_SIGNAL_MIN,
      F_SIGNAL_MAX
    ),
    scanEnabled:
      input.scanEnabled === undefined
        ? previous.scanEnabled
        : asBool(input.scanEnabled, previous.scanEnabled),
    scanAmplitude: clamp(
      finite(input.scanAmplitude, previous.scanAmplitude),
      AMP_MIN,
      AMP_MAX
    ),
    scanFrequency: clamp(
      finite(input.scanFrequency, previous.scanFrequency),
      F_SCAN_MIN,
      F_SCAN_MAX
    ),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun)
  };
}

/** Visual time used by the slowed teaching clock: t_vis = t · s. */
export function visualTime(time: number): number {
  return Math.max(0, finite(time, 0)) * VISUAL_TIME_SCALE;
}

/** Scan period on the teaching clock: T_x = 1 / f_x. */
export function scanPeriod(scanFrequency: number): number {
  const fx = Math.max(finite(scanFrequency, F_SCAN_DEFAULT), 1e-9);
  return 1 / fx;
}

export function stableRatio(
  signalFrequency: number,
  scanFrequency: number
): number {
  const fx = finite(scanFrequency, 0);
  if (!(fx > 0)) return 0;
  return finite(signalFrequency, 0) / fx;
}

export function isIntegerRatio(
  signalFrequency: number,
  scanFrequency: number,
  eps = STABLE_EPS
): boolean {
  const ratio = stableRatio(signalFrequency, scanFrequency);
  if (!(ratio > 0) || !Number.isFinite(ratio)) return false;
  return Math.abs(ratio - Math.round(ratio)) < eps;
}

export function sweepFraction(
  params: OscilloscopeParams,
  time: number
): number {
  if (!params.scanEnabled) return 0.5;
  const vis = visualTime(time);
  const period = scanPeriod(params.scanFrequency);
  const wrapped = vis / period;
  return ((wrapped % 1) + 1) % 1;
}

export function sweepIndex(params: OscilloscopeParams, time: number): number {
  if (!params.scanEnabled) return 0;
  const vis = visualTime(time);
  const period = scanPeriod(params.scanFrequency);
  return Math.floor(Math.max(0, vis / period));
}

/** U_y = A_y sin(2π f_y t_vis). Returns a signed amplitude in parameter units. */
export function signalVoltage(
  params: OscilloscopeParams,
  time: number
): number {
  const vis = visualTime(time);
  return (
    params.signalAmplitude *
    Math.sin(2 * Math.PI * params.signalFrequency * vis)
  );
}

/** Rising sawtooth 0 → A_x with period T_x; 0 when the timebase is off. */
export function scanVoltage(params: OscilloscopeParams, time: number): number {
  if (!params.scanEnabled) return 0;
  return params.scanAmplitude * sweepFraction(params, time);
}

function normalizedY(params: OscilloscopeParams, time: number): number {
  return signalVoltage(params, time) / AMP_MAX;
}

function normalizedX(params: OscilloscopeParams, time: number): number {
  if (!params.scanEnabled) return 0.5;
  return sweepFraction(params, time);
}

/**
 * One sweep of the phosphor path.
 * y(s) = sin(2π (f_y/f_x) k + 2π (f_y/f_x) s) · A_y/A_max
 * with s ∈ [0,1] the left-to-right scan and k the completed-sweep index.
 * Integer f_y/f_x ⇒ the 2π n k term vanishes and the trace repeats.
 */
export function sweepWaveform(
  params: OscilloscopeParams,
  time: number,
  samples = TRACE_SAMPLES
): OscilloscopeVec[] {
  const count = Math.max(2, Math.floor(finite(samples, TRACE_SAMPLES)));
  const ay = params.signalAmplitude / AMP_MAX;
  if (!params.scanEnabled) {
    const points: OscilloscopeVec[] = [];
    for (let i = 0; i <= count; i += 1) {
      const y = -ay + (2 * ay * i) / count;
      points.push({ x: 0.5, y });
    }
    return points;
  }
  const ratio = stableRatio(params.signalFrequency, params.scanFrequency);
  const phase0 = 2 * Math.PI * ratio * sweepIndex(params, time);
  const points: OscilloscopeVec[] = [];
  for (let i = 0; i <= count; i += 1) {
    const s = i / count;
    points.push({
      x: s,
      y: Math.sin(phase0 + 2 * Math.PI * ratio * s) * ay
    });
  }
  return points;
}

export function graphWindow(params: OscilloscopeParams): number {
  if (params.scanEnabled) {
    return GRAPH_PERIODS * scanPeriod(params.scanFrequency);
  }
  return GRAPH_PERIODS / Math.max(params.signalFrequency, 1e-9);
}

export function graphSeries(
  params: OscilloscopeParams,
  time: number,
  kind: 'signal' | 'scan',
  samples = GRAPH_SAMPLES
): OscilloscopeGraphPoint[] {
  const count = Math.max(2, Math.floor(finite(samples, GRAPH_SAMPLES)));
  const window = graphWindow(params);
  const vis = visualTime(time);
  const start = vis < window ? 0 : vis - window;
  const points: OscilloscopeGraphPoint[] = [];
  for (let i = 0; i <= count; i += 1) {
    const tVis = start + (window * i) / count;
    const simTime = tVis / VISUAL_TIME_SCALE;
    const u =
      kind === 'signal'
        ? signalVoltage(params, simTime)
        : scanVoltage(params, simTime);
    points.push({ t: tVis - start, u });
  }
  return points;
}

export function graphCursor(params: OscilloscopeParams, time: number): number {
  const window = graphWindow(params);
  const vis = visualTime(time);
  const start = vis < window ? 0 : vis - window;
  return clamp((vis - start) / Math.max(window, 1e-9), 0, 1);
}

export function graphFrames(
  width: number,
  height: number
): OscilloscopeGraphFrames {
  const w = Math.max(1, finite(width, GRAPH_FALLBACK_WIDTH));
  const h = Math.max(1, finite(height, GRAPH_FALLBACK_HEIGHT));
  const left = GRAPH_PAD_L;
  const right = Math.max(GRAPH_PAD_L + 48, w - GRAPH_PAD_R);
  const innerTop = GRAPH_PAD_T;
  const innerBottom = Math.max(GRAPH_PAD_T + 48, h - GRAPH_PAD_B);
  const innerH = Math.max(1, innerBottom - innerTop);
  const plotH = Math.max(24, (innerH - GRAPH_GAP) / 2);
  return {
    signal: {
      left,
      right,
      top: innerTop,
      bottom: innerTop + plotH
    },
    scan: {
      left,
      right,
      top: innerBottom - plotH,
      bottom: innerBottom
    }
  };
}

export function graphToPx(
  t: number,
  u: number,
  frame: GraphFrame,
  tMax: number,
  uMin: number,
  uMax: number
): OscilloscopeVec {
  const spanT = Math.max(finite(tMax, 1), 1e-9);
  const spanU = Math.max(finite(uMax, 1) - finite(uMin, 0), 1e-9);
  const x =
    frame.left +
    ((frame.right - frame.left) * clamp(finite(t, 0), 0, tMax)) / spanT;
  const y =
    frame.bottom -
    ((frame.bottom - frame.top) * (clamp(finite(u, 0), uMin, uMax) - uMin)) /
      spanU;
  return {
    x: clamp(x, frame.left, frame.right),
    y: clamp(y, frame.top, frame.bottom)
  };
}

export function stateAt(
  params: OscilloscopeParams,
  time: number
): OscilloscopeState {
  const safe = normalize(params);
  const t = Math.max(0, finite(time, 0));
  const vis = visualTime(t);
  const ratio = stableRatio(safe.signalFrequency, safe.scanFrequency);
  const y = normalizedY(safe, t);
  const sweep = normalizedX(safe, t);
  return {
    params: { ...safe },
    time: t,
    phase: 2 * Math.PI * safe.signalFrequency * vis,
    electronX: sweep,
    electronY: y,
    screenX: safe.scanEnabled
      ? (sweep - 0.5) * (safe.scanAmplitude / AMP_MAX)
      : 0,
    screenY: y,
    cyclesPerScan: Math.max(0, ratio),
    stable: isIntegerRatio(safe.signalFrequency, safe.scanFrequency)
  };
}

export function apparatusLayout(state: OscilloscopeState): ApparatusLayout {
  const yDefl = state.electronY * (TUBE_HEIGHT * 0.38);
  const gun: OscilloscopeVec = { x: GUN_X, y: TUBE_CENTER_Y };
  const yMid = Y_PLATE_X + Y_PLATE_W / 2;
  const xEnd = X_PLATE_X + X_PLATE_W;
  const screenHit: OscilloscopeVec = {
    x: TUBE_RIGHT - 12,
    y: TUBE_CENTER_Y + yDefl
  };
  const beam: OscilloscopeVec[] = [
    gun,
    { x: Y_PLATE_X, y: TUBE_CENTER_Y },
    { x: yMid, y: TUBE_CENTER_Y + yDefl * 0.45 },
    { x: Y_PLATE_X + Y_PLATE_W, y: TUBE_CENTER_Y + yDefl },
    { x: xEnd, y: TUBE_CENTER_Y + yDefl },
    screenHit
  ];
  const anodeW = 14;
  const anodes: OscilloscopeBox[] = [0, 1, 2].map((i) => {
    const h = 50 - i * 10;
    return {
      x: TUBE_LEFT + 42 + i * 26,
      y: TUBE_CENTER_Y - h / 2,
      w: anodeW,
      h
    };
  });
  return {
    tube: {
      left: TUBE_LEFT,
      right: TUBE_RIGHT,
      centerY: TUBE_CENTER_Y,
      height: TUBE_HEIGHT
    },
    gun,
    anodes,
    yPlateTop: {
      x: Y_PLATE_X,
      y: TUBE_CENTER_Y - Y_PLATE_GAP - Y_PLATE_H,
      w: Y_PLATE_W,
      h: Y_PLATE_H
    },
    yPlateBottom: {
      x: Y_PLATE_X,
      y: TUBE_CENTER_Y + Y_PLATE_GAP,
      w: Y_PLATE_W,
      h: Y_PLATE_H
    },
    xPlate: {
      x: X_PLATE_X,
      y: TUBE_CENTER_Y - X_PLATE_H / 2,
      w: X_PLATE_W,
      h: X_PLATE_H
    },
    screenHit,
    beam,
    scope: { cx: SCOPE_CX, cy: SCOPE_CY, r: SCOPE_R },
    labels: [
      {
        text: '电子枪',
        x: GUN_X + 36,
        y: TUBE_CENTER_Y + TUBE_HEIGHT / 2 + 18
      },
      {
        text: 'Y',
        x: Y_PLATE_X + Y_PLATE_W / 2,
        y: TUBE_CENTER_Y - Y_PLATE_GAP - 22
      },
      {
        text: 'Y′',
        x: Y_PLATE_X + Y_PLATE_W / 2,
        y: TUBE_CENTER_Y + Y_PLATE_GAP + Y_PLATE_H + 20
      },
      {
        text: 'X',
        x: X_PLATE_X + X_PLATE_W / 2,
        y: TUBE_CENTER_Y - X_PLATE_H / 2 - 16
      },
      {
        text: 'X′',
        x: X_PLATE_X + X_PLATE_W / 2,
        y: TUBE_CENTER_Y + X_PLATE_H / 2 + 16
      },
      {
        text: '荧光屏',
        x: TUBE_RIGHT - 8,
        y: TUBE_CENTER_Y - TUBE_HEIGHT / 2 - 14
      },
      { text: '示波屏', x: SCOPE_CX, y: SCOPE_CY + SCOPE_R + 18 }
    ]
  };
}

export function pointInsideFrame(x: number, y: number, pad = 0): boolean {
  return x >= pad && x <= BASE_W - pad && y >= pad && y <= BASE_H - pad;
}

export function apparatusInsideFrame(layout: ApparatusLayout): boolean {
  const boxes: OscilloscopeBox[] = [
    ...layout.anodes,
    layout.yPlateTop,
    layout.yPlateBottom,
    layout.xPlate
  ];
  const points: OscilloscopeVec[] = [
    { x: layout.tube.left, y: layout.tube.centerY - layout.tube.height / 2 },
    { x: layout.tube.right, y: layout.tube.centerY + layout.tube.height / 2 },
    layout.gun,
    layout.screenHit,
    { x: layout.scope.cx, y: layout.scope.cy },
    {
      x: layout.scope.cx - layout.scope.r,
      y: layout.scope.cy - layout.scope.r
    },
    {
      x: layout.scope.cx + layout.scope.r,
      y: layout.scope.cy + layout.scope.r
    },
    ...layout.beam,
    ...layout.labels,
    ...boxes.flatMap((box) => [
      { x: box.x, y: box.y },
      { x: box.x + box.w, y: box.y + box.h }
    ])
  ];
  return points.every((p) => pointInsideFrame(p.x, p.y, 2));
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
    offsetX: Math.max(
      0,
      finite(originX, 0) + (alignX === 'center' ? (w - stageW) / 2 : 0)
    ),
    offsetY: Math.max(0, finite(originY, 0) + (h - stageH) / 2)
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

type StagePoseFrame = StagePose & { scaleX: number };

export const OSCILLOSCOPE_FLOATING_LAYOUT_SELECTOR = [
  '.split-right-shell',
  '[data-testid="split-right-layout"]',
  '.layout-srgb-graph-bottom',
  '[data-testid="split-right-graph-bottom-layout"]',
  '.lab-stage-layout',
  '[data-testid="lab-stage-layout"]'
].join(', ');

export const OSCILLOSCOPE_OVERLAY_PANEL_SELECTOR = [
  '.teaching-readout-panel',
  '.srgb-readout-panel',
  '.readout-panel',
  '.lab-float-data'
].join(', ');

/** Layout-local floating 数据读数 cards, including lab floats off the canvas parent. */
export function findOverlayPanels(anchor?: Element | null): HTMLElement[] {
  if (!(anchor instanceof Element)) return [];
  const found = new Set<HTMLElement>();
  const addFrom = (root: ParentNode | null | undefined): void => {
    if (!root) return;
    root.querySelectorAll(OSCILLOSCOPE_OVERLAY_PANEL_SELECTOR).forEach((el) => {
      if (el instanceof HTMLElement) found.add(el);
    });
  };
  addFrom(anchor.parentElement);
  addFrom(anchor.closest(OSCILLOSCOPE_FLOATING_LAYOUT_SELECTOR));
  return [...found];
}

export function hasFloatingReadout(anchor?: Element | null): boolean {
  if (typeof document === 'undefined') return true;
  const node = anchor ?? document.body;
  // 复合判断：布局根打了 data-readout-overlay 的以属性为准
  // （mobile=false、split/srgb/lab=true）；无布局祖先的游离 DOM
  // 维持浮窗实测（findOverlayPanels），像素行为不变
  if (node.closest(`[${READOUT_OVERLAY_ATTR}]`)) {
    return readoutOccludesStage(node);
  }
  return findOverlayPanels(node instanceof Element ? node : null).length > 0;
}

function measureOverlay(
  canvas: HTMLElement,
  panels: HTMLElement[]
): { overlayPx: number; overlayTopPx: number; overlayHeightPx: number } {
  const cr = canvas.getBoundingClientRect();
  let overlayPx = 0;
  let top = Number.POSITIVE_INFINITY;
  let bottom = 0;
  for (const panel of panels) {
    if (panel.classList.contains('is-collapsed')) continue;
    const rr = panel.getBoundingClientRect();
    if (
      rr.left < cr.right &&
      rr.right > cr.left &&
      rr.top < cr.bottom &&
      rr.bottom > cr.top
    ) {
      overlayPx = Math.max(overlayPx, Math.max(0, cr.right - rr.left));
      const bandTop = Math.max(rr.top, cr.top);
      const bandBottom = Math.min(rr.bottom, cr.bottom);
      top = Math.min(top, bandTop);
      bottom = Math.max(bottom, bandBottom);
    }
  }
  if (!Number.isFinite(top) || bottom <= top) {
    return { overlayPx, overlayTopPx: 0, overlayHeightPx: 0 };
  }
  return {
    overlayPx,
    overlayTopPx: Math.max(0, top - cr.top),
    overlayHeightPx: Math.max(0, bottom - top)
  };
}

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  const floatingReadout = hasFloatingReadout(canvas);
  if (!floatingReadout) return { floatingReadout: false, overlayPx: 0 };
  let overlayPx = 0;
  let overlayTopPx = 0;
  let overlayHeightPx = 0;
  if (canvas instanceof HTMLElement) {
    const measured = measureOverlay(canvas, findOverlayPanels(canvas));
    overlayPx = measured.overlayPx;
    overlayTopPx = measured.overlayTopPx;
    overlayHeightPx = measured.overlayHeightPx;
  }
  return {
    floatingReadout: true,
    // Collapsed chips are only ~90px; keep a right gutter so expanding
    // 数据读数 cannot cover the tube before the next overlay measure.
    overlayPx: Math.max(overlayPx, OVERLAY_FALLBACK_PX),
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

export function mapStagePoint(
  x: number,
  y: number,
  pose: {
    fit: number;
    offsetX: number;
    offsetY: number;
    scaleX: number;
  }
): OscilloscopeVec {
  return {
    x: pose.offsetX + x * pose.fit * pose.scaleX,
    y: pose.offsetY + y * pose.fit
  };
}

function poseHitsOverlay(
  pose: StagePoseFrame,
  boxW: number,
  boxH: number,
  overlay: { left: number; top: number; right: number; bottom: number },
  gap: number
): boolean {
  const frame = {
    left: pose.offsetX,
    top: pose.offsetY,
    right: pose.offsetX + boxW * pose.fit * pose.scaleX,
    bottom: pose.offsetY + boxH * pose.fit
  };
  return (
    frame.left < overlay.right - 1e-6 &&
    frame.right > overlay.left - gap + 1e-6 &&
    frame.top < overlay.bottom - 1e-6 &&
    frame.bottom > overlay.top + 1e-6
  );
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

  const overlay = Math.max(0, finite(layout.overlayPx, OVERLAY_FALLBACK_PX));
  const gap = C.overlayGapPx;
  const transportClearY = clamp(
    finite(layout.transportClearY, C.transportClearY),
    0,
    Math.max(0, height - 1)
  );
  const overlayLeft = Math.max(0, width - overlay);
  const overlayTop = layout.overlayTopPx;
  const overlayH = layout.overlayHeightPx;
  const hasBand =
    typeof overlayTop === 'number' &&
    Number.isFinite(overlayTop) &&
    typeof overlayH === 'number' &&
    Number.isFinite(overlayH) &&
    overlayH > 0;
  const overlayRect = {
    left: overlayLeft,
    top: hasBand ? clamp(overlayTop, 0, height) : 0,
    right: width,
    bottom: hasBand ? clamp(overlayTop + overlayH, 0, height) : height
  };
  const fullWidthDock = overlay + gap >= width * 0.75;
  const candidates: StagePoseFrame[] = [];

  const sideAvail = width - overlay - gap;
  if (sideAvail > 1 && !fullWidthDock) {
    candidates.push({
      ...containInRect(
        boxW,
        boxH,
        Math.max(1, sideAvail),
        Math.max(1, height - transportClearY),
        0,
        transportClearY,
        'left'
      ),
      scaleX: 1
    });
  }

  if (hasBand) {
    const panelTop = overlayRect.top;
    const panelBottom = overlayRect.bottom;
    const aboveH = panelTop - gap;
    if (aboveH > 1) {
      const above = containInRect(boxW, boxH, width, aboveH, 0, 0, 'center');
      candidates.push({ ...above, scaleX: 1 });
      const lowerDock = panelTop + overlayH * 0.5 >= height * 0.45;
      // Full-width docked-bottom only. A tall right-side card must not
      // stretch the stage under the 数据读数 overlay.
      if (
        fullWidthDock &&
        lowerDock &&
        above.offsetY + boxH * above.fit <= panelTop - gap + 1e-6
      ) {
        const stretched = stretchCentered(above, width, boxW);
        return withFrame(stretched, boxW, boxH, true, stretched.scaleX);
      }
    }
    const belowH = height - panelBottom - gap;
    if (belowH > 1) {
      const pose = containInRect(boxW, boxH, width, belowH, 0, 0, 'center');
      candidates.push({
        fit: pose.fit,
        offsetX: pose.offsetX,
        offsetY: panelBottom + gap + pose.offsetY,
        scaleX: 1
      });
    }
  }

  const framed = candidates.map((candidate) =>
    withFrame(candidate, boxW, boxH, true, candidate.scaleX)
  );
  const clear = framed.filter(
    (candidate) => !poseHitsOverlay(candidate, boxW, boxH, overlayRect, gap)
  );
  const pool = clear.length > 0 ? clear : framed;
  if (pool.length > 0) {
    return pool.reduce((best, candidate) =>
      candidate.fit > best.fit + 1e-9 ? candidate : best
    );
  }

  // Never fall back to a full-width centered stage under a side overlay.
  return withFrame(
    containInRect(
      boxW,
      boxH,
      Math.max(1, sideAvail > 1 ? sideAvail : width),
      Math.max(1, height - transportClearY),
      0,
      sideAvail > 1 ? transportClearY : 0,
      sideAvail > 1 ? 'left' : 'center'
    ),
    boxW,
    boxH,
    true
  );
}

export function createOscilloscopeSim(
  initial: Partial<OscilloscopeParams> = {}
) {
  const session = normalize(initial);
  let params = { ...session };
  let time = 0;

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const delta = finite(dt, 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    time += delta;
  }

  return {
    getState(): OscilloscopeState {
      return stateAt(params, time);
    },
    getSnapshot(): OscilloscopeState {
      return stateAt(params, time);
    },
    getParams(): OscilloscopeParams {
      return { ...params };
    },
    setParams(next: Partial<OscilloscopeParams>): OscilloscopeParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      advance(Math.max(0, finite(dt, 0)), false);
    },
    stepFrame(dt: number = FRAME_DT): void {
      advance(finite(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...session };
      time = 0;
    }
  };
}

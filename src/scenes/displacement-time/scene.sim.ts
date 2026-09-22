import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type DisplacementTimeParams = {
  v0: number;
  acceleration: number;
  autoRun: boolean;
  showArea: boolean;
};

export type DisplacementTimeState = {
  params: DisplacementTimeParams;
  time: number;
  velocity: number;
  displacement: number;
};

export type DisplacementTimePoint = { t: number; v: number };

export type DisplacementTimeAreaSegment = {
  sign: 1 | -1;
  points: DisplacementTimePoint[];
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
  transportClearY?: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const BASE_W = 880;
const BASE_H = 680;
const V0_MIN = -10;
const V0_MAX = 20;
const A_MIN = -6;
const A_MAX = 6;
const V0_DEFAULT = 5;
const A_DEFAULT = 4;
const MAX_T = 4;
const FRAME_DT = 1 / 60;
const TAPE_DT = 0.2;
const TRACK_Y = 84;
const TRACK_START_X = 52;
const TRACK_END_X = 828;
const TRACK_ORIGIN_X = 440;
const TRACK_SCALE = 5.4;
const CAR_WIDTH = 56;
const CAR_HEIGHT = 24;
const GRAPH_LEFT = 78;
const GRAPH_RIGHT = 800;
const VT_TOP = 148;
const VT_BOTTOM = 376;
const VT_POS_MAX = 48;
const VT_NEG_MAX = 36;
const VT_AXIS_Y =
  VT_TOP + ((VT_BOTTOM - VT_TOP) * VT_POS_MAX) / (VT_POS_MAX + VT_NEG_MAX);
const XT_TOP = 416;
const XT_BOTTOM = 648;
const XT_POS_MAX = 140;
const XT_NEG_MAX = 100;
const XT_AXIS_Y =
  XT_TOP + ((XT_BOTTOM - XT_TOP) * XT_POS_MAX) / (XT_POS_MAX + XT_NEG_MAX);
const CURVE_SAMPLES = 48;

const DEFAULTS: DisplacementTimeParams = {
  v0: V0_DEFAULT,
  acceleration: A_DEFAULT,
  autoRun: true,
  showArea: true
};

export const displacementTimeConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  v0Min: V0_MIN,
  v0Max: V0_MAX,
  accelerationMin: A_MIN,
  accelerationMax: A_MAX,
  v0Default: V0_DEFAULT,
  accelerationDefault: A_DEFAULT,
  maxTime: MAX_T,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  velocityTop: VT_TOP,
  velocityBottom: VT_BOTTOM,
  velocityAxisY: VT_AXIS_Y,
  velocityPosMax: VT_POS_MAX,
  velocityNegMax: VT_NEG_MAX,
  displacementTop: XT_TOP,
  displacementBottom: XT_BOTTOM,
  displacementAxisY: XT_AXIS_Y,
  displacementPosMax: XT_POS_MAX,
  displacementNegMax: XT_NEG_MAX,
  trackY: TRACK_Y,
  trackStartX: TRACK_START_X,
  trackEndX: TRACK_END_X,
  trackOriginX: TRACK_ORIGIN_X,
  trackScale: TRACK_SCALE,
  carWidth: CAR_WIDTH,
  carHeight: CAR_HEIGHT,
  tapeDt: TAPE_DT,
  frameDt: FRAME_DT,
  curveSamples: CURVE_SAMPLES,
  cursorWidth: 2,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  transportClearY: 96,
  minReadableFit: 0.5
} as const;

const C = displacementTimeConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
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
  input: Partial<DisplacementTimeParams>,
  previous = DEFAULTS
): DisplacementTimeParams {
  return {
    v0: clamp(finite(input.v0, previous.v0), V0_MIN, V0_MAX),
    acceleration: clamp(
      finite(input.acceleration, previous.acceleration),
      A_MIN,
      A_MAX
    ),
    autoRun: asBool(input.autoRun, previous.autoRun),
    showArea: asBool(input.showArea, previous.showArea)
  };
}

export function wrapDisplacementTime(time: number): number {
  const t = finite(time, 0);
  if (!Number.isFinite(t)) return 0;
  if (t < 0 || t > MAX_T) return ((t % MAX_T) + MAX_T) % MAX_T;
  return t;
}

/** v(t) = v₀ + a t */
export function velocityAt(
  v0: number,
  acceleration: number,
  time: number
): number {
  return finite(v0, 0) + finite(acceleration, 0) * Math.max(0, finite(time, 0));
}

/** x(t) = v₀ t + ½ a t² */
export function displacementAt(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, finite(time, 0));
  return finite(v0, 0) * t + 0.5 * finite(acceleration, 0) * t * t;
}

export function formulaTerms(
  v0: number,
  acceleration: number,
  time: number
): { v0t: number; halfAt2: number; x: number } {
  const t = Math.max(0, finite(time, 0));
  const v0t = finite(v0, 0) * t;
  const halfAt2 = 0.5 * finite(acceleration, 0) * t * t;
  return { v0t, halfAt2, x: v0t + halfAt2 };
}

/** Interior zero-crossing of v(t) on (0, T), or null. */
export function zeroCrossingTime(
  v0: number,
  acceleration: number
): number | null {
  const a = finite(acceleration, 0);
  if (a === 0) return null;
  const t = -finite(v0, 0) / a;
  if (t <= 1e-9 || t >= MAX_T - 1e-9) return null;
  return t;
}

/**
 * Algebraic v-t area as closed polygons against the t-axis (v = 0).
 * Negative velocity yields a polygon below the axis (negative displacement).
 */
export function vtAreaSegments(
  v0: number,
  acceleration: number,
  time: number
): DisplacementTimeAreaSegment[] {
  const t = clamp(Math.max(0, finite(time, 0)), 0, MAX_T);
  if (t <= 1e-9) return [];
  const start = finite(v0, 0);
  const acc = finite(acceleration, 0);
  const tz = zeroCrossingTime(start, acc);
  const cuts = [0];
  if (tz !== null && tz < t - 1e-9) cuts.push(tz);
  cuts.push(t);

  const segments: DisplacementTimeAreaSegment[] = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const t0 = cuts[i]!;
    const t1 = cuts[i + 1]!;
    const u0 = start + acc * t0;
    const u1 = start + acc * t1;
    if (Math.abs(u0) < 1e-12 && Math.abs(u1) < 1e-12) continue;
    const sign: 1 | -1 = u0 + u1 >= 0 ? 1 : -1;
    segments.push({
      sign,
      points: [
        { t: t0, v: 0 },
        { t: t0, v: u0 },
        { t: t1, v: u1 },
        { t: t1, v: 0 }
      ]
    });
  }
  return segments;
}

export function signedVtArea(
  v0: number,
  acceleration: number,
  time: number
): number {
  return vtAreaSegments(v0, acceleration, time).reduce((sum, segment) => {
    const t0 = segment.points[0]!.t;
    const t1 = segment.points[3]!.t;
    const u0 = segment.points[1]!.v;
    const u1 = segment.points[2]!.v;
    return sum + 0.5 * (u0 + u1) * (t1 - t0);
  }, 0);
}

/** Teaching-scale car offset; does not change the displacement readout. */
export function carX(displacement: number): number {
  const halfTravel = (TRACK_END_X - TRACK_START_X - CAR_WIDTH) / 2;
  const offset = clamp(
    finite(displacement, 0) * TRACK_SCALE,
    -halfTravel,
    halfTravel
  );
  return TRACK_ORIGIN_X + offset;
}

export function tapeTimes(time: number): number[] {
  const t = clamp(Math.max(0, finite(time, 0)), 0, MAX_T);
  const times: number[] = [];
  for (let k = 1; k * TAPE_DT <= t + 1e-9; k += 1) {
    times.push(k * TAPE_DT);
  }
  return times;
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
 * 880×680 animation-only stage.
 * Docked-bottom readout keeps the full frame above the panel.
 * A side overlay keeps the stage to its left, below the transport bar.
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

function makeState(
  params: DisplacementTimeParams,
  time: number
): DisplacementTimeState {
  return {
    params: { ...params },
    time,
    velocity: velocityAt(params.v0, params.acceleration, time),
    displacement: displacementAt(params.v0, params.acceleration, time)
  };
}

export function createDisplacementTimeSim(
  initial: Partial<DisplacementTimeParams> = {}
) {
  let params = normalizeParams(initial);
  let time = 0;

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const delta = finite(dt, 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    time = wrapDisplacementTime(time + delta);
  }

  return {
    getState(): DisplacementTimeState {
      return makeState(params, time);
    },
    getSnapshot(): DisplacementTimeState {
      return makeState(params, time);
    },
    getParams(): DisplacementTimeParams {
      return { ...params };
    },
    setParams(next: Partial<DisplacementTimeParams>): DisplacementTimeParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      advance(Math.max(0, finite(dt, 0)), false);
    },
    /** Fixed-frame step; ignores autoRun so pause still allows a single tick. */
    stepFrame(dt: number = FRAME_DT): void {
      advance(finite(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

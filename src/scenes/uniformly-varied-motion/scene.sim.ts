import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';
import { finiteNumber, asBooleanOr } from '../../core/coerce';
import { measureStageLayout, fitStage } from '../stage-fit';
import type { StageLayoutHint } from '../stage-fit';

export type UvtParams = {
  v0: number;
  acceleration: number;
  autoRun: boolean;
  showArea: boolean;
};

export type UvtState = {
  params: UvtParams;
  time: number;
  velocity: number;
  displacement: number;
  stopped: boolean;
};

export type UvtPoint = { t: number; v: number };

export type UvtAreaSegment = {
  sign: 1 | -1;
  points: UvtPoint[];
};

const BASE_W = 800;
const BASE_H = 640;
const V0_MIN = -10;
const V0_MAX = 20;
const A_MIN = -4;
const A_MAX = 4;
const V0_DEFAULT = 10;
const A_DEFAULT = -3;
const MAX_T = 10;
const MAX_V = 40;
const REST_EPS = 0.01;
const FRAME_DT = 1 / 60;
const TRACK_Y = 176;
const TRACK_START_X = 56;
const TRACK_END_X = 744;
const TRACK_ORIGIN_X = 400;
const TRACK_SCALE = 3.2;
const CAR_BODY_WIDTH = 68;
const CAR_BODY_HEIGHT = 28;
const CAR_VELOCITY_OFFSET_Y = 16;
const CAR_ACCEL_OFFSET_Y = 40;
const GRAPH_LEFT = 72;
const GRAPH_RIGHT = 736;
const GRAPH_TOP = 248;
const GRAPH_BOTTOM = 580;
const GRAPH_AXIS_Y = (GRAPH_TOP + GRAPH_BOTTOM) / 2;

const DEFAULTS: UvtParams = {
  v0: V0_DEFAULT,
  acceleration: A_DEFAULT,
  autoRun: true,
  showArea: true
};

export const uvtConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  v0Min: V0_MIN,
  v0Max: V0_MAX,
  accelerationMin: A_MIN,
  accelerationMax: A_MAX,
  v0Default: V0_DEFAULT,
  accelerationDefault: A_DEFAULT,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphAxisY: GRAPH_AXIS_Y,
  graphMaxT: MAX_T,
  graphMaxV: MAX_V,
  trackY: TRACK_Y,
  trackStartX: TRACK_START_X,
  trackEndX: TRACK_END_X,
  trackOriginX: TRACK_ORIGIN_X,
  trackScale: TRACK_SCALE,
  carBodyWidth: CAR_BODY_WIDTH,
  carBodyHeight: CAR_BODY_HEIGHT,
  carVelocityOffsetY: CAR_VELOCITY_OFFSET_Y,
  carAccelOffsetY: CAR_ACCEL_OFFSET_Y,
  restEpsilon: REST_EPS,
  frameDt: FRAME_DT,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.5,
  transportClearY: 96
} as const;

const C = uvtConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function normalizeParams(
  input: Partial<UvtParams>,
  previous = DEFAULTS
): UvtParams {
  return {
    v0: clamp(finiteNumber(input.v0, previous.v0), V0_MIN, V0_MAX),
    acceleration: clamp(
      finiteNumber(input.acceleration, previous.acceleration),
      A_MIN,
      A_MAX
    ),
    autoRun: asBooleanOr(input.autoRun, previous.autoRun),
    showArea: asBooleanOr(input.showArea, previous.showArea)
  };
}

export function wrapUvtTime(time: number): number {
  const t = finiteNumber(time, 0);
  if (t > MAX_T || t < 0) return ((t % MAX_T) + MAX_T) % MAX_T;
  return t;
}

/** v(t) = v₀ + a t */
export function uvtVelocity(
  v0: number,
  acceleration: number,
  time: number
): number {
  return (
    finiteNumber(v0, 0) +
    finiteNumber(acceleration, 0) * Math.max(0, finiteNumber(time, 0))
  );
}

/** x(t) = v₀ t + ½ a t² */
export function uvtDisplacement(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, finiteNumber(time, 0));
  return finiteNumber(v0, 0) * t + 0.5 * finiteNumber(acceleration, 0) * t * t;
}

/** Interior zero-crossing of v(t) on (0, T), or null. */
export function uvtZeroCrossingTime(
  v0: number,
  acceleration: number
): number | null {
  const a = finiteNumber(acceleration, 0);
  if (a === 0) return null;
  const t = -finiteNumber(v0, 0) / a;
  if (t <= 1e-9 || t >= MAX_T - 1e-9) return null;
  return t;
}

/**
 * Algebraic v-t area as closed polygons against the t-axis (v = 0).
 * Negative velocity yields a polygon below the axis (negative displacement).
 */
export function uvtAreaSegments(
  v0: number,
  acceleration: number,
  time: number
): UvtAreaSegment[] {
  const t = clamp(Math.max(0, finiteNumber(time, 0)), 0, MAX_T);
  if (t <= 1e-9) return [];
  const start = finiteNumber(v0, 0);
  const acc = finiteNumber(acceleration, 0);
  const tz = uvtZeroCrossingTime(start, acc);
  const cuts = [0];
  if (tz !== null && tz < t - 1e-9) cuts.push(tz);
  cuts.push(t);

  const segments: UvtAreaSegment[] = [];
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

/** Teaching-scale car offset; does not change the displacement readout. */
export function uvtCarX(displacement: number): number {
  const halfTravel = (TRACK_END_X - TRACK_START_X - CAR_BODY_WIDTH) / 2;
  const offset = clamp(
    finiteNumber(displacement, 0) * TRACK_SCALE,
    -halfTravel,
    halfTravel
  );
  return TRACK_ORIGIN_X + offset;
}

export const hasFloatingReadout = readoutOccludesStage;

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  return measureStageLayout(canvas, FLOATING_OVERLAY_FALLBACK);
}

/**
 * 800×640 animation-only stage.
 * Mobile stack fills the slot; desktop floating readout stays left of overlay.
 */
export function stageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
) {
  return fitStage(cssWidth, cssHeight, layout, {
    baseWidth: C.baseWidth,
    baseHeight: C.baseHeight,
    overlayGapPx: C.overlayGapPx,
    minReadableFit: C.minReadableFit,
    overlayClearTop: C.overlayClearTop,
    overlayFallbackPx: FLOATING_OVERLAY_FALLBACK
  });
}

function makeState(params: UvtParams, time: number): UvtState {
  const velocity = uvtVelocity(params.v0, params.acceleration, time);
  return {
    params: { ...params },
    time,
    velocity,
    displacement: uvtDisplacement(params.v0, params.acceleration, time),
    stopped: Math.abs(velocity) < REST_EPS
  };
}

export function createUvtSim(initial: Partial<UvtParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const delta = finiteNumber(dt, 0);
    if (!Number.isFinite(delta) || delta === 0) return;
    time = wrapUvtTime(time + delta);
  }

  return {
    getState(): UvtState {
      return makeState(params, time);
    },
    getSnapshot(): UvtState {
      return makeState(params, time);
    },
    getParams(): UvtParams {
      return { ...params };
    },
    setParams(next: Partial<UvtParams>): UvtParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      advance(Math.max(0, finiteNumber(dt, 0)), false);
    },
    /** Fixed-frame step; ignores autoRun so pause still allows a single tick. */
    stepFrame(dt: number = FRAME_DT): void {
      advance(finiteNumber(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

export type { StageLayoutHint };

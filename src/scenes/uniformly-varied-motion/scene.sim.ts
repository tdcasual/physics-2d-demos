import { clamp } from '../../core/math';

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
  input: Partial<UvtParams>,
  previous = DEFAULTS
): UvtParams {
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

export function wrapUvtTime(time: number): number {
  const t = finite(time, 0);
  if (t > MAX_T || t < 0) return ((t % MAX_T) + MAX_T) % MAX_T;
  return t;
}

/** v(t) = v₀ + a t */
export function uvtVelocity(
  v0: number,
  acceleration: number,
  time: number
): number {
  return finite(v0, 0) + finite(acceleration, 0) * Math.max(0, finite(time, 0));
}

/** x(t) = v₀ t + ½ a t² */
export function uvtDisplacement(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, finite(time, 0));
  return finite(v0, 0) * t + 0.5 * finite(acceleration, 0) * t * t;
}

/** Interior zero-crossing of v(t) on (0, T), or null. */
export function uvtZeroCrossingTime(
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
export function uvtAreaSegments(
  v0: number,
  acceleration: number,
  time: number
): UvtAreaSegment[] {
  const t = clamp(Math.max(0, finite(time, 0)), 0, MAX_T);
  if (t <= 1e-9) return [];
  const start = finite(v0, 0);
  const acc = finite(acceleration, 0);
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
    finite(displacement, 0) * TRACK_SCALE,
    -halfTravel,
    halfTravel
  );
  return TRACK_ORIGIN_X + offset;
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
 * 800×640 animation-only stage.
 * Mobile stack fills the slot; desktop floating readout stays left of overlay.
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
    const delta = finite(dt, 0);
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
      advance(Math.max(0, finite(dt, 0)), false);
    },
    /** Fixed-frame step; ignores autoRun so pause still allows a single tick. */
    stepFrame(dt: number = FRAME_DT): void {
      advance(finite(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

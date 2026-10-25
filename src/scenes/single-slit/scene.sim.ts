import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';
import { finiteNumber, asBooleanOr } from '../../core/coerce';
import { betterPose, containInRect, measureStageLayout } from '../stage-fit';
import type { StagePose, StageLayoutHint } from '../stage-fit';

export type SingleSlitParams = {
  lambda: number;
  slitWidth: number;
  distance: number;
  detectorX: number;
  autoScan: boolean;
};

export type DiffractionSample = { x: number; intensity: number };

export type SingleSlitHandle = 'detector' | null;

export type SingleSlitState = {
  params: SingleSlitParams;
  time: number;
  angle: number;
  intensity: number;
  firstMinimum: number;
  centralWidth: number;
  samples: DiffractionSample[];
  status: string;
};

const LAMBDA_MIN = 400;
const LAMBDA_MAX = 700;
const LAMBDA_DEFAULT = 670;
const SLIT_MIN = 0.08;
const SLIT_MAX = 0.6;
const SLIT_DEFAULT = 0.22;
const DISTANCE_MIN = 0.8;
const DISTANCE_MAX = 4;
const DISTANCE_DEFAULT = 2.4;
const DETECTOR_MIN = -32;
const DETECTOR_MAX = 32;
const DETECTOR_DEFAULT = 7.31;
const BASE_W = 960;
const BASE_H = 660;
const CENTER_X = 480;
const GRID_STEP = 40;
const LASER_Y = 124;
const LASER_WIDTH = 48;
const LASER_HEIGHT = 40;
const LASER_APERTURE = 6;
const SLIT_Y = 188;
const SLIT_BAR_HEIGHT = 10;
const SLIT_GAP_MIN = 7;
const SLIT_GAP_MAX = 26;
const SCREEN_Y = 330;
const SCREEN_HEIGHT = 56;
const SCREEN_INSET = 28;
const SCREEN_BAND_STEP = 2;
const GRAPH_LEFT = 88;
const GRAPH_RIGHT = 872;
const GRAPH_TOP = 408;
const GRAPH_BOTTOM = 578;
const GRAPH_TICK_MAX = 4;
const DETECTOR_RADIUS = 13;
const GRAPH_POINT_RADIUS = 7;
const PX_PER_MM = (GRAPH_RIGHT - GRAPH_LEFT) / (2 * DETECTOR_MAX);
const SCAN_SPEED = 12;
const SAMPLE_COUNT = 321;
const FRAME_DT = 1 / 60;
const BETA_EPS = 1e-8;
const ANGLE_MAX = 89;
const FAN_PAD = 48;
const HIT_PAD = 28;

const DEFAULTS: SingleSlitParams = {
  lambda: LAMBDA_DEFAULT,
  slitWidth: SLIT_DEFAULT,
  distance: DISTANCE_DEFAULT,
  detectorX: DETECTOR_DEFAULT,
  autoScan: true
};

export const singleSlitConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  centerX: CENTER_X,
  gridStep: GRID_STEP,
  laserY: LASER_Y,
  laserWidth: LASER_WIDTH,
  laserHeight: LASER_HEIGHT,
  laserAperture: LASER_APERTURE,
  slitY: SLIT_Y,
  slitBarHeight: SLIT_BAR_HEIGHT,
  slitGapMin: SLIT_GAP_MIN,
  slitGapMax: SLIT_GAP_MAX,
  screenY: SCREEN_Y,
  screenHeight: SCREEN_HEIGHT,
  screenInset: SCREEN_INSET,
  screenBandStep: SCREEN_BAND_STEP,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphTickMax: GRAPH_TICK_MAX,
  detectorRadius: DETECTOR_RADIUS,
  graphPointRadius: GRAPH_POINT_RADIUS,
  detectorMin: DETECTOR_MIN,
  detectorMax: DETECTOR_MAX,
  detectorDefault: DETECTOR_DEFAULT,
  pxPerMm: PX_PER_MM,
  scanSpeed: SCAN_SPEED,
  sampleCount: SAMPLE_COUNT,
  frameDt: FRAME_DT,
  lambdaMin: LAMBDA_MIN,
  lambdaMax: LAMBDA_MAX,
  lambdaDefault: LAMBDA_DEFAULT,
  slitMin: SLIT_MIN,
  slitMax: SLIT_MAX,
  slitDefault: SLIT_DEFAULT,
  distanceMin: DISTANCE_MIN,
  distanceMax: DISTANCE_MAX,
  distanceDefault: DISTANCE_DEFAULT,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.5,
  transportClearY: 96,
  labelInset: 18,
  fanPad: FAN_PAD,
  hitPad: HIT_PAD
} as const;

const C = singleSlitConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function normalizeParams(
  input: Partial<SingleSlitParams>,
  previous: SingleSlitParams = DEFAULTS
): SingleSlitParams {
  return {
    lambda: clamp(
      finiteNumber(input.lambda, previous.lambda),
      LAMBDA_MIN,
      LAMBDA_MAX
    ),
    slitWidth: clamp(
      finiteNumber(input.slitWidth, previous.slitWidth),
      SLIT_MIN,
      SLIT_MAX
    ),
    distance: clamp(
      finiteNumber(input.distance, previous.distance),
      DISTANCE_MIN,
      DISTANCE_MAX
    ),
    detectorX: clamp(
      finiteNumber(input.detectorX, previous.detectorX),
      DETECTOR_MIN,
      DETECTOR_MAX
    ),
    autoScan: asBooleanOr(input.autoScan, previous.autoScan)
  };
}

/** I/I₀ = (sinβ/β)² with a removable singularity at β = 0. */
export function sincSquared(beta: number): number {
  if (!Number.isFinite(beta)) return 0;
  if (Math.abs(beta) < BETA_EPS) return 1;
  const ratio = Math.sin(beta) / beta;
  const intensity = ratio * ratio;
  if (!Number.isFinite(intensity)) return 0;
  return clamp(intensity, 0, 1);
}

/** β = π a sinθ / λ. sinθ = x / √(L² + x²). Units: λ nm, a mm, L m, x mm. */
export function diffractionBeta(
  detectorX: number,
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  const lambdaM = finiteNumber(lambda, LAMBDA_DEFAULT) * 1e-9;
  const slitM = finiteNumber(slitWidth, SLIT_DEFAULT) * 1e-3;
  const xM = finiteNumber(detectorX, 0) * 1e-3;
  const length = Math.max(1e-12, finiteNumber(distance, DISTANCE_DEFAULT));
  if (!(lambdaM > 0) || !(slitM > 0)) return 0;
  const hyp = Math.hypot(length, xM);
  const sinTheta = hyp > 0 ? xM / hyp : 0;
  return (Math.PI * slitM * sinTheta) / lambdaM;
}

/** Fraunhofer single-slit intensity I/I₀ = (sinβ/β)². */
export function diffractionIntensity(
  detectorX: number,
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  return sincSquared(diffractionBeta(detectorX, lambda, slitWidth, distance));
}

/** Small-angle first dark fringe x₁ ≈ λL/a, millimetres. */
export function firstMinimumMm(
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  const a = finiteNumber(slitWidth, SLIT_DEFAULT);
  if (!(a > 0)) return 0;
  return (
    (finiteNumber(lambda, LAMBDA_DEFAULT) *
      finiteNumber(distance, DISTANCE_DEFAULT)) /
    a /
    1000
  );
}

export function centralWidthMm(
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  return firstMinimumMm(lambda, slitWidth, distance) * 2;
}

/** θ = arctan(x/L), degrees, clamped to a finite teaching range. */
export function diffractionAngleDeg(
  detectorX: number,
  distance: number
): number {
  const length = finiteNumber(distance, DISTANCE_DEFAULT);
  if (!(length > 0) || !Number.isFinite(detectorX)) return 0;
  const deg =
    (Math.atan((finiteNumber(detectorX, 0) * 1e-3) / length) * 180) / Math.PI;
  if (!Number.isFinite(deg)) return 0;
  return clamp(deg, -ANGLE_MAX, ANGLE_MAX);
}

export function xToPx(xMm: number): number {
  return CENTER_X + finiteNumber(xMm, 0) * PX_PER_MM;
}

export function pxToX(px: number): number {
  return (finiteNumber(px, CENTER_X) - CENTER_X) / PX_PER_MM;
}

export function graphY(intensity: number): number {
  const value = clamp(finiteNumber(intensity, 0), 0, 1);
  return GRAPH_BOTTOM - value * (GRAPH_BOTTOM - GRAPH_TOP);
}

export function slitGapPx(slitWidth: number): number {
  const t =
    (clamp(finiteNumber(slitWidth, SLIT_DEFAULT), SLIT_MIN, SLIT_MAX) -
      SLIT_MIN) /
    (SLIT_MAX - SLIT_MIN);
  return SLIT_GAP_MIN + t * (SLIT_GAP_MAX - SLIT_GAP_MIN);
}

export function fanHalfPx(firstMinimum: number): number {
  const half = Math.abs(finiteNumber(firstMinimum, 1)) * PX_PER_MM;
  const maxHalf = GRAPH_RIGHT - CENTER_X - FAN_PAD;
  return clamp(half, SLIT_GAP_MAX, maxHalf);
}

export function samplesFor(params: SingleSlitParams): DiffractionSample[] {
  const { lambda, slitWidth, distance } = params;
  const last = SAMPLE_COUNT - 1;
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const x = DETECTOR_MIN + ((DETECTOR_MAX - DETECTOR_MIN) * index) / last;
    return {
      x,
      intensity: diffractionIntensity(x, lambda, slitWidth, distance)
    };
  });
}

const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄'] as const;

export function graphTickLabel(order: number): string {
  if (order === 0) return '0';
  const sign = order < 0 ? '₋' : '';
  const index = Math.min(SUBSCRIPTS.length - 1, Math.abs(order));
  return `x${sign}${SUBSCRIPTS[index]}`;
}

export function graphTickOrders(firstMinimum: number): number[] {
  const first = Math.abs(finiteNumber(firstMinimum, 0));
  if (!(first > 0)) return [0];
  const spacing = first * PX_PER_MM;
  const maxOrder = Math.min(
    GRAPH_TICK_MAX,
    Math.floor((DETECTOR_MAX - 0.4) / first)
  );
  const keep = spacing >= 32 ? maxOrder : 1;
  const orders = [0];
  for (let m = 1; m <= keep; m += 1) {
    orders.push(-m, m);
  }
  return orders;
}

export const hasFloatingReadout = readoutOccludesStage;

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  return measureStageLayout(canvas, FLOATING_OVERLAY_FALLBACK);
}

/**
 * 960×660 animation-only stage.
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
  let panelConstrained = false;
  if (
    typeof overlayTop === 'number' &&
    typeof overlayH === 'number' &&
    overlayH > 0
  ) {
    const panelTop = clamp(overlayTop, 0, height);
    const panelBottom = clamp(overlayTop + overlayH, 0, height);
    const clearTop = C.overlayClearTop;
    const aboveH = panelTop - gap - clearTop;
    const belowH = height - panelBottom - gap;
    const candidates: StagePose[] = [];

    // A docked-bottom/readout overlay must never cover the lower graph.
    if (aboveH > 1) {
      const fit = Math.min(width / boxW, aboveH / boxH);
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        candidates.push({
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: Math.max(0, (aboveH - stageH) / 2)
        });
      }
    }

    // A docked-top/readout overlay can instead reserve the space below it.
    if (belowH > 1) {
      const fit = Math.min(width / boxW, belowH / boxH);
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        candidates.push({
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: panelBottom + gap + Math.max(0, (belowH - stageH) / 2)
        });
      }
    }

    if (candidates.length > 0) {
      // Geometry safety takes priority over a larger but overlapping pose.
      chosen = candidates.reduce((best, candidate) =>
        candidate.fit > best.fit ? candidate : best
      );
      panelConstrained = true;
    }
  }

  if (!panelConstrained && chosen.fit < C.minReadableFit) {
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
  const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
    cssWidth,
    cssHeight,
    layout
  );
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * boxW),
    y: (cssY - offsetY) / (scale * boxH)
  };
}

export function pickDetectorHandle(nx: number, ny: number): SingleSlitHandle {
  const px = finiteNumber(nx, 0) * BASE_W;
  const py = finiteNumber(ny, 0) * BASE_H;
  if (px < 0 || px > BASE_W || py < 0 || py > BASE_H) return null;
  const nearScreen = Math.abs(py - SCREEN_Y) <= SCREEN_HEIGHT * 0.5 + HIT_PAD;
  const nearGraph = py >= GRAPH_TOP - HIT_PAD && py <= GRAPH_BOTTOM + HIT_PAD;
  const inX = px >= GRAPH_LEFT - HIT_PAD && px <= GRAPH_RIGHT + HIT_PAD;
  return (nearScreen || nearGraph) && inX ? 'detector' : null;
}

export function detectorXFromNorm(nx: number): number {
  return clamp(
    pxToX(finiteNumber(nx, 0.5) * BASE_W),
    DETECTOR_MIN,
    DETECTOR_MAX
  );
}

function makeState(params: SingleSlitParams, time: number): SingleSlitState {
  const { lambda, slitWidth, distance, detectorX, autoScan } = params;
  return {
    params: { ...params },
    time,
    angle: diffractionAngleDeg(detectorX, distance),
    intensity: diffractionIntensity(detectorX, lambda, slitWidth, distance),
    firstMinimum: firstMinimumMm(lambda, slitWidth, distance),
    centralWidth: centralWidthMm(lambda, slitWidth, distance),
    samples: samplesFor(params),
    status: autoScan ? '自动扫描' : '已暂停'
  };
}

export function createSingleSlitSim(initial: Partial<SingleSlitParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let direction = 1;

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoScan) return;
    const delta = finiteNumber(dt, 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    time += delta;
    let nextX = params.detectorX + direction * delta * SCAN_SPEED;
    if (nextX >= DETECTOR_MAX) {
      nextX = DETECTOR_MAX;
      direction = -1;
    } else if (nextX <= DETECTOR_MIN) {
      nextX = DETECTOR_MIN;
      direction = 1;
    }
    params = normalizeParams({ ...params, detectorX: nextX }, params);
  }

  return {
    getState(): SingleSlitState {
      return makeState(params, time);
    },
    getSnapshot(): SingleSlitState {
      return makeState(params, time);
    },
    getParams(): SingleSlitParams {
      return { ...params };
    },
    setParams(next: Partial<SingleSlitParams>): SingleSlitParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      advance(Math.max(0, finiteNumber(dt, 0)), false);
    },
    stepFrame(dt: number = FRAME_DT): void {
      advance(finiteNumber(dt, FRAME_DT), true);
    },
    pickHandle(x: number, y: number): SingleSlitHandle {
      return pickDetectorHandle(x, y);
    },
    moveHandle(
      handle: Exclude<SingleSlitHandle, null>,
      x: number,
      _y: number
    ): void {
      if (handle !== 'detector') return;
      params = normalizeParams(
        { ...params, detectorX: detectorXFromNorm(x), autoScan: false },
        params
      );
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      direction = 1;
    }
  };
}

export type { StageLayoutHint };

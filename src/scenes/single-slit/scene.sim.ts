import { clamp } from '../../core/math';

export type SingleSlitParams = {
  lambda: number;
  slitWidth: number;
  distance: number;
  detectorX: number;
  autoScan: boolean;
};

export type DiffractionSample = { x: number; intensity: number };

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

export const singleSlitConstants = {
  baseWidth: 1000,
  baseHeight: 700,
  fieldWidth: 680,
  panelWidth: 320,
  panelInset: 24,
  dividerY: 66,
  gridStep: 50,
  laserX: 340,
  laserY: 44,
  slitY: 128,
  screenY: 330,
  screenHeight: 62,
  graphTop: 430,
  graphBottom: 620,
  graphLeft: 56,
  graphRight: 650,
  graphAxisTick: 10,
  slitBarHeight: 8,
  slitGap: 18,
  screenBandStep: 4,
  detectorRadius: 14,
  detectorMin: -32,
  detectorMax: 32,
  detectorPixelsPerMm: 8,
  scanSpeed: 14,
  sampleCount: 161,
  graphRangeMultiplier: 4,
  lineDash: 6,
  cardWidth: 272,
  cardHeight: 138,
  formulaCardY: 92,
  formulaCardHeight: 124,
  readoutCardY: 232,
  readoutRowHeight: 32,
  calloutY: 450,
  calloutHeight: 126
} as const;

const DEFAULT_PARAMS: SingleSlitParams = {
  lambda: 670,
  slitWidth: 0.22,
  distance: 2.4,
  detectorX: 7.31,
  autoScan: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<SingleSlitParams>,
  previous: SingleSlitParams = DEFAULT_PARAMS
): SingleSlitParams {
  return {
    lambda: clamp(finite(input.lambda, previous.lambda), 400, 700),
    slitWidth: clamp(finite(input.slitWidth, previous.slitWidth), 0.08, 0.6),
    distance: clamp(finite(input.distance, previous.distance), 0.8, 4),
    detectorX: clamp(
      finite(input.detectorX, previous.detectorX),
      singleSlitConstants.detectorMin,
      singleSlitConstants.detectorMax
    ),
    autoScan: input.autoScan ?? previous.autoScan
  };
}

/** First dark fringe position x₁ = λL/a, returned in millimetres. */
export function firstMinimumMm(
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  return (lambda * distance) / slitWidth / 1000;
}

export function centralWidthMm(
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  return firstMinimumMm(lambda, slitWidth, distance) * 2;
}

/** Fraunhofer single-slit intensity I/I₀ = (sinβ/β)². */
export function diffractionIntensity(
  detectorX: number,
  lambda: number,
  slitWidth: number,
  distance: number
): number {
  const lambdaM = lambda * 1e-9;
  const slitM = slitWidth * 1e-3;
  const xM = detectorX * 1e-3;
  const sinTheta = xM / Math.sqrt(distance * distance + xM * xM);
  const beta = (Math.PI * slitM * sinTheta) / lambdaM;
  if (Math.abs(beta) < 1e-8) return 1;
  const ratio = Math.sin(beta) / beta;
  return clamp(ratio * ratio, 0, 1);
}

function angleDegrees(detectorX: number, distance: number): number {
  return (Math.atan((detectorX * 1e-3) / distance) * 180) / Math.PI;
}

function samplesFor(params: SingleSlitParams): DiffractionSample[] {
  const first = firstMinimumMm(
    params.lambda,
    params.slitWidth,
    params.distance
  );
  const range = Math.max(12, first * singleSlitConstants.graphRangeMultiplier);
  return Array.from({ length: singleSlitConstants.sampleCount }, (_, index) => {
    const x =
      -range + (range * 2 * index) / (singleSlitConstants.sampleCount - 1);
    return {
      x,
      intensity: diffractionIntensity(
        x,
        params.lambda,
        params.slitWidth,
        params.distance
      )
    };
  });
}

export function createSingleSlitSim(initial: Partial<SingleSlitParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let direction = 1;

  function getState(): SingleSlitState {
    const { lambda, slitWidth, distance, detectorX } = params;
    return {
      params: { ...params },
      time,
      angle: angleDegrees(detectorX, distance),
      intensity: diffractionIntensity(detectorX, lambda, slitWidth, distance),
      firstMinimum: firstMinimumMm(lambda, slitWidth, distance),
      centralWidth: centralWidthMm(lambda, slitWidth, distance),
      samples: samplesFor(params),
      status: params.autoScan ? '自动扫描' : '已暂停'
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): SingleSlitParams => ({ ...params }),
    setParams(next: Partial<SingleSlitParams>): SingleSlitParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoScan) return;
      const delta = Math.max(0, finite(dt, 0));
      time += delta;
      let nextX =
        params.detectorX + direction * delta * singleSlitConstants.scanSpeed;
      if (nextX >= singleSlitConstants.detectorMax) {
        nextX = singleSlitConstants.detectorMax;
        direction = -1;
      } else if (nextX <= singleSlitConstants.detectorMin) {
        nextX = singleSlitConstants.detectorMin;
        direction = 1;
      }
      params = normalize({ ...params, detectorX: nextX }, params);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      direction = 1;
    }
  };
}

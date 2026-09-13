import { clamp } from '../../core/math';

export type TirParams = {
  refractiveIndex: number;
  height: number;
  autoRun: boolean;
};
export type TirState = TirParams & {
  radius: number;
  criticalAngle: number;
  incidentAngle: number;
  refractedAngle: number | null;
  criticalHeight: number;
  status: '折射透出圆弧面' | '发生全反射';
  time: number;
};

export const tirConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  centerX: 400,
  centerY: 352,
  radius: 224,
  axisLeft: 60,
  axisRight: 780,
  indexMin: 1.1,
  indexMax: 2.4,
  heightMin: 0,
  heightMax: 10,
  radiusCm: 10,
  rayLength: 150,
  criticalLineLeft: 72,
  criticalLineRight: 760,
  timelinePeriod: 5
} as const;

const DEFAULTS: TirParams = {
  refractiveIndex: 1.5,
  height: 5.24,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(input: Partial<TirParams>, prev = DEFAULTS): TirParams {
  return {
    refractiveIndex: clamp(
      finite(input.refractiveIndex, prev.refractiveIndex),
      tirConstants.indexMin,
      tirConstants.indexMax
    ),
    height: clamp(
      finite(input.height, prev.height),
      tirConstants.heightMin,
      tirConstants.heightMax
    ),
    autoRun: typeof input.autoRun === 'boolean' ? input.autoRun : prev.autoRun
  };
}
function derive(params: TirParams, time: number): TirState {
  const radius = tirConstants.radiusCm;
  const criticalAngle = Math.asin(1 / params.refractiveIndex);
  const incidentAngle = Math.asin(clamp(params.height / radius, 0, 1));
  const sinRefracted = params.refractiveIndex * Math.sin(incidentAngle);
  const refractedAngle = sinRefracted <= 1 ? Math.asin(sinRefracted) : null;
  return {
    ...params,
    radius,
    criticalAngle,
    incidentAngle,
    refractedAngle,
    criticalHeight: radius / params.refractiveIndex,
    status: refractedAngle == null ? '发生全反射' : '折射透出圆弧面',
    time
  };
}

export function createTirSim(initial: Partial<TirParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): TirState {
      return derive(params, time);
    },
    getSnapshot(): TirState {
      return derive(params, time);
    },
    getParams(): TirParams {
      return { ...params };
    },
    setParams(next: Partial<TirParams>): TirParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const safeDt = Math.min(Math.max(finite(dt, 0), 0), 0.05);
      time = (time + safeDt) % tirConstants.timelinePeriod;
    }
  };
}

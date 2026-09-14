import { clamp } from '../../core/math';

export type GlassParams = {
  incidentAngle: number;
  refractiveIndex: number;
  thickness: number;
  autoRun: boolean;
};

export type GlassState = GlassParams & {
  incidentRadians: number;
  refractedRadians: number;
  lateralShift: number;
  speedRatio: number;
  phase: number;
  rayProgress: number;
  time: number;
};

export const glassConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  angleMin: 5,
  angleMax: 80,
  indexMin: 1.1,
  indexMax: 2.4,
  thicknessMin: 2,
  thicknessMax: 8,
  timelinePeriod: 4.8
} as const;

const DEFAULTS: GlassParams = {
  incidentAngle: 48,
  refractiveIndex: 1.5,
  thickness: 5,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(input: Partial<GlassParams>, prev = DEFAULTS): GlassParams {
  return {
    incidentAngle: clamp(
      finite(input.incidentAngle, prev.incidentAngle),
      glassConstants.angleMin,
      glassConstants.angleMax
    ),
    refractiveIndex: clamp(
      finite(input.refractiveIndex, prev.refractiveIndex),
      glassConstants.indexMin,
      glassConstants.indexMax
    ),
    thickness: clamp(
      finite(input.thickness, prev.thickness),
      glassConstants.thicknessMin,
      glassConstants.thicknessMax
    ),
    autoRun: typeof input.autoRun === 'boolean' ? input.autoRun : prev.autoRun
  };
}

function derive(params: GlassParams, time: number): GlassState {
  const incidentRadians = (params.incidentAngle * Math.PI) / 180;
  const sinR = clamp(Math.sin(incidentRadians) / params.refractiveIndex, 0, 1);
  const refractedRadians = Math.asin(sinR);
  const lateralShift =
    params.thickness *
    (Math.sin(incidentRadians - refractedRadians) / Math.cos(refractedRadians));
  const phase =
    (time % glassConstants.timelinePeriod) / glassConstants.timelinePeriod;
  return {
    ...params,
    incidentRadians,
    refractedRadians,
    lateralShift,
    speedRatio: 1 / params.refractiveIndex,
    phase,
    rayProgress: phase,
    time
  };
}

export function createGlassSim(initial: Partial<GlassParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): GlassState {
      return derive(params, time);
    },
    getSnapshot(): GlassState {
      return derive(params, time);
    },
    getParams(): GlassParams {
      return { ...params };
    },
    setParams(next: Partial<GlassParams>): GlassParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const safeDt = clamp(finite(dt, 0), 0, 0.05);
      time = (time + safeDt) % glassConstants.timelinePeriod;
    }
  };
}

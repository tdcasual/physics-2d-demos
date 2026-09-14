import { clamp } from '../../core/math';

export type FeederParams = {
  waterDepth: number;
  springConst: number;
  sensorGain: number;
  supplyVoltage: number;
  autoRun: boolean;
};

export type FeederState = FeederParams & {
  effectiveDepth: number;
  displacedVolume: number;
  buoyantForce: number;
  weight: number;
  springForce: number;
  displacement: number;
  sensorResistance: number;
  circuitCurrent: number;
  meterVoltage: number;
  phase: number;
  time: number;
};

export const feederConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  waterMin: 0,
  waterMax: 2.2,
  springMin: 8,
  springMax: 28,
  gainMin: 1.5,
  gainMax: 5,
  voltageMin: 6,
  voltageMax: 18,
  objectArea: 0.012,
  objectMass: 0.8,
  initialSpringForce: 2.2,
  fixedResistance: 4,
  sensorBaseResistance: 8,
  timelinePeriod: 5
} as const;

const DEFAULTS: FeederParams = {
  waterDepth: 0.9,
  springConst: 16,
  sensorGain: 3,
  supplyVoltage: 12,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<FeederParams>,
  prev = DEFAULTS
): FeederParams {
  return {
    waterDepth: clamp(
      finite(input.waterDepth, prev.waterDepth),
      feederConstants.waterMin,
      feederConstants.waterMax
    ),
    springConst: clamp(
      finite(input.springConst, prev.springConst),
      feederConstants.springMin,
      feederConstants.springMax
    ),
    sensorGain: clamp(
      finite(input.sensorGain, prev.sensorGain),
      feederConstants.gainMin,
      feederConstants.gainMax
    ),
    supplyVoltage: clamp(
      finite(input.supplyVoltage, prev.supplyVoltage),
      feederConstants.voltageMin,
      feederConstants.voltageMax
    ),
    autoRun: typeof input.autoRun === 'boolean' ? input.autoRun : prev.autoRun
  };
}

function derive(params: FeederParams, time: number): FeederState {
  const phase =
    (time % feederConstants.timelinePeriod) / feederConstants.timelinePeriod;
  const fillWave = params.autoRun
    ? 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
    : 1;
  const effectiveDepth = params.autoRun
    ? params.waterDepth * fillWave
    : params.waterDepth;
  const displacedVolume =
    feederConstants.objectArea * clamp(effectiveDepth, 0, 1.1);
  const buoyantForce = 1000 * 9.8 * displacedVolume;
  const weight = feederConstants.objectMass * 9.8;
  const springForce = Math.max(
    feederConstants.initialSpringForce,
    buoyantForce - weight
  );
  const displacement = clamp(
    (springForce - feederConstants.initialSpringForce) / params.springConst,
    0,
    0.8
  );
  const sensorResistance = clamp(
    feederConstants.sensorBaseResistance - params.sensorGain * displacement,
    1,
    12
  );
  const circuitCurrent =
    params.supplyVoltage / (sensorResistance + feederConstants.fixedResistance);
  const meterVoltage = circuitCurrent * feederConstants.fixedResistance;
  return {
    ...params,
    effectiveDepth,
    displacedVolume,
    buoyantForce,
    weight,
    springForce,
    displacement,
    sensorResistance,
    circuitCurrent,
    meterVoltage,
    phase,
    time
  };
}

export function createFeederSim(initial: Partial<FeederParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): FeederState {
      return derive(params, time);
    },
    getSnapshot(): FeederState {
      return derive(params, time);
    },
    getParams(): FeederParams {
      return { ...params };
    },
    setParams(next: Partial<FeederParams>): FeederParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time =
        (time + clamp(finite(dt, 0), 0, 0.05)) % feederConstants.timelinePeriod;
    }
  };
}

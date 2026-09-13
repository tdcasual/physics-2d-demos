import { clamp } from '../../core/math';

export type AlternatingCharge = 'electron' | 'positive';

export type AlternatingElectricFieldParams = {
  voltageAmplitude: number;
  period: number;
  plateGap: number;
  phaseOffset: number;
  charge: AlternatingCharge;
  autoRun: boolean;
  showFieldLines: boolean;
  showVelocityVector: boolean;
};

export type AlternatingElectricFieldState = {
  params: AlternatingElectricFieldParams;
  time: number;
  phase: number;
  fieldSign: 1 | -1;
  acceleration: number;
  velocity: number;
  position: number;
  fieldStrength: number;
  voltage: number;
  accelerationMagnitude: number;
  velocityScale: number;
  positionScale: number;
  stage: 'positive' | 'negative';
};

export const alternatingElectricFieldConstants = {
  baseWidth: 1200,
  baseHeight: 820,
  fieldWidth: 790,
  panelX: 790,
  panelWidth: 410,
  panelInset: 24,
  plateLeft: 178,
  plateRight: 650,
  plateTop: 142,
  plateBottom: 292,
  axisY: 218,
  graphLeft: 58,
  graphWidth: 684,
  graphTop: 334,
  graphHeight: 116,
  graphGap: 16,
  displayDuration: 5,
  titleY: 38,
  panelRuleY: 72,
  metricsCardY: 96,
  metricsCardHeight: 300,
  formulaCardY: 420,
  formulaCardHeight: 258,
  defaultVoltageAmplitude: 60,
  defaultPeriod: 2,
  defaultPlateGap: 10,
  defaultPhaseOffset: 0,
  voltageAmplitudeMin: 20,
  voltageAmplitudeMax: 120,
  periodMin: 1,
  periodMax: 4,
  plateGapMin: 6,
  plateGapMax: 20,
  phaseOffsetMin: 0,
  phaseOffsetMax: 0.5,
  accelerationFactor: 2,
  positionScale: 7,
  cardRadius: 12
} as const;

const DEFAULTS: AlternatingElectricFieldParams = {
  voltageAmplitude: alternatingElectricFieldConstants.defaultVoltageAmplitude,
  period: alternatingElectricFieldConstants.defaultPeriod,
  plateGap: alternatingElectricFieldConstants.defaultPlateGap,
  phaseOffset: alternatingElectricFieldConstants.defaultPhaseOffset,
  charge: 'electron',
  autoRun: true,
  showFieldLines: true,
  showVelocityVector: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<AlternatingElectricFieldParams>,
  previous = DEFAULTS
): AlternatingElectricFieldParams {
  return {
    voltageAmplitude: clamp(
      finite(input.voltageAmplitude, previous.voltageAmplitude),
      alternatingElectricFieldConstants.voltageAmplitudeMin,
      alternatingElectricFieldConstants.voltageAmplitudeMax
    ),
    period: clamp(
      finite(input.period, previous.period),
      alternatingElectricFieldConstants.periodMin,
      alternatingElectricFieldConstants.periodMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      alternatingElectricFieldConstants.plateGapMin,
      alternatingElectricFieldConstants.plateGapMax
    ),
    phaseOffset: clamp(
      finite(input.phaseOffset, previous.phaseOffset),
      alternatingElectricFieldConstants.phaseOffsetMin,
      alternatingElectricFieldConstants.phaseOffsetMax
    ),
    charge: input.charge === 'positive' ? 'positive' : previous.charge,
    autoRun: input.autoRun ?? previous.autoRun,
    showFieldLines: input.showFieldLines ?? previous.showFieldLines,
    showVelocityVector: input.showVelocityVector ?? previous.showVelocityVector
  };
}

function signedField(phase: number): 1 | -1 {
  return phase < 0.5 ? 1 : -1;
}

type AlternatingCoreParams = Pick<
  AlternatingElectricFieldParams,
  'voltageAmplitude' | 'period' | 'plateGap' | 'phaseOffset' | 'charge'
>;

function accelerationSign(
  params: AlternatingCoreParams,
  phase: number
): 1 | -1 {
  const field = signedField(phase);
  return params.charge === 'positive' ? field : field === 1 ? -1 : 1;
}

function integrate(
  params: AlternatingCoreParams,
  duration: number
): { position: number; velocity: number } {
  let position = 0;
  let velocity = 0;
  let elapsed = 0;
  let phaseTime = params.phaseOffset * params.period;
  const accelerationMagnitude =
    (alternatingElectricFieldConstants.accelerationFactor *
      params.voltageAmplitude) /
    params.plateGap;
  const halfPeriod = params.period / 2;
  while (elapsed < duration - 1e-9) {
    const wrapped =
      ((phaseTime % params.period) + params.period) % params.period;
    const toSwitch = halfPeriod - (wrapped % halfPeriod);
    const dt = Math.min(duration - elapsed, Math.max(1e-6, toSwitch));
    const phase = wrapped / params.period;
    const acceleration =
      accelerationSign(params, phase) * accelerationMagnitude;
    position += velocity * dt + 0.5 * acceleration * dt * dt;
    velocity += acceleration * dt;
    elapsed += dt;
    phaseTime += dt;
  }
  return { position, velocity };
}

export function alternatingElectricFieldSample(
  params: Pick<
    AlternatingElectricFieldParams,
    'voltageAmplitude' | 'period' | 'plateGap' | 'phaseOffset' | 'charge'
  >,
  time: number
) {
  const normalizedTime = Math.max(0, finite(time, 0));
  const phase =
    (((params.phaseOffset + normalizedTime / params.period) % 1) + 1) % 1;
  const fieldSign = signedField(phase);
  const accelerationMagnitude =
    (alternatingElectricFieldConstants.accelerationFactor *
      params.voltageAmplitude) /
    params.plateGap;
  const result = integrate(params, normalizedTime);
  return {
    phase,
    fieldSign,
    acceleration: accelerationSign(params, phase) * accelerationMagnitude,
    velocity: result.velocity,
    position: result.position,
    fieldStrength: params.voltageAmplitude / params.plateGap,
    voltage: fieldSign * params.voltageAmplitude,
    accelerationMagnitude,
    velocityScale: (accelerationMagnitude * params.period) / 2,
    positionScale: alternatingElectricFieldConstants.positionScale
  };
}

export function createAlternatingElectricFieldSim(
  initial: Partial<AlternatingElectricFieldParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): AlternatingElectricFieldState {
    const elapsed = time % alternatingElectricFieldConstants.displayDuration;
    const sample = alternatingElectricFieldSample(params, elapsed);
    return {
      params: { ...params },
      time: elapsed,
      ...sample,
      stage: sample.fieldSign === 1 ? 'positive' : 'negative'
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): AlternatingElectricFieldParams => ({ ...params }),
    setParams(
      next: Partial<AlternatingElectricFieldParams>
    ): AlternatingElectricFieldParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

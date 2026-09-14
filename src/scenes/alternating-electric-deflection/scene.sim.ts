import { clamp } from '../../core/math';

export type DeflectionCharge = 'positive' | 'negative';

export type AlternatingElectricDeflectionParams = {
  voltageAmplitude: number;
  period: number;
  plateGap: number;
  flightDuration: number;
  releasePhase: number;
  charge: DeflectionCharge;
  autoRun: boolean;
  showVectors: boolean;
  showGhosts: boolean;
};

export type DeflectionPoint = {
  time: number;
  x: number;
  y: number;
  velocityY: number;
  voltage: number;
};

export type AlternatingElectricDeflectionState = {
  params: AlternatingElectricDeflectionParams;
  time: number;
  phase: number;
  fieldSign: 1 | -1;
  voltage: number;
  acceleration: number;
  accelerationMagnitude: number;
  velocityY: number;
  velocityScale: number;
  positionY: number;
  positionScale: number;
  positionX: number;
  flightFraction: number;
  status: '持续偏转' | '往复振动' | '已出场';
  trajectory: DeflectionPoint[];
};

export const alternatingElectricDeflectionConstants = {
  baseWidth: 1280,
  baseHeight: 840,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  plateLeft: 146,
  plateRight: 810,
  plateTop: 126,
  plateBottom: 326,
  axisY: 226,
  axisStartX: 74,
  panelRuleY: 72,
  timelineY: 156,
  graphTop: 458,
  graphHeight: 160,
  graphGap: 18,
  graphLeft: 42,
  graphWidth: 390,
  displayDuration: 2,
  defaultVoltageAmplitude: 1,
  defaultPeriod: 1,
  defaultPlateGap: 1,
  defaultFlightDuration: 2,
  defaultReleasePhase: 0,
  voltageAmplitudeMin: 0.5,
  voltageAmplitudeMax: 2,
  periodMin: 0.5,
  periodMax: 2,
  plateGapMin: 0.8,
  plateGapMax: 2,
  flightDurationMin: 1,
  flightDurationMax: 3,
  releasePhaseMin: 0,
  releasePhaseMax: 1,
  accelerationFactor: 1,
  cardRadius: 12
} as const;

const DEFAULTS: AlternatingElectricDeflectionParams = {
  voltageAmplitude:
    alternatingElectricDeflectionConstants.defaultVoltageAmplitude,
  period: alternatingElectricDeflectionConstants.defaultPeriod,
  plateGap: alternatingElectricDeflectionConstants.defaultPlateGap,
  flightDuration: alternatingElectricDeflectionConstants.defaultFlightDuration,
  releasePhase: alternatingElectricDeflectionConstants.defaultReleasePhase,
  charge: 'positive',
  autoRun: true,
  showVectors: true,
  showGhosts: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<AlternatingElectricDeflectionParams>,
  previous = DEFAULTS
): AlternatingElectricDeflectionParams {
  return {
    voltageAmplitude: clamp(
      finite(input.voltageAmplitude, previous.voltageAmplitude),
      alternatingElectricDeflectionConstants.voltageAmplitudeMin,
      alternatingElectricDeflectionConstants.voltageAmplitudeMax
    ),
    period: clamp(
      finite(input.period, previous.period),
      alternatingElectricDeflectionConstants.periodMin,
      alternatingElectricDeflectionConstants.periodMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      alternatingElectricDeflectionConstants.plateGapMin,
      alternatingElectricDeflectionConstants.plateGapMax
    ),
    flightDuration: clamp(
      finite(input.flightDuration, previous.flightDuration),
      alternatingElectricDeflectionConstants.flightDurationMin,
      alternatingElectricDeflectionConstants.flightDurationMax
    ),
    releasePhase: clamp(
      finite(input.releasePhase, previous.releasePhase),
      alternatingElectricDeflectionConstants.releasePhaseMin,
      alternatingElectricDeflectionConstants.releasePhaseMax
    ),
    charge: input.charge === 'negative' ? 'negative' : 'positive',
    autoRun: input.autoRun ?? previous.autoRun,
    showVectors: input.showVectors ?? previous.showVectors,
    showGhosts: input.showGhosts ?? previous.showGhosts
  };
}

function fieldSignAt(time: number, period: number): 1 | -1 {
  const phase = (((time / period) % 1) + 1) % 1;
  return phase < 0.5 ? 1 : -1;
}

function accelerationSign(
  params: AlternatingElectricDeflectionParams,
  fieldSign: 1 | -1
): 1 | -1 {
  return params.charge === 'positive' ? fieldSign : fieldSign === 1 ? -1 : 1;
}

function integrate(params: AlternatingElectricDeflectionParams, time: number) {
  const duration = clamp(time, 0, params.flightDuration);
  const accelerationMagnitude =
    (alternatingElectricDeflectionConstants.accelerationFactor *
      params.voltageAmplitude) /
    params.plateGap;
  const halfPeriod = params.period / 2;
  let elapsed = 0;
  let y = 0;
  let velocityY = 0;
  while (elapsed < duration - 1e-9) {
    const phaseTime = params.releasePhase * params.period + elapsed;
    const remainder =
      ((phaseTime % params.period) + params.period) % params.period;
    const untilSwitch = halfPeriod - (remainder % halfPeriod);
    const dt = Math.min(duration - elapsed, Math.max(1e-6, untilSwitch));
    const sign = accelerationSign(
      params,
      fieldSignAt(phaseTime, params.period)
    );
    const acceleration = sign * accelerationMagnitude;
    y += velocityY * dt + 0.5 * acceleration * dt * dt;
    velocityY += acceleration * dt;
    elapsed += dt;
  }
  return { y, velocityY, accelerationMagnitude };
}

export function alternatingElectricDeflectionSample(
  params: Pick<
    AlternatingElectricDeflectionParams,
    | 'voltageAmplitude'
    | 'period'
    | 'plateGap'
    | 'flightDuration'
    | 'releasePhase'
    | 'charge'
  >,
  time: number
) {
  const elapsed = Math.max(0, finite(time, 0));
  const periodTime = params.releasePhase * params.period + elapsed;
  const phase = (((periodTime / params.period) % 1) + 1) % 1;
  const fieldSign = fieldSignAt(periodTime, params.period);
  const integrated = integrate(
    params as AlternatingElectricDeflectionParams,
    elapsed
  );
  const flightFraction = clamp(elapsed / params.flightDuration, 0, 1);
  const velocityScale = (integrated.accelerationMagnitude * params.period) / 2;
  return {
    phase,
    fieldSign,
    voltage: fieldSign * params.voltageAmplitude,
    acceleration:
      accelerationSign(
        params as AlternatingElectricDeflectionParams,
        fieldSign
      ) * integrated.accelerationMagnitude,
    accelerationMagnitude: integrated.accelerationMagnitude,
    velocityY: integrated.velocityY,
    velocityScale,
    positionY: integrated.y,
    positionScale:
      integrated.accelerationMagnitude * params.period * params.period,
    positionX: flightFraction,
    flightFraction,
    status:
      elapsed >= params.flightDuration - 1e-9
        ? ('已出场' as const)
        : Math.abs(integrated.y) <
            0.12 *
              Math.max(
                1,
                integrated.accelerationMagnitude * params.period * params.period
              )
          ? ('往复振动' as const)
          : ('持续偏转' as const)
  };
}

function buildTrajectory(
  params: AlternatingElectricDeflectionParams
): DeflectionPoint[] {
  const points: DeflectionPoint[] = [];
  const count = 80;
  for (let index = 0; index <= count; index += 1) {
    const time = (params.flightDuration * index) / count;
    const sample = alternatingElectricDeflectionSample(params, time);
    points.push({
      time,
      x: sample.positionX,
      y: sample.positionY,
      velocityY: sample.velocityY,
      voltage: sample.voltage
    });
  }
  return points;
}

export function createAlternatingElectricDeflectionSim(
  initial: Partial<AlternatingElectricDeflectionParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): AlternatingElectricDeflectionState {
    const elapsed = Math.min(time, params.flightDuration);
    const sample = alternatingElectricDeflectionSample(params, elapsed);
    return {
      params: { ...params },
      time: elapsed,
      ...sample,
      trajectory: buildTrajectory(params)
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): AlternatingElectricDeflectionParams => ({ ...params }),
    setParams(
      next: Partial<AlternatingElectricDeflectionParams>
    ): AlternatingElectricDeflectionParams {
      params = normalize({ ...params, ...next }, params);
      time = Math.min(time, params.flightDuration);
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

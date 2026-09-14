import { clamp } from '../../core/math';

export type LaserSpeedParams = {
  velocity: number;
  interval: number;
  initialDistance: number;
  autoRun: boolean;
  showPulses: boolean;
  showVectors: boolean;
};

export type LaserPulseState = {
  emissionTime: number;
  hitTime: number;
  returnTime: number;
  hitDistance: number;
};

export type LaserSpeedState = {
  params: LaserSpeedParams;
  time: number;
  carDistance: number;
  pulse1: LaserPulseState;
  pulse2: LaserPulseState;
  inferredVelocity: number;
  realInterval: number;
  measuredDistance: number;
};

export const laserSpeedConstants = {
  baseWidth: 1200,
  baseHeight: 700,
  fieldWidth: 760,
  graphLeft: 820,
  graphRight: 1150,
  graphTop: 98,
  graphBottom: 390,
  roadLeft: 62,
  roadRight: 724,
  roadY: 214,
  roadHeight: 84,
  radarX: 82,
  carStartX: 112,
  distanceScale: 3.35,
  lightSpeed: 200,
  maxTime: 5,
  maxVelocity: 60,
  minVelocity: 5,
  minInterval: 0.4,
  maxInterval: 2.4,
  initialDistance: 100,
  panelY: 430,
  panelHeight: 112,
  formulaY: 566,
  formulaHeight: 96,
  dividerBottom: 412,
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: LaserSpeedParams = {
  velocity: 20,
  interval: 1,
  initialDistance: laserSpeedConstants.initialDistance,
  autoRun: true,
  showPulses: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return fallback;
}

function pulseFor(
  emissionTime: number,
  velocity: number,
  initialDistance: number
): LaserPulseState {
  const c = laserSpeedConstants.lightSpeed;
  const v = clamp(velocity, laserSpeedConstants.minVelocity, c * 0.7);
  const duration = (2 * (initialDistance + v * emissionTime)) / (c - v);
  const hitTime = emissionTime + duration / 2;
  return {
    emissionTime,
    hitTime,
    returnTime: emissionTime + duration,
    hitDistance: initialDistance + v * hitTime
  };
}

function normalize(
  input: Partial<LaserSpeedParams>,
  previous = DEFAULT_PARAMS
): LaserSpeedParams {
  return {
    velocity: clamp(
      finite(input.velocity, previous.velocity),
      laserSpeedConstants.minVelocity,
      laserSpeedConstants.maxVelocity
    ),
    interval: clamp(
      finite(input.interval, previous.interval),
      laserSpeedConstants.minInterval,
      laserSpeedConstants.maxInterval
    ),
    initialDistance: laserSpeedConstants.initialDistance,
    autoRun: asBoolean(input.autoRun, previous.autoRun),
    showPulses: asBoolean(input.showPulses, previous.showPulses),
    showVectors: asBoolean(input.showVectors, previous.showVectors)
  };
}

export function pulseDuration(
  emissionTime: number,
  velocity: number,
  initialDistance = laserSpeedConstants.initialDistance
): number {
  return (
    pulseFor(emissionTime, velocity, initialDistance).returnTime - emissionTime
  );
}

export function createLaserSpeedSim(initial: Partial<LaserSpeedParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): LaserSpeedState {
    const pulse1 = pulseFor(0, params.velocity, params.initialDistance);
    const pulse2 = pulseFor(
      params.interval,
      params.velocity,
      params.initialDistance
    );
    const realInterval = pulse2.hitTime - pulse1.hitTime;
    const measuredDistance = pulse2.hitDistance - pulse1.hitDistance;
    return {
      params: { ...params },
      time,
      carDistance: params.initialDistance + params.velocity * time,
      pulse1,
      pulse2,
      inferredVelocity:
        realInterval > 0 ? measuredDistance / realInterval : params.velocity,
      realInterval,
      measuredDistance
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): LaserSpeedParams => ({ ...params }),
    setParams(next: Partial<LaserSpeedParams>): LaserSpeedParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time = (time + delta) % laserSpeedConstants.maxTime;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

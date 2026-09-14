import { clamp } from '../../core/math';

export type PendulumParams = {
  length: number;
  gravity: number;
  mass: number;
  amplitude: number;
  autoRun: boolean;
  showForces: boolean;
  showComponents: boolean;
  photogateRunning: boolean;
};

export type PendulumState = PendulumParams & {
  time: number;
  phase: number;
  angleRad: number;
  angularVelocity: number;
  speed: number;
  tension: number;
  tangentialGravity: number;
  radialGravity: number;
  period: number;
  smallAngleValid: boolean;
  measurementCycles: number;
  measurementTime: number;
  measuredPeriod: number | null;
  measuredGravity: number | null;
  crossing: boolean;
};

export const pendulumConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  lengthMin: 0.3,
  lengthMax: 1.5,
  gravityMin: 1,
  gravityMax: 12,
  massMin: 0.05,
  massMax: 0.3,
  amplitudeMin: 1,
  amplitudeMax: 12,
  defaultLength: 0.8,
  defaultGravity: 9.8,
  defaultMass: 0.1,
  defaultAmplitude: 5,
  rulerTop: 126,
  rulerBottom: 624,
  pivotX: 680,
  pivotY: 142,
  lengthPixelsPerMeter: 430,
  bobRadius: 24,
  timelinePeriod: 8
} as const;

const DEFAULTS: PendulumParams = {
  length: pendulumConstants.defaultLength,
  gravity: pendulumConstants.defaultGravity,
  mass: pendulumConstants.defaultMass,
  amplitude: pendulumConstants.defaultAmplitude,
  autoRun: true,
  showForces: true,
  showComponents: false,
  photogateRunning: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<PendulumParams>,
  previous = DEFAULTS
): PendulumParams {
  return {
    length: clamp(
      finite(input.length, previous.length),
      pendulumConstants.lengthMin,
      pendulumConstants.lengthMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      pendulumConstants.gravityMin,
      pendulumConstants.gravityMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      pendulumConstants.massMin,
      pendulumConstants.massMax
    ),
    amplitude: clamp(
      finite(input.amplitude, previous.amplitude),
      pendulumConstants.amplitudeMin,
      pendulumConstants.amplitudeMax
    ),
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun,
    showForces:
      typeof input.showForces === 'boolean'
        ? input.showForces
        : previous.showForces,
    showComponents:
      typeof input.showComponents === 'boolean'
        ? input.showComponents
        : previous.showComponents,
    photogateRunning:
      typeof input.photogateRunning === 'boolean'
        ? input.photogateRunning
        : previous.photogateRunning
  };
}

export function createPendulumSim(initial: Partial<PendulumParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let measurementCycles = 0;
  let measurementTime = 0;
  let measuredPeriod: number | null = null;
  let measuredGravity: number | null = null;
  let firstCrossingAt: number | null = null;
  let lastCrossingAt: number | null = null;
  let crossing = false;

  function periodFor(current: PendulumParams): number {
    return 2 * Math.PI * Math.sqrt(current.length / current.gravity);
  }

  function derive(): PendulumState {
    const period = periodFor(params);
    const omega = (2 * Math.PI) / period;
    const amplitudeRad = (params.amplitude * Math.PI) / 180;
    const angleRad = amplitudeRad * Math.cos(omega * time);
    const angularVelocity = -amplitudeRad * omega * Math.sin(omega * time);
    const speed = Math.abs(params.length * angularVelocity);
    const radialGravity = params.mass * params.gravity * Math.cos(angleRad);
    const tangentialGravity =
      -params.mass * params.gravity * Math.sin(angleRad);
    const tension = Math.max(
      0,
      radialGravity + (params.mass * speed * speed) / params.length
    );
    const phase = (((time % period) + period) % period) / period;
    const smallAngleValid = params.amplitude <= 5;
    return {
      ...params,
      time,
      phase,
      angleRad,
      angularVelocity,
      speed,
      tension,
      tangentialGravity,
      radialGravity,
      period,
      smallAngleValid,
      measurementCycles,
      measurementTime,
      measuredPeriod,
      measuredGravity,
      crossing
    };
  }

  function resetMeasurement(): void {
    params = { ...params, photogateRunning: false };
    measurementCycles = 0;
    measurementTime = 0;
    measuredPeriod = null;
    measuredGravity = null;
    firstCrossingAt = null;
    lastCrossingAt = null;
    crossing = false;
  }

  return {
    getState(): PendulumState {
      return derive();
    },
    getSnapshot(): PendulumState {
      return derive();
    },
    getParams(): PendulumParams {
      return { ...params };
    },
    setParams(next: Partial<PendulumParams>): PendulumParams {
      const wasRunning = params.photogateRunning;
      params = normalize({ ...params, ...next }, params);
      if (next.photogateRunning === false && wasRunning) resetMeasurement();
      return { ...params };
    },
    startPhotogate(): void {
      resetMeasurement();
      params = { ...params, photogateRunning: true };
    },
    resetMeasurement,
    resetSmallAngle(): void {
      params = { ...params, amplitude: 5 };
    },
    step(dt: number): void {
      crossing = false;
      if (!params.autoRun) return;
      const safeDt = clamp(finite(dt, 0), 0, 0.05);
      if (safeDt <= 0) return;
      const before = derive();
      time += safeDt;
      const after = derive();
      if (
        params.photogateRunning &&
        before.angleRad < 0 &&
        after.angleRad >= 0 &&
        after.angularVelocity > 0
      ) {
        crossing = true;
        const fraction = before.angleRad / (before.angleRad - after.angleRad);
        const crossingAt = time - safeDt * clamp(fraction, 0, 1);
        if (firstCrossingAt === null) {
          firstCrossingAt = crossingAt;
          measurementCycles = 1;
        } else {
          lastCrossingAt = crossingAt;
          measurementCycles += 1;
        }
        if (firstCrossingAt !== null && lastCrossingAt !== null) {
          // The ideal model has a known analytic period. Use it for the
          // displayed averaged interval so the photogate readout is not
          // biased by the animation's 50 ms frame quantisation.
          measuredPeriod = periodFor(params);
          measurementTime = measuredPeriod * Math.max(1, measurementCycles - 1);
          measuredGravity =
            (4 * Math.PI * Math.PI * params.length) /
            (measuredPeriod * measuredPeriod);
        }
      }
      if (
        params.photogateRunning &&
        firstCrossingAt !== null &&
        lastCrossingAt === null
      )
        measurementTime = Math.max(0, time - firstCrossingAt);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      resetMeasurement();
    }
  };
}

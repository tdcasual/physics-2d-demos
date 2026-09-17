import { clamp } from '../../core/math';

export type ProjectileComponentsParams = {
  speed: number;
  initialHeight: number;
  gravity: number;
  samplePeriod: number;
  showTrajectory: boolean;
  showVectors: boolean;
  showShadows: boolean;
  showStrobe: boolean;
};

export type ProjectileComponentsPoint = {
  index: number;
  time: number;
  x: number;
  verticalDisplacement: number;
  height: number;
  vy: number;
};

export type ProjectileComponentsState = {
  params: ProjectileComponentsParams;
  time: number;
  flightTime: number;
  x: number;
  height: number;
  verticalDisplacement: number;
  vx: number;
  vy: number;
  speed: number;
  landed: boolean;
  points: ProjectileComponentsPoint[];
};

export const projectileComponentsConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  padLeft: 44,
  padRight: 36,
  padTop: 28,
  padBottom: 36,
  gridMeters: 10,
  minXDomain: 100,
  trajectorySamples: 48,
  pointRadius: 7,
  shadowRadius: 6,
  currentRadius: 12,
  holdAfterLanding: 0.8,
  defaultSpeed: 15,
  defaultInitialHeight: 45,
  defaultGravity: 10,
  defaultSamplePeriod: 0.5,
  speedMin: 5,
  speedMax: 25,
  heightMin: 20,
  heightMax: 60,
  gravityMin: 5,
  gravityMax: 15,
  samplePeriodMin: 0.25,
  samplePeriodMax: 0.75
} as const;

const C = projectileComponentsConstants;

const DEFAULTS: ProjectileComponentsParams = {
  speed: C.defaultSpeed,
  initialHeight: C.defaultInitialHeight,
  gravity: C.defaultGravity,
  samplePeriod: C.defaultSamplePeriod,
  showTrajectory: true,
  showVectors: true,
  showShadows: true,
  showStrobe: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') {
      return true;
    }
    if (
      text === '0' ||
      text === 'false' ||
      text === 'off' ||
      text === 'no' ||
      text === ''
    ) {
      return false;
    }
  }
  return fallback;
}

function normalize(
  input: Partial<ProjectileComponentsParams>,
  previous = DEFAULTS
): ProjectileComponentsParams {
  return {
    speed: clamp(finite(input.speed, previous.speed), C.speedMin, C.speedMax),
    initialHeight: clamp(
      finite(input.initialHeight, previous.initialHeight),
      C.heightMin,
      C.heightMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      C.gravityMin,
      C.gravityMax
    ),
    samplePeriod: clamp(
      finite(input.samplePeriod, previous.samplePeriod),
      C.samplePeriodMin,
      C.samplePeriodMax
    ),
    showTrajectory: asBool(input.showTrajectory, previous.showTrajectory),
    showVectors: asBool(input.showVectors, previous.showVectors),
    showShadows: asBool(input.showShadows, previous.showShadows),
    showStrobe: asBool(input.showStrobe, previous.showStrobe)
  };
}

export function projectileFlightTime(
  initialHeight: number,
  gravity: number
): number {
  return Math.sqrt((2 * Math.max(0, initialHeight)) / Math.max(0.01, gravity));
}

export function projectileRange(params: {
  speed: number;
  initialHeight: number;
  gravity: number;
}): number {
  return (
    params.speed * projectileFlightTime(params.initialHeight, params.gravity)
  );
}

export function projectileComponentsPoint(
  params: Pick<
    ProjectileComponentsParams,
    'speed' | 'initialHeight' | 'gravity'
  >,
  time: number,
  index = 0
): ProjectileComponentsPoint {
  const safeTime = Math.max(0, time);
  const verticalDisplacement = 0.5 * params.gravity * safeTime * safeTime;
  return {
    index,
    time: safeTime,
    x: params.speed * safeTime,
    verticalDisplacement,
    height: Math.max(0, params.initialHeight - verticalDisplacement),
    vy: params.gravity * safeTime
  };
}

/** Inclusive sample instants: 0, Δt, 2Δt, … and a landing sample when Δt does not divide T. */
export function strobeTimes(flightTime: number, period: number): number[] {
  const duration = Math.max(0, flightTime);
  const step = Math.max(1e-6, period);
  const times: number[] = [];
  const count = Math.floor(duration / step + 1e-9);
  for (let index = 0; index <= count; index += 1) {
    times.push(index * step);
  }
  if (times.length === 0) times.push(0);
  const last = times[times.length - 1] ?? 0;
  if (duration - last > 1e-6) times.push(duration);
  else times[times.length - 1] = duration;
  return times;
}

export function formatFixed(value: number, digits = 1): string {
  const threshold = 0.5 * 10 ** -digits;
  if (!Number.isFinite(value) || Math.abs(value) < threshold) {
    return (0).toFixed(digits);
  }
  return value.toFixed(digits);
}

export function createProjectileComponentsSim(
  initial: Partial<ProjectileComponentsParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function flightTime(): number {
    return projectileFlightTime(params.initialHeight, params.gravity);
  }

  function getState(): ProjectileComponentsState {
    const total = flightTime();
    const currentTime = Math.min(total, Math.max(0, time));
    const current = projectileComponentsPoint(params, currentTime);
    const points = strobeTimes(total, params.samplePeriod).map((stamp, index) =>
      projectileComponentsPoint(params, stamp, index)
    );
    return {
      params: { ...params },
      time: currentTime,
      flightTime: total,
      x: current.x,
      height: current.height,
      verticalDisplacement: current.verticalDisplacement,
      vx: params.speed,
      vy: current.vy,
      speed: Math.hypot(params.speed, current.vy),
      landed: currentTime >= total - 1e-9,
      points
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): ProjectileComponentsParams => ({ ...params }),
    setParams(
      next: Partial<ProjectileComponentsParams>
    ): ProjectileComponentsParams {
      const previous = params;
      params = normalize({ ...params, ...next }, params);
      if (
        previous.speed !== params.speed ||
        previous.initialHeight !== params.initialHeight ||
        previous.gravity !== params.gravity
      ) {
        time = 0;
      }
      return { ...params };
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
      const cycle = flightTime() + C.holdAfterLanding;
      if (time > cycle) time = 0;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

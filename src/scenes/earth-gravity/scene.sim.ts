import { clamp } from '../../core/math';

export type EarthGravityParams = {
  latitude: number;
  mass: number;
  autoRun: boolean;
  showForces: boolean;
  showComponents: boolean;
};

export type EarthGravityState = {
  params: EarthGravityParams;
  time: number;
  radius: number;
  gravitationalForce: number;
  centripetalForce: number;
  weight: number;
  angle: number;
  radialAcceleration: number;
  forceAngle: number;
};

export const earthGravityConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 790,
  panelWidth: 388,
  earthRadius: 6.37e6,
  surfaceG: 9.8,
  earthOmega: 7.292e-5,
  minLatitude: 0,
  maxLatitude: 90,
  defaultLatitude: 35.2,
  minMass: 0.5,
  maxMass: 5,
  defaultMass: 1,
  earthDrawRadius: 245,
  vectorScale: 24,
  panelTop: 22,
  panelBottom: 738,
  alphaArcRadius: 36,
  alphaArcScale: 12,
  degreesHalfTurn: 180,
  sliderInset: 48,
  sliderY: 266,
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: EarthGravityParams = {
  latitude: earthGravityConstants.defaultLatitude,
  mass: earthGravityConstants.defaultMass,
  autoRun: true,
  showForces: true,
  showComponents: true
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

function normalize(
  input: Partial<EarthGravityParams>,
  previous = DEFAULT_PARAMS
): EarthGravityParams {
  return {
    latitude: clamp(
      finite(input.latitude, previous.latitude),
      earthGravityConstants.minLatitude,
      earthGravityConstants.maxLatitude
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      earthGravityConstants.minMass,
      earthGravityConstants.maxMass
    ),
    autoRun: asBoolean(input.autoRun, previous.autoRun),
    showForces: asBoolean(input.showForces, previous.showForces),
    showComponents: asBoolean(input.showComponents, previous.showComponents)
  };
}

export function calculateEarthGravity(
  latitude: number,
  mass: number = earthGravityConstants.defaultMass
): Omit<EarthGravityState, 'params' | 'time'> {
  const theta = (clamp(latitude, 0, 90) * Math.PI) / 180;
  const m = Math.max(0, finite(mass, earthGravityConstants.defaultMass));
  const r = earthGravityConstants.earthRadius * Math.cos(theta);
  const fM = m * earthGravityConstants.surfaceG;
  const fC = m * earthGravityConstants.earthOmega ** 2 * r;
  const gx = -fM * Math.cos(theta) + fC;
  const gy = -fM * Math.sin(theta);
  const weight = Math.hypot(gx, gy);
  const dot = gx * (-fM * Math.cos(theta)) + gy * (-fM * Math.sin(theta));
  const angle =
    (Math.acos(clamp(dot / Math.max(fM * weight, 1e-9), -1, 1)) * 180) /
    Math.PI;
  return {
    radius: r,
    gravitationalForce: fM,
    centripetalForce: fC,
    weight,
    angle,
    radialAcceleration: fC / Math.max(m, 1e-9),
    forceAngle: angle
  };
}

export function createEarthGravitySim(
  initial: Partial<EarthGravityParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): EarthGravityState {
    return {
      params: { ...params },
      time,
      ...calculateEarthGravity(params.latitude, params.mass)
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): EarthGravityParams => ({ ...params }),
    setParams(next: Partial<EarthGravityParams>): EarthGravityParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time = (time + Math.max(0, finite(dt, 0))) % 100;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

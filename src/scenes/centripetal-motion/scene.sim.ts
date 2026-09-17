import { clamp } from '../../core/math';

export type CentripetalParams = {
  mass: number;
  radius: number;
  angularVelocity: number;
  autoRun: boolean;
};

export type CentripetalState = {
  params: CentripetalParams;
  time: number;
  angle: number;
  speed: number;
  centripetalAcceleration: number;
  centripetalForce: number;
  period: number;
  phase: number;
};

export type Vec2 = { x: number; y: number };

export const centripetalConstants = {
  baseWidth: 760,
  baseHeight: 760,
  centerX: 380,
  centerY: 380,
  radiusScale: 58,
  radiusMin: 1,
  radiusMax: 4,
  massMin: 0.5,
  massMax: 5,
  angularVelocityMin: 0.5,
  angularVelocityMax: 3,
  gridStep: 48,
  animationPeriod: 12,
  initialAngle: Math.PI * 1.08,
  defaultMass: 2,
  defaultRadius: 2.5,
  defaultAngularVelocity: 1.5,
  ballRadius: 16,
  hubRadius: 7,
  arrowHead: 11,
  markerSize: 24,
  markerMinPeek: 8,
  speedPxPerUnit: 18,
  forcePxPerUnit: 5,
  minVisibleArrow: 4,
  framePad: 18,
  labelGap: 16,
  labelMinBallGap: 26,
  forceClearance: 10,
  speedClearance: 22
} as const;

const C = centripetalConstants;

const DEFAULTS: CentripetalParams = {
  mass: C.defaultMass,
  radius: C.defaultRadius,
  angularVelocity: C.defaultAngularVelocity,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<CentripetalParams>,
  previous = DEFAULTS
): CentripetalParams {
  return {
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    radius: clamp(
      finite(input.radius, previous.radius),
      C.radiusMin,
      C.radiusMax
    ),
    angularVelocity: clamp(
      finite(input.angularVelocity, previous.angularVelocity),
      C.angularVelocityMin,
      C.angularVelocityMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function tangentialSpeed(params: CentripetalParams): number {
  return params.angularVelocity * params.radius;
}

export function centripetalAcceleration(params: CentripetalParams): number {
  return params.angularVelocity * params.angularVelocity * params.radius;
}

export function centripetalForce(params: CentripetalParams): number {
  return params.mass * centripetalAcceleration(params);
}

export function period(params: CentripetalParams): number {
  return (2 * Math.PI) / params.angularVelocity;
}

/**
 * Screen-space unit tangent for increasing angle.
 * Position is (cos θ, sin θ) with y down, so d/dθ = (−sin θ, cos θ).
 */
export function tangentUnit(angle: number): Vec2 {
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}

/** Screen-space unit inward radial, from the mass toward the origin. */
export function radialInwardUnit(angle: number): Vec2 {
  return { x: -Math.cos(angle), y: -Math.sin(angle) };
}

function derive(
  params: CentripetalParams,
  time: number,
  angle: number
): CentripetalState {
  return {
    params: { ...params },
    time,
    angle,
    speed: tangentialSpeed(params),
    centripetalAcceleration: centripetalAcceleration(params),
    centripetalForce: centripetalForce(params),
    period: period(params),
    phase: time / C.animationPeriod
  };
}

export function createCentripetalSim(initial: Partial<CentripetalParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let angle = C.initialAngle;
  return {
    getState: (): CentripetalState => derive(params, time, angle),
    getSnapshot: (): CentripetalState => derive(params, time, angle),
    getParams: (): CentripetalParams => ({ ...params }),
    setParams(next: Partial<CentripetalParams>): CentripetalParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = Math.max(0, finite(dt, 0));
      time += duration;
      angle += params.angularVelocity * duration;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      angle = C.initialAngle;
    }
  };
}

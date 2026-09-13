import { clamp } from '../../core/math';

export type OrbitModel = 'rope' | 'rod';
export type OrbitCriticalParams = {
  model: OrbitModel;
  bottomSpeed: number;
  radius: number;
  gravity: number;
  angle: number;
  autoRun: boolean;
  showVectors: boolean;
};
export type OrbitCriticalState = OrbitCriticalParams & {
  time: number;
  speed: number;
  normalForce: number;
  radialGravity: number;
  constraintForce: number;
  criticalBottomSpeed: number;
  criticalTopSpeed: number;
  status: string;
  x: number;
  y: number;
};

export const orbitCriticalConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  centerX: 410,
  centerY: 350,
  orbitRadius: 238,
  circleLeft: 150,
  circleRight: 670,
  circleTop: 112,
  circleBottom: 588,
  cardX: 40,
  cardY: 620,
  cardWidth: 740,
  cardHeight: 92,
  gridStep: 52,
  gravityMin: 1,
  gravityMax: 15,
  radiusMin: 0.5,
  radiusMax: 3,
  bottomSpeedMin: 0,
  bottomSpeedMax: 12,
  angleMin: -180,
  angleMax: 180,
  mass: 1,
  angleStep: 50,
  vectorScale: 16,
  animationPeriod: 16
} as const;
const DEG = Math.PI / 180;
const DEFAULTS: OrbitCriticalParams = {
  model: 'rope',
  bottomSpeed: 4.2,
  radius: 1.5,
  gravity: 9.8,
  angle: -50,
  autoRun: true,
  showVectors: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<OrbitCriticalParams>,
  previous = DEFAULTS
): OrbitCriticalParams {
  return {
    model:
      input.model === 'rod'
        ? 'rod'
        : input.model === 'rope'
          ? 'rope'
          : previous.model,
    bottomSpeed: clamp(
      finite(input.bottomSpeed, previous.bottomSpeed),
      orbitCriticalConstants.bottomSpeedMin,
      orbitCriticalConstants.bottomSpeedMax
    ),
    radius: clamp(
      finite(input.radius, previous.radius),
      orbitCriticalConstants.radiusMin,
      orbitCriticalConstants.radiusMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      orbitCriticalConstants.gravityMin,
      orbitCriticalConstants.gravityMax
    ),
    angle: clamp(
      finite(input.angle, previous.angle),
      orbitCriticalConstants.angleMin,
      orbitCriticalConstants.angleMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showVectors: input.showVectors ?? previous.showVectors
  };
}
function speedAt(params: OrbitCriticalParams, angle: number): number {
  return Math.sqrt(
    Math.max(
      0,
      params.bottomSpeed ** 2 -
        2 * params.gravity * params.radius * (1 + Math.cos(angle * DEG))
    )
  );
}
function criticalBottom(params: OrbitCriticalParams): number {
  return params.model === 'rope'
    ? Math.sqrt(5 * params.gravity * params.radius)
    : 0;
}
function position(params: OrbitCriticalParams): { x: number; y: number } {
  const angle = params.angle * DEG;
  return {
    x:
      orbitCriticalConstants.centerX +
      orbitCriticalConstants.orbitRadius * Math.sin(angle),
    y:
      orbitCriticalConstants.centerY -
      orbitCriticalConstants.orbitRadius * Math.cos(angle)
  };
}
export function createOrbitCriticalSim(
  initial: Partial<OrbitCriticalParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): OrbitCriticalState {
      const speed = speedAt(params, params.angle);
      const radialGravity =
        orbitCriticalConstants.mass *
        params.gravity *
        Math.cos(params.angle * DEG);
      const normalForce =
        (orbitCriticalConstants.mass * speed ** 2) / params.radius;
      const constraintForce = normalForce - radialGravity;
      const criticalTopSpeed = Math.sqrt(params.gravity * params.radius);
      const topConstraint =
        (orbitCriticalConstants.mass *
          (params.bottomSpeed ** 2 - 4 * params.gravity * params.radius)) /
          params.radius -
        orbitCriticalConstants.mass * params.gravity;
      const status =
        params.model === 'rope'
          ? topConstraint < 0
            ? '最高点将脱轨'
            : '安全通过'
          : constraintForce < 0
            ? '杆受压'
            : '杆受拉';
      const point = position(params);
      return {
        ...params,
        time,
        speed,
        normalForce,
        radialGravity,
        constraintForce,
        criticalBottomSpeed: criticalBottom(params),
        criticalTopSpeed,
        status,
        x: point.x,
        y: point.y
      };
    },
    getSnapshot() {
      return this.getState();
    },
    getParams(): OrbitCriticalParams {
      return { ...params };
    },
    setParams(next: Partial<OrbitCriticalParams>): OrbitCriticalParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const seconds = clamp(finite(dt, 0), 0, 0.05);
      params.angle += orbitCriticalConstants.angleStep * seconds;
      if (params.angle > orbitCriticalConstants.angleMax)
        params.angle = orbitCriticalConstants.angleMin;
      time = (time + seconds) % orbitCriticalConstants.animationPeriod;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

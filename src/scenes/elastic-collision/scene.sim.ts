import { clamp } from '../../core/math';

export type CollisionParams = {
  massA: number;
  massB: number;
  velocityA: number;
  velocityB: number;
  positionA: number;
  positionB: number;
  isPlaying: boolean;
};
export type CollisionState = CollisionParams & {
  momentumA: number;
  momentumB: number;
  totalMomentum: number;
  energyA: number;
  energyB: number;
  totalEnergy: number;
  relativeApproach: number;
  collided: boolean;
  collisionCount: number;
  time: number;
};

export const collisionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  axisY: 470,
  axisLeft: 72,
  axisRight: 772,
  xMin: -8,
  xMax: 8,
  ballRadius: 34,
  massMin: 1,
  massMax: 8,
  velocityMin: -8,
  velocityMax: 8
} as const;

const DEFAULTS: CollisionParams = {
  massA: 5,
  massB: 4,
  velocityA: 5,
  velocityB: -5,
  positionA: -5,
  positionB: 5,
  isPlaying: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<CollisionParams>,
  prev = DEFAULTS
): CollisionParams {
  return {
    massA: clamp(
      finite(input.massA, prev.massA),
      collisionConstants.massMin,
      collisionConstants.massMax
    ),
    massB: clamp(
      finite(input.massB, prev.massB),
      collisionConstants.massMin,
      collisionConstants.massMax
    ),
    velocityA: clamp(
      finite(input.velocityA, prev.velocityA),
      collisionConstants.velocityMin,
      collisionConstants.velocityMax
    ),
    velocityB: clamp(
      finite(input.velocityB, prev.velocityB),
      collisionConstants.velocityMin,
      collisionConstants.velocityMax
    ),
    positionA: clamp(
      finite(input.positionA, prev.positionA),
      collisionConstants.xMin,
      collisionConstants.xMax
    ),
    positionB: clamp(
      finite(input.positionB, prev.positionB),
      collisionConstants.xMin,
      collisionConstants.xMax
    ),
    isPlaying:
      typeof input.isPlaying === 'boolean' ? input.isPlaying : prev.isPlaying
  };
}

export function createCollisionSim(initial: Partial<CollisionParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let collided = false;
  let collisionCount = 0;
  function getState(): CollisionState {
    const momentumA = params.massA * params.velocityA;
    const momentumB = params.massB * params.velocityB;
    const energyA = 0.5 * params.massA * params.velocityA ** 2;
    const energyB = 0.5 * params.massB * params.velocityB ** 2;
    return {
      ...params,
      momentumA,
      momentumB,
      totalMomentum: momentumA + momentumB,
      energyA,
      energyB,
      totalEnergy: energyA + energyB,
      relativeApproach: params.velocityA - params.velocityB,
      collided,
      collisionCount,
      time
    };
  }
  function reset() {
    params = { ...DEFAULTS };
    time = 0;
    collided = false;
    collisionCount = 0;
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: () => ({ ...params }),
    setParams(next: Partial<CollisionParams>) {
      params = normalize({ ...params, ...next }, params);
      collided = false;
      collisionCount = 0;
      time = 0;
      return { ...params };
    },
    reset,
    step(dt: number) {
      if (!params.isPlaying) return;
      const safeDt = Math.min(Math.max(finite(dt, 0), 0), 0.05);
      params.positionA += params.velocityA * safeDt;
      params.positionB += params.velocityB * safeDt;
      const separation = params.positionB - params.positionA;
      if (separation <= 0.9 && params.velocityA > params.velocityB) {
        const uA = params.velocityA;
        const uB = params.velocityB;
        const mA = params.massA;
        const mB = params.massB;
        params.velocityA = ((mA - mB) * uA + 2 * mB * uB) / (mA + mB);
        params.velocityB = (2 * mA * uA + (mB - mA) * uB) / (mA + mB);
        const mid = (params.positionA + params.positionB) / 2;
        params.positionA = mid - 0.46;
        params.positionB = mid + 0.46;
        collided = true;
        collisionCount += 1;
      }
      if (
        params.positionA < collisionConstants.xMin ||
        params.positionA > collisionConstants.xMax
      )
        params.velocityA *= -1;
      if (
        params.positionB < collisionConstants.xMin ||
        params.positionB > collisionConstants.xMax
      )
        params.velocityB *= -1;
      params.positionA = clamp(
        params.positionA,
        collisionConstants.xMin,
        collisionConstants.xMax
      );
      params.positionB = clamp(
        params.positionB,
        collisionConstants.xMin,
        collisionConstants.xMax
      );
      time += safeDt;
    }
  };
}

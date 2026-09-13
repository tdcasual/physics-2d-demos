import { clamp } from '../../core/math';

export type BeltDirection = 'up' | 'down';
export type ReleaseTarget = 'bottom' | 'top';
export type ConveyorParams = {
  angle: number;
  beltSpeed: number;
  direction: BeltDirection;
  mu: number;
  blockMass: number;
  releaseTarget: ReleaseTarget;
  blockS: number;
  blockVelocity: number;
  placed: boolean;
  isPlaying: boolean;
};
export type ConveyorState = ConveyorParams & {
  acceleration: number;
  beltVelocity: number;
  relativeVelocity: number;
  friction: number;
  gravityComponent: number;
  normalForce: number;
  regime: 'sliding' | 'sticking' | 'stopped';
  status: string;
  time: number;
  trail: Array<{ t: number; v: number }>;
};

export const conveyorConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  beltStartX: 150,
  beltStartY: 590,
  beltEndX: 690,
  beltEndY: 270,
  beltLength: 8,
  gravity: 10,
  angleMin: 0,
  angleMax: 60,
  speedMin: 0,
  speedMax: 8,
  muMin: 0,
  muMax: 1.2,
  massMin: 0.2,
  massMax: 5
} as const;

const DEFAULTS: ConveyorParams = {
  angle: 30,
  beltSpeed: 4,
  direction: 'up',
  mu: 0.8,
  blockMass: 1,
  releaseTarget: 'bottom',
  blockS: 0,
  blockVelocity: 0,
  placed: true,
  isPlaying: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ConveyorParams>,
  previous = DEFAULTS
): ConveyorParams {
  const target =
    input.releaseTarget === 'top'
      ? 'top'
      : input.releaseTarget === 'bottom'
        ? 'bottom'
        : previous.releaseTarget;
  return {
    angle: clamp(
      finite(input.angle, previous.angle),
      conveyorConstants.angleMin,
      conveyorConstants.angleMax
    ),
    beltSpeed: clamp(
      finite(input.beltSpeed, previous.beltSpeed),
      conveyorConstants.speedMin,
      conveyorConstants.speedMax
    ),
    direction:
      input.direction === 'down'
        ? 'down'
        : input.direction === 'up'
          ? 'up'
          : previous.direction,
    mu: clamp(
      finite(input.mu, previous.mu),
      conveyorConstants.muMin,
      conveyorConstants.muMax
    ),
    blockMass: clamp(
      finite(input.blockMass, previous.blockMass),
      conveyorConstants.massMin,
      conveyorConstants.massMax
    ),
    releaseTarget: target,
    blockS: clamp(
      finite(input.blockS, previous.blockS),
      0,
      conveyorConstants.beltLength
    ),
    blockVelocity: finite(input.blockVelocity, previous.blockVelocity),
    placed: typeof input.placed === 'boolean' ? input.placed : previous.placed,
    isPlaying:
      typeof input.isPlaying === 'boolean'
        ? input.isPlaying
        : previous.isPlaying
  };
}

export function createConveyorSim(initial: Partial<ConveyorParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let trail: Array<{ t: number; v: number }> = [];

  function derive(): ConveyorState {
    const theta = (params.angle * Math.PI) / 180;
    const g = conveyorConstants.gravity;
    const gravityComponent = g * Math.sin(theta);
    const normalForce = params.blockMass * g * Math.cos(theta);
    const beltVelocity =
      (params.direction === 'up' ? 1 : -1) * params.beltSpeed;
    const relativeVelocity = params.blockVelocity - beltVelocity;
    const maxFriction = params.mu * normalForce;
    const requiredStatic = params.blockMass * gravityComponent;
    let acceleration = 0;
    let friction = 0;
    let regime: ConveyorState['regime'] = 'sliding';
    if (!params.placed) {
      regime = 'stopped';
    } else if (
      Math.abs(relativeVelocity) < 0.06 &&
      maxFriction >= requiredStatic
    ) {
      regime = 'sticking';
      params.blockVelocity = beltVelocity;
      acceleration = 0;
      friction = requiredStatic;
    } else {
      const frictionDirection = relativeVelocity < 0 ? 1 : -1;
      friction = frictionDirection * maxFriction;
      acceleration = friction / params.blockMass - gravityComponent;
    }
    let status =
      regime === 'sticking'
        ? '共速后相对静止'
        : regime === 'stopped'
          ? '等待释放'
          : '相对滑动';
    if (
      regime === 'sliding' &&
      Math.abs(relativeVelocity) < 0.06 &&
      maxFriction < requiredStatic
    ) {
      status = '静摩擦不足，继续下滑';
    }
    return {
      ...params,
      acceleration,
      beltVelocity,
      relativeVelocity,
      friction,
      gravityComponent,
      normalForce,
      regime,
      status,
      time,
      trail: trail.slice()
    };
  }

  return {
    getState: derive,
    getSnapshot: derive,
    getParams: () => ({ ...params }),
    setParams(next: Partial<ConveyorParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    release(target: ReleaseTarget = params.releaseTarget) {
      params = normalize(
        {
          ...params,
          releaseTarget: target,
          blockS: target === 'top' ? conveyorConstants.beltLength : 0,
          blockVelocity: 0,
          placed: true,
          isPlaying: true
        },
        params
      );
      time = 0;
      trail = [{ t: 0, v: 0 }];
    },
    placeAt(s: number) {
      params = normalize(
        { ...params, blockS: s, blockVelocity: 0, placed: true },
        params
      );
      time = 0;
      trail = [{ t: 0, v: 0 }];
    },
    reset() {
      params = { ...DEFAULTS };
      time = 0;
      trail = [];
    },
    step(dt: number) {
      if (!params.isPlaying || !params.placed) return;
      const safeDt = Math.min(Math.max(finite(dt, 0), 0), 0.05);
      const state = derive();
      const previousVelocity = params.blockVelocity;
      params.blockVelocity += state.acceleration * safeDt;
      params.blockS += params.blockVelocity * safeDt;
      if (params.blockS <= 0 || params.blockS >= conveyorConstants.beltLength) {
        params.blockS = clamp(params.blockS, 0, conveyorConstants.beltLength);
        params.blockVelocity = 0;
        params.isPlaying = false;
      }
      if (previousVelocity * params.blockVelocity < 0) params.blockVelocity = 0;
      time += safeDt;
      if (!trail.length || time - trail[trail.length - 1].t >= 0.05) {
        trail.push({ t: time, v: params.blockVelocity });
        if (trail.length > 120) trail.shift();
      }
    }
  };
}

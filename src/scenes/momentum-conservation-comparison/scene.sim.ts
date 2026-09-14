import { clamp } from '../../core/math';

export type MomentumScheme = 'chute' | 'airTrack' | 'pendulum';
export type MomentumCollision = 'elastic' | 'partial' | 'inelastic';

export type MomentumComparisonParams = {
  scheme: MomentumScheme;
  collision: MomentumCollision;
  massA: number;
  massB: number;
  velocityA: number;
  velocityB: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type MomentumComparisonState = MomentumComparisonParams & {
  time: number;
  collisionProgress: number;
  vA: number;
  vB: number;
  vAAfter: number;
  vBAfter: number;
  totalMomentumBefore: number;
  totalMomentumAfter: number;
  kineticEnergyBefore: number;
  kineticEnergyAfter: number;
  impulse: number;
  force: number;
  status: '碰撞前' | '碰撞中' | '碰撞后';
  measured: { labelA: string; valueA: number; labelB: string; valueB: number };
};

export const momentumComparisonConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  trackLeft: 96,
  trackRight: 794,
  trackY: 316,
  chutePivotX: 190,
  chutePivotY: 152,
  graphTop: 514,
  graphHeight: 150,
  defaultMassA: 2,
  defaultMassB: 1,
  defaultVelocityA: 1.5,
  defaultVelocityB: 0,
  massMin: 0.5,
  massMax: 4,
  velocityMin: -2,
  velocityMax: 2,
  collisionDuration: 0.2,
  collisionTime: 0.52,
  timeMax: 1,
  cardRadius: 12
} as const;

const DEFAULTS: MomentumComparisonParams = {
  scheme: 'chute',
  collision: 'elastic',
  massA: momentumComparisonConstants.defaultMassA,
  massB: momentumComparisonConstants.defaultMassB,
  velocityA: momentumComparisonConstants.defaultVelocityA,
  velocityB: momentumComparisonConstants.defaultVelocityB,
  autoRun: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MomentumComparisonParams>,
  previous = DEFAULTS
): MomentumComparisonParams {
  const scheme: MomentumScheme =
    input.scheme === 'airTrack' ||
    input.scheme === 'pendulum' ||
    input.scheme === 'chute'
      ? input.scheme
      : previous.scheme;
  const collision: MomentumCollision =
    input.collision === 'partial' ||
    input.collision === 'inelastic' ||
    input.collision === 'elastic'
      ? input.collision
      : previous.collision;
  return {
    scheme,
    collision,
    massA: clamp(
      finite(input.massA, previous.massA),
      momentumComparisonConstants.massMin,
      momentumComparisonConstants.massMax
    ),
    massB: clamp(
      finite(input.massB, previous.massB),
      momentumComparisonConstants.massMin,
      momentumComparisonConstants.massMax
    ),
    velocityA: clamp(
      finite(input.velocityA, previous.velocityA),
      momentumComparisonConstants.velocityMin,
      momentumComparisonConstants.velocityMax
    ),
    velocityB: clamp(
      finite(input.velocityB, previous.velocityB),
      momentumComparisonConstants.velocityMin,
      momentumComparisonConstants.velocityMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showVectors: input.showVectors ?? previous.showVectors
  };
}

function restitution(collision: MomentumCollision): number {
  return collision === 'elastic' ? 1 : collision === 'partial' ? 0.6 : 0;
}

export function calculateMomentumComparison(
  params: Pick<
    MomentumComparisonParams,
    'massA' | 'massB' | 'velocityA' | 'velocityB' | 'collision'
  >
) {
  const e = restitution(params.collision);
  const totalMass = params.massA + params.massB;
  const vAAfter =
    ((params.massA - e * params.massB) * params.velocityA +
      (1 + e) * params.massB * params.velocityB) /
    totalMass;
  const vBAfter =
    ((1 + e) * params.massA * params.velocityA +
      (params.massB - e * params.massA) * params.velocityB) /
    totalMass;
  const totalMomentumBefore =
    params.massA * params.velocityA + params.massB * params.velocityB;
  const totalMomentumAfter = params.massA * vAAfter + params.massB * vBAfter;
  const kineticEnergyBefore =
    0.5 * params.massA * params.velocityA ** 2 +
    0.5 * params.massB * params.velocityB ** 2;
  const kineticEnergyAfter =
    0.5 * params.massA * vAAfter ** 2 + 0.5 * params.massB * vBAfter ** 2;
  return {
    e,
    vAAfter,
    vBAfter,
    totalMomentumBefore,
    totalMomentumAfter,
    kineticEnergyBefore,
    kineticEnergyAfter
  };
}

export function momentumComparisonSample(
  params: Pick<
    MomentumComparisonParams,
    'massA' | 'massB' | 'velocityA' | 'velocityB' | 'collision'
  >,
  time: number
) {
  const t = clamp(finite(time, 0), 0, momentumComparisonConstants.timeMax);
  const result = calculateMomentumComparison(params);
  const start = momentumComparisonConstants.collisionTime;
  const phase = clamp(
    (t - start) / momentumComparisonConstants.collisionDuration,
    0,
    1
  );
  const smooth = phase * phase * (3 - 2 * phase);
  const vA = params.velocityA + (result.vAAfter - params.velocityA) * smooth;
  const vB = params.velocityB + (result.vBAfter - params.velocityB) * smooth;
  const force = phase > 0 && phase < 1 ? 16 * Math.sin(Math.PI * phase) : 0;
  const impulse =
    phase >= 1
      ? params.massA * (result.vAAfter - params.velocityA)
      : params.massA * (vA - params.velocityA);
  return {
    ...result,
    time: t,
    collisionProgress: phase,
    vA,
    vB,
    force,
    impulse,
    status:
      t < start
        ? ('碰撞前' as const)
        : t <= start + momentumComparisonConstants.collisionDuration
          ? ('碰撞中' as const)
          : ('碰撞后' as const)
  };
}

export function createMomentumComparisonSim(
  initial: Partial<MomentumComparisonParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): MomentumComparisonState {
    const sample = momentumComparisonSample(params, time);
    const measured =
      params.scheme === 'chute'
        ? {
            labelA: '入射球 OP',
            valueA: Math.abs(params.velocityA) * 26.7,
            labelB: '碰后球 OM/ON',
            valueB:
              Math.abs(sample.vAAfter) * 17.8 + Math.abs(sample.vBAfter) * 12.4
          }
        : params.scheme === 'airTrack'
          ? {
              labelA: '光电门 v₁',
              valueA: sample.vA,
              labelB: '光电门 v₂',
              valueB: sample.vB
            }
          : {
              labelA: '摆角换算 v₁',
              valueA: Math.abs(sample.vAAfter),
              labelB: '摆角换算 v₂',
              valueB: Math.abs(sample.vBAfter)
            };
    return {
      ...params,
      ...sample,
      measured
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): MomentumComparisonParams => ({ ...params }),
    setParams(
      next: Partial<MomentumComparisonParams>
    ): MomentumComparisonParams {
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

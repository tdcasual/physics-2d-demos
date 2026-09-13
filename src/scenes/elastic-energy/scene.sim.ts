import { clamp } from '../../core/math';

export type EnergyPreset = 'equal' | 'heavy-light' | 'light-heavy';
export type EnergyParams = {
  preset: EnergyPreset;
  massA: number;
  massB: number;
  velocityA: number;
  velocityB: number;
  positionA: number;
  positionB: number;
  isPlaying: boolean;
  slowMotion: boolean;
};
export type EnergyState = EnergyParams & {
  momentumA: number;
  momentumB: number;
  totalMomentum: number;
  energyA: number;
  energyB: number;
  potentialEnergy: number;
  totalEnergy: number;
  initialVelocityA: number;
  initialVelocityB: number;
  collisionTime: number | null;
  collided: boolean;
  collisionCount: number;
  time: number;
  centerOfMass: number;
};

export const energyConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  trackY: 302,
  centerLineTop: 154,
  timelineStart: 112,
  timelineEnd: 708,
  timelineY: 394,
  timelineTitleY: 342,
  timelineLabelY: 366,
  trackLeft: 68,
  trackRight: 760,
  xMin: -6,
  xMax: 6,
  ballRadius: 30,
  massMin: 1,
  massMax: 8,
  velocityMin: -8,
  velocityMax: 8,
  collisionGap: 0.84,
  initialSeparation: 0.84,
  positionScale: 48,
  velocityGraphLeft: 72,
  velocityGraphRight: 392,
  velocityGraphTop: 500,
  velocityGraphBottom: 686,
  energyGraphLeft: 450,
  energyGraphRight: 750,
  energyGraphTop: 500,
  energyGraphBottom: 686,
  graphForceMax: 8,
  graphEnergyMax: 16,
  gridStep: 48,
  animationPeriod: 8
} as const;

const PRESETS: Record<
  EnergyPreset,
  Omit<EnergyParams, 'preset' | 'isPlaying' | 'slowMotion'>
> = {
  equal: {
    massA: 1,
    massB: 1,
    velocityA: 4,
    velocityB: 0,
    positionA: -3.2,
    positionB: 1.2
  },
  'heavy-light': {
    massA: 3,
    massB: 1,
    velocityA: 4,
    velocityB: 1,
    positionA: -3.2,
    positionB: 1.2
  },
  'light-heavy': {
    massA: 1,
    massB: 3,
    velocityA: 4,
    velocityB: 0,
    positionA: -3.2,
    positionB: 1.2
  }
};
const DEFAULTS: EnergyParams = {
  preset: 'equal',
  ...PRESETS.equal,
  isPlaying: true,
  slowMotion: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<EnergyParams>,
  prev = DEFAULTS
): EnergyParams {
  const preset =
    input.preset === 'heavy-light' ||
    input.preset === 'light-heavy' ||
    input.preset === 'equal'
      ? input.preset
      : prev.preset;
  return {
    preset,
    massA: clamp(
      finite(input.massA, prev.massA),
      energyConstants.massMin,
      energyConstants.massMax
    ),
    massB: clamp(
      finite(input.massB, prev.massB),
      energyConstants.massMin,
      energyConstants.massMax
    ),
    velocityA: clamp(
      finite(input.velocityA, prev.velocityA),
      energyConstants.velocityMin,
      energyConstants.velocityMax
    ),
    velocityB: clamp(
      finite(input.velocityB, prev.velocityB),
      energyConstants.velocityMin,
      energyConstants.velocityMax
    ),
    positionA: clamp(
      finite(input.positionA, prev.positionA),
      energyConstants.xMin,
      energyConstants.xMax
    ),
    positionB: clamp(
      finite(input.positionB, prev.positionB),
      energyConstants.xMin,
      energyConstants.xMax
    ),
    isPlaying:
      typeof input.isPlaying === 'boolean' ? input.isPlaying : prev.isPlaying,
    slowMotion:
      typeof input.slowMotion === 'boolean' ? input.slowMotion : prev.slowMotion
  };
}

export function createEnergySim(initial: Partial<EnergyParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let collisionTime: number | null = null;
  let collided = false;
  let collisionCount = 0;
  let initialVelocityA = params.velocityA;
  let initialVelocityB = params.velocityB;
  function getState(): EnergyState {
    const momentumA = params.massA * params.velocityA;
    const momentumB = params.massB * params.velocityB;
    const energyA = 0.5 * params.massA * params.velocityA ** 2;
    const energyB = 0.5 * params.massB * params.velocityB ** 2;
    const totalEnergy = energyA + energyB;
    return {
      ...params,
      momentumA,
      momentumB,
      totalMomentum: momentumA + momentumB,
      energyA,
      energyB,
      potentialEnergy: 0,
      totalEnergy,
      initialVelocityA,
      initialVelocityB,
      collisionTime,
      collided,
      collisionCount,
      time,
      centerOfMass:
        (params.massA * params.positionA + params.massB * params.positionB) /
        (params.massA + params.massB)
    };
  }
  function reset() {
    const preset = params.preset;
    const slowMotion = params.slowMotion;
    params = normalize(
      { ...PRESETS[preset], preset, isPlaying: true, slowMotion },
      params
    );
    initialVelocityA = params.velocityA;
    initialVelocityB = params.velocityB;
    time = 0;
    collisionTime = null;
    collided = false;
    collisionCount = 0;
  }
  function setPreset(preset: EnergyPreset) {
    params = normalize(
      {
        ...PRESETS[preset],
        preset,
        isPlaying: true,
        slowMotion: params.slowMotion
      },
      params
    );
    initialVelocityA = params.velocityA;
    initialVelocityB = params.velocityB;
    time = 0;
    collisionTime = null;
    collided = false;
    collisionCount = 0;
    return { ...params };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: () => ({ ...params }),
    setParams(next: Partial<EnergyParams>) {
      params = normalize({ ...params, ...next }, params);
      initialVelocityA = params.velocityA;
      initialVelocityB = params.velocityB;
      time = 0;
      collisionTime = null;
      collided = false;
      collisionCount = 0;
      return { ...params };
    },
    setPreset,
    reset,
    step(dt: number) {
      if (!params.isPlaying) return;
      const safeDt =
        Math.min(Math.max(finite(dt, 0), 0), 0.05) *
        (params.slowMotion ? 0.25 : 1);
      params.positionA += params.velocityA * safeDt;
      params.positionB += params.velocityB * safeDt;
      const separation = params.positionB - params.positionA;
      if (
        separation <= energyConstants.collisionGap &&
        params.velocityA > params.velocityB
      ) {
        const uA = params.velocityA;
        const uB = params.velocityB;
        const mA = params.massA;
        const mB = params.massB;
        params.velocityA = ((mA - mB) * uA + 2 * mB * uB) / (mA + mB);
        params.velocityB = (2 * mA * uA + (mB - mA) * uB) / (mA + mB);
        const mid = (params.positionA + params.positionB) / 2;
        params.positionA = mid - energyConstants.initialSeparation / 2;
        params.positionB = mid + energyConstants.initialSeparation / 2;
        collisionTime = time;
        collided = true;
        collisionCount += 1;
      }
      if (
        params.positionA < energyConstants.xMin ||
        params.positionA > energyConstants.xMax
      )
        params.velocityA *= -1;
      if (
        params.positionB < energyConstants.xMin ||
        params.positionB > energyConstants.xMax
      )
        params.velocityB *= -1;
      params.positionA = clamp(
        params.positionA,
        energyConstants.xMin,
        energyConstants.xMax
      );
      params.positionB = clamp(
        params.positionB,
        energyConstants.xMin,
        energyConstants.xMax
      );
      time += safeDt;
    }
  };
}

export { PRESETS };

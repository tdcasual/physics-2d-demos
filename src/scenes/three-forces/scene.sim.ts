import { clamp } from '../../core/math';

export type ThreeForcesTab = 'gravity' | 'friction' | 'spring';
export type ThreeForcesParams = {
  tab: ThreeForcesTab;
  mass: number;
  inclineAngle: number;
  mu: number;
  springX: number;
  autoRun: boolean;
  showComponents: boolean;
};
export type ThreeForcesVector = { x: number; y: number };
export type ThreeForcesState = {
  params: ThreeForcesParams;
  time: number;
  gravity: number;
  normal: number;
  downslope: number;
  perpendicular: number;
  frictionRequired: number;
  frictionMax: number;
  friction: number;
  netForce: number;
  acceleration: number;
  springForce: number;
  status: string;
  blockOffset: number;
  gravityVector: ThreeForcesVector;
  normalVector: ThreeForcesVector;
  frictionVector: ThreeForcesVector;
};

const G = 10;
const SPRING_K = 40;
const DEG = Math.PI / 180;

export const threeForcesConstants = {
  baseWidth: 900,
  baseHeight: 660,
  fieldWidth: 650,
  panelWidth: 236,
  panelInset: 24,
  blockX: 310,
  blockY: 430,
  blockWidth: 76,
  blockHeight: 48,
  planeStartX: 80,
  planeEndX: 610,
  planeBaseY: 505,
  planeTopY: 190,
  titleY: 60,
  formulaTop: 118,
  formulaHeight: 84,
  statusTop: 220,
  statusHeight: 68,
  valuesTop: 304,
  valuesHeight: 248,
  valuesStartY: 338,
  valuesRowGap: 34,
  gridStep: 50,
  vectorScale: 4,
  springTop: 288,
  springLeft: 116,
  springWidth: 360,
  groundY: 430
} as const;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function tab(value: unknown): ThreeForcesTab {
  return value === 'friction' || value === 'spring' ? value : 'gravity';
}
function normalize(
  input: Partial<ThreeForcesParams>,
  prev?: ThreeForcesParams
): ThreeForcesParams {
  return {
    tab: tab(input.tab ?? prev?.tab),
    mass: clamp(finite(input.mass, prev?.mass ?? 3), 1, 6),
    inclineAngle: clamp(
      finite(input.inclineAngle, prev?.inclineAngle ?? 30),
      10,
      55
    ),
    mu: clamp(finite(input.mu, prev?.mu ?? 0.4), 0, 1),
    springX: clamp(finite(input.springX, prev?.springX ?? 0.2), 0, 0.6),
    autoRun: input.autoRun ?? prev?.autoRun ?? true,
    showComponents: input.showComponents ?? prev?.showComponents ?? true
  };
}
export function threeForcesValues(params: ThreeForcesParams) {
  const theta = params.inclineAngle * DEG;
  const gravity = params.mass * G;
  const normal = gravity * Math.cos(theta);
  const downslope = gravity * Math.sin(theta);
  const perpendicular = gravity * Math.cos(theta);
  const frictionRequired = downslope;
  const frictionMax = params.mu * normal;
  const friction =
    params.tab === 'friction' ? Math.min(frictionRequired, frictionMax) : 0;
  const netForce = params.tab === 'friction' ? frictionRequired - friction : 0;
  const springForce = params.tab === 'spring' ? SPRING_K * params.springX : 0;
  return {
    gravity,
    normal,
    downslope,
    perpendicular,
    frictionRequired,
    frictionMax,
    friction,
    netForce,
    springForce
  };
}
export function createThreeForcesSim(initial: Partial<ThreeForcesParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let blockOffset = 0;
  function getState(): ThreeForcesState {
    const v = threeForcesValues(params);
    const acceleration = params.mass > 0 ? v.netForce / params.mass : 0;
    const status =
      params.tab === 'gravity'
        ? '重力分解'
        : params.tab === 'spring'
          ? '弹簧力 F = kx'
          : v.netForce < 0.01
            ? '静止平衡'
            : '沿斜面下滑';
    const theta = params.inclineAngle * DEG;
    return {
      params: { ...params },
      time,
      gravity: v.gravity,
      normal: v.normal,
      downslope: v.downslope,
      perpendicular: v.perpendicular,
      frictionRequired: v.frictionRequired,
      frictionMax: v.frictionMax,
      friction: v.friction,
      netForce: v.netForce,
      acceleration,
      springForce: v.springForce,
      status,
      blockOffset,
      gravityVector: { x: 0, y: v.gravity },
      normalVector: {
        x: -v.normal * Math.sin(theta),
        y: -v.normal * Math.cos(theta)
      },
      frictionVector: {
        x: v.friction * Math.cos(theta),
        y: -v.friction * Math.sin(theta)
      }
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): ThreeForcesParams => ({ ...params }),
    setParams(next: Partial<ThreeForcesParams>): ThreeForcesParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time += delta;
      if (params.tab === 'friction')
        blockOffset = Math.min(
          120,
          blockOffset + Math.max(0, getState().acceleration) * delta * 8
        );
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      blockOffset = 0;
    }
  };
}

import { clamp } from '../../core/math';

export type ProjectileComponentsParams = {
  speed: number;
  initialHeight: number;
  gravity: number;
  samplePeriod: number;
  autoRun: boolean;
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
  points: ProjectileComponentsPoint[];
};

export const projectileComponentsConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  originX: 88,
  groundY: 646,
  axisTopY: 82,
  xScale: 8.6,
  yScale: 8.6,
  gridMeters: 10,
  trajectorySamples: 72,
  pointRadius: 9,
  shadowRadius: 8,
  currentRadius: 15,
  vectorScale: 5.5,
  vectorCap: 172,
  titleY: 42,
  formulaX: 54,
  formulaY: 70,
  formulaWidth: 514,
  formulaHeight: 72,
  metricsCardX: 808,
  metricsCardY: 82,
  metricsCardWidth: 338,
  metricsCardHeight: 286,
  tableCardY: 384,
  tableCardHeight: 222,
  optionsCardY: 620,
  optionsCardHeight: 124,
  panelRuleY: 72,
  rowGap: 34,
  tableRowGap: 30,
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
  samplePeriodMax: 0.75,
  animationExtraTime: 0.6
} as const;

const DEFAULTS: ProjectileComponentsParams = {
  speed: projectileComponentsConstants.defaultSpeed,
  initialHeight: projectileComponentsConstants.defaultInitialHeight,
  gravity: projectileComponentsConstants.defaultGravity,
  samplePeriod: projectileComponentsConstants.defaultSamplePeriod,
  autoRun: true,
  showTrajectory: true,
  showVectors: true,
  showShadows: true,
  showStrobe: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ProjectileComponentsParams>,
  previous = DEFAULTS
): ProjectileComponentsParams {
  return {
    speed: clamp(
      finite(input.speed, previous.speed),
      projectileComponentsConstants.speedMin,
      projectileComponentsConstants.speedMax
    ),
    initialHeight: clamp(
      finite(input.initialHeight, previous.initialHeight),
      projectileComponentsConstants.heightMin,
      projectileComponentsConstants.heightMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      projectileComponentsConstants.gravityMin,
      projectileComponentsConstants.gravityMax
    ),
    samplePeriod: clamp(
      finite(input.samplePeriod, previous.samplePeriod),
      projectileComponentsConstants.samplePeriodMin,
      projectileComponentsConstants.samplePeriodMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showTrajectory: input.showTrajectory ?? previous.showTrajectory,
    showVectors: input.showVectors ?? previous.showVectors,
    showShadows: input.showShadows ?? previous.showShadows,
    showStrobe: input.showStrobe ?? previous.showStrobe
  };
}

export function projectileFlightTime(
  initialHeight: number,
  gravity: number
): number {
  return Math.sqrt((2 * Math.max(0, initialHeight)) / Math.max(0.01, gravity));
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

export function createProjectileComponentsSim(
  initial: Partial<ProjectileComponentsParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): ProjectileComponentsState {
    const flightTime = projectileFlightTime(
      params.initialHeight,
      params.gravity
    );
    const currentTime = Math.min(flightTime, time);
    const current = projectileComponentsPoint(params, currentTime);
    const points = Array.from(
      { length: Math.ceil(flightTime / params.samplePeriod) + 1 },
      (_, index) =>
        projectileComponentsPoint(
          params,
          Math.min(flightTime, index * params.samplePeriod),
          index
        )
    );
    return {
      params: { ...params },
      time: currentTime,
      flightTime,
      x: current.x,
      height: current.height,
      verticalDisplacement: current.verticalDisplacement,
      vx: params.speed,
      vy: current.vy,
      speed: Math.hypot(params.speed, current.vy),
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
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += Math.max(0, finite(dt, 0));
      const cycle =
        projectileFlightTime(params.initialHeight, params.gravity) +
        projectileComponentsConstants.animationExtraTime;
      if (time > cycle) time = 0;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}

import { clamp } from '../../core/math';

export type ProjectileParams = {
  speed: number;
  angleDeg: number;
  gravity: number;
  initialHeight?: number;
  windAccel?: number;
  drag?: number;
};

export type ResolvedProjectileParams = {
  speed: number;
  angleDeg: number;
  gravity: number;
  initialHeight: number;
  windAccel: number;
  drag: number;
};

export type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
};

function normalizeParams(input: ProjectileParams): ResolvedProjectileParams {
  const safeInitialHeight =
    typeof input.initialHeight === 'number' ? input.initialHeight : 0;
  const safeWindAccel =
    typeof input.windAccel === 'number' ? input.windAccel : 0;
  const safeDrag = typeof input.drag === 'number' ? input.drag : 0;
  return {
    speed: clamp(Number.isFinite(input.speed) ? input.speed : 0, 0, 120),
    angleDeg: clamp(
      Number.isFinite(input.angleDeg) ? input.angleDeg : 45,
      0,
      89.9
    ),
    gravity: clamp(Number.isFinite(input.gravity) ? input.gravity : 9.8, 0, 40),
    initialHeight: clamp(
      Number.isFinite(safeInitialHeight) ? safeInitialHeight : 0,
      0,
      50
    ),
    windAccel: clamp(
      Number.isFinite(safeWindAccel) ? safeWindAccel : 0,
      -20,
      20
    ),
    drag: clamp(Number.isFinite(safeDrag) ? safeDrag : 0, 0, 1)
  };
}

function resolveLaunchVelocity(params: ResolvedProjectileParams): {
  vx: number;
  vy: number;
} {
  const radians = (params.angleDeg * Math.PI) / 180;
  return {
    vx: params.speed * Math.cos(radians),
    vy: params.speed * Math.sin(radians)
  };
}

export function createProjectileSim(initial: ProjectileParams) {
  let params = normalizeParams(initial);
  let landed = false;

  const state: ProjectileState = {
    x: 0,
    y: params.initialHeight,
    vx: 0,
    vy: 0,
    t: 0
  };

  function applyInitialState(): void {
    const launch = resolveLaunchVelocity(params);
    state.x = 0;
    state.y = params.initialHeight;
    state.vx = launch.vx;
    state.vy = launch.vy;
    state.t = 0;
    landed = state.y <= 0 && state.vy <= 0;
    if (landed) {
      state.y = 0;
      state.vx = 0;
      state.vy = 0;
    }
  }

  applyInitialState();

  return {
    getState(): ProjectileState {
      return { ...state };
    },
    getParams(): ResolvedProjectileParams {
      return { ...params };
    },
    setParams(next: Partial<ProjectileParams>): ResolvedProjectileParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      const safeDt = Math.max(0, dt);
      if (safeDt === 0 || landed) return;

      const ax = params.windAccel - params.drag * state.vx;
      const ay = -params.gravity - params.drag * state.vy;
      state.vx += ax * safeDt;
      state.vy += ay * safeDt;
      state.x += state.vx * safeDt;
      state.y += state.vy * safeDt;
      state.t += safeDt;

      if (state.y < 0) {
        state.y = 0;
        state.vx = 0;
        state.vy = 0;
        landed = true;
      }
    },
    reset(): void {
      applyInitialState();
    }
  };
}

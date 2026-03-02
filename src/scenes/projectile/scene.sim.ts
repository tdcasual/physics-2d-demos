export type ProjectileParams = {
  speed: number;
  angleDeg: number;
  gravity: number;
};

export type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
};

export function createProjectileSim(params: ProjectileParams) {
  const radians = (params.angleDeg * Math.PI) / 180;
  const initialVx = params.speed * Math.cos(radians);
  const initialVy = params.speed * Math.sin(radians);

  const state: ProjectileState = {
    x: 0,
    y: 0,
    vx: initialVx,
    vy: initialVy,
    t: 0
  };

  return {
    getState(): ProjectileState {
      return { ...state };
    },
    step(dt: number): void {
      const safeDt = Math.max(0, dt);
      state.x += state.vx * safeDt;
      state.y += state.vy * safeDt;
      state.vy -= params.gravity * safeDt;
      state.t += safeDt;
      if (state.y < 0) {
        state.y = 0;
        state.vy = 0;
      }
    },
    reset(): void {
      state.x = 0;
      state.y = 0;
      state.vx = initialVx;
      state.vy = initialVy;
      state.t = 0;
    }
  };
}

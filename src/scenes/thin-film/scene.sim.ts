/**
 * 薄膜干涉 — 物理模拟
 *
 * 近正入射，一次半波损失：Δ = 2nd + λ/2（反射光，d=0 为暗）。
 *
 * 两种沿高度的厚度分布（正视图都是矩形膜，条纹始终水平）：
 * - linear（均匀变化）：d(y) = d₀ + (d₁−d₀)·y ，条纹近似等间距
 * - quad（非均匀变化）：d(y) = d₀ + (d₁−d₀)·y³ ，越往下增厚越快，条纹上疏下密
 */

export type ThinFilmStep = 'geometry' | 'path-diff' | 'half-wave' | 'result';

export type ThinFilmProfile = 'linear' | 'quad';

export type ThinFilmParams = {
  lambda: number; // 波长 nm
  dTop: number; // 顶部厚度 nm
  dBottom: number; // 底部厚度 nm
  n: number; // 薄膜折射率
  whiteLight: boolean;
  step: ThinFilmStep;
  profile: ThinFilmProfile;
};

export type ThinFilmState = {
  params: ThinFilmParams;
  /** 观察点归一化高度 0=顶, 1=底 */
  cursorY: number;
  localThickness: number;
  pathDiff: number;
  order: number;
  isConstructive: boolean;
  reflectivity: number;
  time: number;
  phaseDiff: number;
};

export function thicknessAt(
  dThin: number,
  dThick: number,
  t: number,
  profile: ThinFilmProfile = 'linear'
): number {
  const u = Math.max(0, Math.min(1, t));
  if (profile === 'quad') {
    return dThin + (dThick - dThin) * u * u * u;
  }
  return dThin + (dThick - dThin) * u;
}

/** 线性剖面别名，保留给既有测试 */
export function thicknessAtY(dTop: number, dBottom: number, y: number): number {
  return thicknessAt(dTop, dBottom, y, 'linear');
}

function computeState(
  params: ThinFilmParams,
  cursorY: number,
  time = 0
): ThinFilmState {
  const { lambda, dTop, dBottom, n, profile } = params;
  const d = thicknessAt(dTop, dBottom, cursorY, profile);

  const pathDiff = 2 * n * d + lambda / 2;
  const order = pathDiff / lambda;
  const phaseDiff = (2 * Math.PI * pathDiff) / lambda;
  const reflectivity = Math.cos(phaseDiff / 2) ** 2;
  const isConstructive = reflectivity > 0.5;

  return {
    params: { ...params },
    cursorY,
    localThickness: d,
    pathDiff,
    order,
    isConstructive,
    reflectivity,
    time,
    phaseDiff
  };
}

export function createThinFilmSim(initial: ThinFilmParams) {
  let params: ThinFilmParams = {
    ...initial,
    profile: initial.profile ?? 'linear',
    dBottom: Math.max(initial.dBottom, initial.dTop)
  };
  let cursorY = 0.5;
  let time = 0;

  function getState(): ThinFilmState {
    return computeState(params, cursorY, time);
  }

  function setParams(next: Partial<ThinFilmParams>): ThinFilmParams {
    params = { ...params, ...next };
    if (params.dBottom < params.dTop) {
      params.dBottom = params.dTop;
    }
    return params;
  }

  function setCursorY(y: number): void {
    cursorY = Math.max(0, Math.min(1, y));
  }

  function tick(dt = 0.1): void {
    time += dt;
  }

  function setTime(t: number): void {
    time = t;
  }

  function reset(): void {
    params = { ...initial, profile: initial.profile ?? 'linear' };
    cursorY = 0.5;
    time = 0;
  }

  function step(dt: number): void {
    tick(dt * 6);
  }

  return { getState, setParams, setCursorY, setTime, tick, reset, step };
}

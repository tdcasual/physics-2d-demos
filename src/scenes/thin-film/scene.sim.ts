/**
 * 薄膜干涉 — 物理模拟
 */

export type ThinFilmStep = 'geometry' | 'path-diff' | 'half-wave' | 'result';

export type ThinFilmParams = {
  lambda: number;     // 波长 nm
  d: number;          // 薄膜厚度 nm
  n: number;          // 薄膜折射率
  incidence: number;  // 入射角 度
  step: ThinFilmStep;
};

export type ThinFilmState = {
  params: ThinFilmParams;
  /** 折射角 度 */
  refraction: number;
  /** 光程差 nm */
  pathDiff: number;
  /** 干涉级次 */
  order: number;
  /** 是否增强（明纹/相长） */
  isConstructive: boolean;
  /** 相对反射光强 0-1 */
  reflectivity: number;
  /** 时间相位（用于波形动画） */
  time: number;
  /** 两束光的相位差 δ（弧度） */
  phaseDiff: number;
};

const DEG_TO_RAD = Math.PI / 180;

function snellLaw(n1: number, n2: number, theta1Deg: number): number {
  const theta1 = theta1Deg * DEG_TO_RAD;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1);
  // clamp to [-1, 1] to avoid NaN
  const clamped = Math.max(-1, Math.min(1, sinTheta2));
  return Math.asin(clamped) / DEG_TO_RAD;
}

function computeState(params: ThinFilmParams, time = 0): ThinFilmState {
  const { lambda, d, n, incidence } = params;
  const n1 = 1.0; // 空气

  // 折射角（斯涅尔定律）
  const refraction = snellLaw(n1, n, incidence);

  // 光程差 Δ = 2nd cos r + λ/2
  const rRad = refraction * DEG_TO_RAD;
  const opticalPath = 2 * n * d * Math.cos(rRad);
  const pathDiff = opticalPath + lambda / 2;

  // 级次
  const order = pathDiff / lambda;

  // 反射光强
  const phase = (Math.PI * pathDiff) / lambda;
  const reflectivity = Math.cos(phase) ** 2;
  const isConstructive = reflectivity > 0.5;

  // 两束光的相位差 δ = 2πΔ/λ
  const phaseDiff = (2 * Math.PI * pathDiff) / lambda;

  return {
    params: { ...params },
    refraction,
    pathDiff,
    order,
    isConstructive,
    reflectivity,
    time,
    phaseDiff
  };
}

export function createThinFilmSim(initial: ThinFilmParams) {
  let params: ThinFilmParams = { ...initial };
  let time = 0;

  function getState(): ThinFilmState {
    return computeState(params, time);
  }

  function setParams(next: Partial<ThinFilmParams>): ThinFilmParams {
    params = { ...params, ...next };
    return params;
  }

  function tick(dt = 0.1): void {
    time += dt;
  }

  function setTime(t: number): void {
    time = t;
  }

  function reset(): void {
    params = { ...initial };
    time = 0;
  }

  function step(dt: number): void {
    // 由 SceneAdapter / createSceneShell 的 rAF 驱动
    tick(dt * 6);
  }

  return { getState, setParams, setTime, tick, reset, step };
}

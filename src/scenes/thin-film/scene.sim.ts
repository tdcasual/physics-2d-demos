/**
 * 薄膜干涉 — 物理模拟（竖直肥皂膜模型）
 *
 * 膜竖直放置，受重力影响上薄下厚：d(y) = dTop + (dBottom - dTop) * y
 * 近正入射简化，光程差 Δ = 2nd + λ/2
 */

export type ThinFilmStep = 'geometry' | 'path-diff' | 'half-wave' | 'result';

export type ThinFilmParams = {
  lambda: number;       // 波长 nm
  dTop: number;         // 顶部厚度 nm
  dBottom: number;      // 底部厚度 nm
  n: number;            // 薄膜折射率
  whiteLight: boolean;  // 白光模式
  step: ThinFilmStep;
};

export type ThinFilmState = {
  params: ThinFilmParams;
  /** 观察点归一化位置 0=top, 1=bottom */
  cursorY: number;
  /** 观察点处厚度 nm */
  localThickness: number;
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

/** 计算归一化高度 y 处的厚度 (nm) */
export function thicknessAtY(dTop: number, dBottom: number, y: number): number {
  return dTop + (dBottom - dTop) * y;
}

function computeState(params: ThinFilmParams, cursorY: number, time = 0): ThinFilmState {
  const { lambda, dTop, dBottom, n } = params;
  const d = thicknessAtY(dTop, dBottom, cursorY);

  // 近正入射：Δ = 2nd + λ/2（上表面空气→膜有半波损失，下表面膜→空气没有）
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
  let params: ThinFilmParams = { ...initial, dBottom: Math.max(initial.dBottom, initial.dTop) };
  let cursorY = 0.5;
  let time = 0;

  function getState(): ThinFilmState {
    return computeState(params, cursorY, time);
  }

  function setParams(next: Partial<ThinFilmParams>): ThinFilmParams {
    params = { ...params, ...next };
    // 保证 dBottom >= dTop（重力物理约束）
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
    params = { ...initial };
    cursorY = 0.5;
    time = 0;
  }

  function step(dt: number): void {
    tick(dt * 6);
  }

  return { getState, setParams, setCursorY, setTime, tick, reset, step };
}

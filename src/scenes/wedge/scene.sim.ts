/**
 * 劈尖干涉 — 物理模拟
 */

export type WedgeStep = 'geometry' | 'path-diff' | 'equal-thickness' | 'result';

export type WedgeParams = {
  lambda: number; // 波长 nm
  theta: number; // 劈尖角 度
  L: number; // 板长 cm
  step: WedgeStep;
};

export type WedgeState = {
  params: WedgeParams;
  /** 光标归一化位置 0-1 */
  cursorX: number;
  /** 光标处厚度 nm */
  thickness: number;
  /** 光程差 nm */
  pathDiff: number;
  /** 干涉级次 */
  order: number;
  /** 是否明纹 */
  isBright: boolean;
  /** 相对光强 0-1 */
  intensity: number;
  /** 条纹间距 mm */
  fringeSpacing: number;
  /** 时间相位（用于波形动画） */
  time: number;
  /** 两束光的相位差 δ（弧度） */
  phaseDiff: number;
};

const DEG_TO_RAD = Math.PI / 180;

function computeState(
  params: WedgeParams,
  cursorX: number,
  time = 0
): WedgeState {
  const lambda = params.lambda; // nm
  const thetaRad = params.theta * DEG_TO_RAD;
  const L = params.L * 10; // cm -> mm

  // 光标位置 x (mm)
  const x = cursorX * L;

  // 厚度 d = x * tan(θ) ≈ x * θ (nm)
  const thickness = x * Math.tan(thetaRad) * 1e6; // nm

  // 光程差 Δ = 2d + λ/2 (空气劈尖 n=1)
  const pathDiff = 2 * thickness + lambda / 2;

  // 级次 m = Δ / λ
  const order = pathDiff / lambda;

  // 光强 I = I₀ sin²(2πd/λ)
  const phase = (2 * Math.PI * thickness) / lambda;
  const intensity = Math.sin(phase) ** 2;

  // 明纹条件：2d = (m+1/2)λ → sin²(2πd/λ) = 1
  const isBright = intensity > 0.5;

  // 条纹间距 l = λ / (2 sin θ) ≈ λ / (2θ) (mm)
  const fringeSpacing = (lambda * 1e-6) / (2 * Math.sin(thetaRad)); // mm

  // 两束光的相位差 δ = 2πΔ/λ
  const phaseDiff = (2 * Math.PI * pathDiff) / lambda;

  return {
    params: { ...params },
    cursorX,
    thickness,
    pathDiff,
    order,
    isBright,
    intensity,
    fringeSpacing,
    time,
    phaseDiff
  };
}

export function createWedgeSim(initial: WedgeParams) {
  let params: WedgeParams = { ...initial };
  let cursorX = 0.3;
  let time = 0;

  function getState(): WedgeState {
    return computeState(params, cursorX, time);
  }

  function setParams(next: Partial<WedgeParams>): WedgeParams {
    params = { ...params, ...next };
    return params;
  }

  function setCursorX(x: number): void {
    cursorX = Math.max(0, Math.min(1, x));
  }

  function tick(dt = 0.08): void {
    time += dt;
  }

  function setTime(t: number): void {
    time = t;
  }

  function reset(): void {
    params = { ...initial };
    cursorX = 0.3;
    time = 0;
  }

  function step(dt: number): void {
    // 由 SceneAdapter / createSceneShell 的 rAF 驱动
    tick(dt * 6);
  }

  return { getState, setParams, setCursorX, setTime, tick, reset, step };
}

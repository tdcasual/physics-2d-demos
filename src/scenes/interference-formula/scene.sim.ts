/**
 * 双缝干涉公式推导 — 物理模拟
 *
 * 计算干涉条纹间距与光强分布。
 */

export type InterferenceFormulaStep =
  | 'geometry'
  | 'path-diff'
  | 'small-angle'
  | 'result';

export type InterferenceFormulaParams = {
  lambda: number; // 波长，单位 nm
  L: number; // 双缝到屏幕距离，单位 m
  d: number; // 双缝间距，单位 mm
  step: InterferenceFormulaStep;
};

export type InterferenceFormulaState = {
  params: InterferenceFormulaParams;
  /** 条纹间距 Δx，单位 m */
  deltaX: number;
  /** 亮纹位置（相对于中心），单位 m，m = 0, ±1, ±2 ... */
  fringePositions: number[];
};

function computeDeltaX(lambda: number, L: number, d: number): number {
  // lambda(nm) → m; d(mm) → m
  const lambdaM = lambda * 1e-9;
  const dM = d * 1e-3;
  return (lambdaM * L) / dM;
}

function computeFringePositions(deltaX: number, maxOrder = 10): number[] {
  const positions: number[] = [];
  for (let m = -maxOrder; m <= maxOrder; m++) {
    positions.push(m * deltaX);
  }
  return positions;
}

export function createInterferenceFormulaSim(
  initial: InterferenceFormulaParams
) {
  let params: InterferenceFormulaParams = { ...initial };

  function getState(): InterferenceFormulaState {
    const deltaX = computeDeltaX(params.lambda, params.L, params.d);
    return {
      params: { ...params },
      deltaX,
      fringePositions: computeFringePositions(deltaX)
    };
  }

  function setParams(
    next: Partial<InterferenceFormulaParams>
  ): InterferenceFormulaParams {
    params = { ...params, ...next };
    return params;
  }

  function reset(): void {
    params = { ...initial };
  }

  function step(_dt: number): void {
    // 静态推导场景，无需每帧更新物理量
  }

  return { getState, setParams, reset, step };
}

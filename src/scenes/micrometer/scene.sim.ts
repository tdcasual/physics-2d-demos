/**
 * 螺旋测微仪 — 物理模拟（读数练习模式）
 */

export type MicrometerParams = {
  /** 当前读数 mm，范围 0.000 ~ 10.000 */
  reading: number;
};

export type MicrometerState = {
  params: MicrometerParams;
  /** 当前读数 mm */
  reading: number;
  /** 固定刻度读数 mm（0.5mm 的整数倍） */
  mainScaleReading: number;
  /** 微分筒读数（0-49.9，含估读） */
  drumReading: number;
  /** 鼓轮总旋转角度（圈数） */
  drumRotation: number;
  /** 总读数 mm */
  totalReading: number;
  /** 半毫米线是否露出 */
  hasHalfMm: boolean;
};

function computeState(params: MicrometerParams): MicrometerState {
  const reading = Math.max(0, Math.min(10, params.reading));

  // 固定刻度读数：0.5mm 的整数倍
  const mainScaleReading = Math.floor(reading / 0.5) * 0.5;

  // 半毫米线是否露出：仅当小数部分 ≥ 0.5 且 < 1.0（排除整数情况）
  const frac = reading - Math.floor(reading);
  const hasHalfMm = frac >= 0.5 - 1e-9 && frac < 1.0 - 1e-9;

  // 微分筒读数：(reading - 主尺读数) / 0.01
  const remainder = reading - mainScaleReading;
  const drumReading = remainder / 0.01;

  // 鼓轮总旋转角度（圈数）
  const drumRotation = reading / 0.5;

  return {
    params: { reading },
    reading,
    mainScaleReading,
    drumReading,
    drumRotation,
    totalReading: reading,
    hasHalfMm
  };
}

export function createMicrometerSim(initial: MicrometerParams) {
  let params: MicrometerParams = { ...initial };

  function getState(): MicrometerState {
    return computeState(params);
  }

  function setParams(next: Partial<MicrometerParams>): MicrometerParams {
    params = { ...params, ...next };
    return params;
  }

  function reset(): void {
    params = { ...initial };
  }

  function step(_dt: number): void {
    // 静态场景
  }

  return { getState, setParams, reset, step };
}

/**
 * 游标卡尺 — 物理模拟
 */

export type CaliperPrecision = 0.02 | 0.05 | 0.1;

export type CaliperParams = {
  precision: CaliperPrecision;
  objectType: number; // 0=ball, 1=block, 2=tube
};

export type CaliperState = {
  params: CaliperParams;
  /** 被测物类型 */
  objectName: string;
  /** 被测物真实尺寸 mm */
  objectSize: number;
  /** 测量爪位置 mm（0-50） */
  jawPosition: number;
  /** 主尺读数 mm */
  mainScaleReading: number;
  /** 游标对齐格数 */
  vernierAlignment: number;
  /** 总读数 mm */
  totalReading: number;
  /** 游标格数 */
  vernierDivisions: number;
  /** 游标总长 mm */
  vernierLength: number;
};

const OBJECTS: Array<{ name: string; size: number }> = [
  { name: '小球直径', size: 5.24 },
  { name: '金属块长度', size: 12.36 },
  { name: '管内径', size: 8.5 }
];

function getPrecisionConfig(precision: CaliperPrecision): {
  divisions: number;
  length: number;
} {
  switch (precision) {
    case 0.1:
      return { divisions: 10, length: 9 };
    case 0.05:
      return { divisions: 20, length: 19 };
    case 0.02:
    default:
      return { divisions: 50, length: 49 };
  }
}

function computeState(params: CaliperParams): CaliperState {
  const objIndex = Math.max(0, Math.min(2, Math.round(params.objectType)));
  const object = OBJECTS[objIndex];
  const { divisions, length } = getPrecisionConfig(params.precision);

  // 测量爪位置 = 被测物尺寸（模拟正确放置）
  const jawPosition = object.size;

  // 主尺读数：游标零线左侧最近整毫米
  const mainScaleReading = Math.floor(jawPosition);

  // 游标对齐格数：找到使 (主尺刻度 - 游标刻度) 最接近整数的格数
  // 主尺第 n mm 处刻度位置 = n
  // 游标第 k 格位置 = jawPosition + k * (length/divisions)
  // 对齐条件：n ≈ jawPosition + k * (length/divisions)
  // 即 n - jawPosition ≈ k * (length/divisions)
  // 差值 = n - jawPosition - k * (length/divisions) ≈ 0

  let bestK = 0;
  let bestDiff = Infinity;
  for (let k = 0; k < divisions; k++) {
    const vernierPos = jawPosition + k * (length / divisions);
    const n = Math.round(vernierPos);
    const diff = Math.abs(n - vernierPos);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestK = k;
    }
  }

  const vernierAlignment = bestK;
  const totalReading = mainScaleReading + vernierAlignment * params.precision;

  return {
    params: { ...params },
    objectName: object.name,
    objectSize: object.size,
    jawPosition,
    mainScaleReading,
    vernierAlignment,
    totalReading,
    vernierDivisions: divisions,
    vernierLength: length
  };
}

export function createVernierCaliperSim(initial: CaliperParams) {
  let params: CaliperParams = { ...initial };

  function getState(): CaliperState {
    return computeState(params);
  }

  function setParams(next: Partial<CaliperParams>): CaliperParams {
    params = { ...params, ...next };
    return params;
  }

  function setJawPosition(_pos: number): void {
    // 游标卡尺的测量位置由被测物决定
  }

  function reset(): void {
    params = { ...initial };
  }

  function step(_dt: number): void {
    // 静态场景
  }

  return { getState, setParams, setJawPosition, reset, step };
}

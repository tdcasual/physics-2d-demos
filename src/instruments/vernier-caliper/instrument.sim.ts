/**
 * 游标卡尺 — 物理模型
 *
 * 读数 = 主尺整毫米 + 游标对齐格 × 精度。支持 10/20/50 分度
 * （精度 0.1/0.05/0.02mm）与三种被测物。
 */

import type {
  InstrumentParams,
  InstrumentState
} from '../_contract/instrument-contract';

export type CaliperPrecision = 0.02 | 0.05 | 0.1;

export interface VernierCaliperParams extends InstrumentParams {
  precision: CaliperPrecision;
  /** 0=小球 1=金属块 2=管 */
  objectType: number;
}

export type VernierCaliperState = InstrumentState & {
  objectName: string;
  objectSize: number;
  jawPosition: number;
  mainScaleReading: number;
  vernierAlignment: number;
  totalReading: number;
  vernierDivisions: number;
  vernierLength: number;
  params: { precision: CaliperPrecision; objectType: number };
};

const OBJECTS: Array<{ name: string; size: number }> = [
  { name: '小球直径', size: 5.24 },
  { name: '金属块长度', size: 12.36 },
  { name: '管内径', size: 8.5 }
];

const VALID_PRECISIONS: CaliperPrecision[] = [0.02, 0.05, 0.1];

function snapPrecision(raw: unknown): CaliperPrecision {
  const p = Number(raw);
  return VALID_PRECISIONS.reduce((best, v) =>
    Math.abs(v - p) < Math.abs(best - p) ? v : best
  );
}

function normalizeCaliperParams(
  input: VernierCaliperParams
): VernierCaliperParams {
  return {
    precision: snapPrecision(input.precision),
    objectType: Number(input.objectType)
  };
}

function precisionConfig(precision: CaliperPrecision): {
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

function computeState(params: VernierCaliperParams): VernierCaliperState {
  const objIndex = Math.max(0, Math.min(2, Math.round(params.objectType)));
  const object = OBJECTS[objIndex];
  const { divisions, length } = precisionConfig(params.precision);
  const jawPosition = object.size;
  const mainScaleReading = Math.floor(jawPosition);

  let bestK = 0;
  let bestDiff = Infinity;
  for (let k = 0; k < divisions; k += 1) {
    const vernierPos = jawPosition + k * (length / divisions);
    const diff = Math.abs(Math.round(vernierPos) - vernierPos);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestK = k;
    }
  }

  return {
    currentReading: mainScaleReading + bestK * params.precision,
    zeroOffset: 0,
    objectName: object.name,
    objectSize: object.size,
    jawPosition,
    mainScaleReading,
    vernierAlignment: bestK,
    totalReading: mainScaleReading + bestK * params.precision,
    vernierDivisions: divisions,
    vernierLength: length,
    params: { precision: params.precision, objectType: objIndex }
  };
}

export function createVernierCaliperSim(initial: VernierCaliperParams) {
  const normalizedInitial = normalizeCaliperParams(initial);
  let params: VernierCaliperParams = { ...normalizedInitial };
  return {
    getState(): VernierCaliperState {
      return computeState(params);
    },
    setParams(next: Partial<VernierCaliperParams>): void {
      // 控件可能传入字符串或连续值，统一转数值并把精度吸附到合法档位，
      // 保证读数与游标分度始终自洽（仪器库自动生成连续滑块时亦成立）
      params = normalizeCaliperParams({ ...params, ...next });
    },
    step(_dt: number): void {
      /* 静态仪器 */
    },
    reset(): void {
      params = { ...normalizedInitial };
    }
  };
}

/**
 * 螺旋测微器（千分尺）— 物理模型
 *
 * 读数 = 固定刻度（0.5mm 整数倍）+ 微分筒读数 × 0.01mm（含估读位）。
 * 量程 0–25mm（人教版螺旋测微器标准量程）。
 */

import type {
  InstrumentParams,
  InstrumentState
} from '../_contract/instrument-contract';

export interface SpiralMicrometerParams extends InstrumentParams {
  /** 当前读数 mm，范围 0–25 */
  reading: number;
}

export type SpiralMicrometerState = InstrumentState & {
  reading: number;
  /** 固定刻度读数 mm（0.5mm 的整数倍） */
  mainScaleReading: number;
  /** 微分筒读数 0–50（含估读） */
  drumReading: number;
  /** 鼓轮总旋转圈数 */
  drumRotation: number;
  /** 半毫米线是否露出 */
  hasHalfMm: boolean;
};

function computeState(readingRaw: number): SpiralMicrometerState {
  const reading = Math.max(0, Math.min(25, readingRaw));
  const mainScaleReading = Math.floor(reading / 0.5) * 0.5;
  const frac = reading - Math.floor(reading);
  const hasHalfMm = frac >= 0.5 - 1e-9 && frac < 1.0 - 1e-9;
  const drumReading = (reading - mainScaleReading) / 0.01;
  return {
    currentReading: reading,
    zeroOffset: 0,
    reading,
    mainScaleReading,
    drumReading,
    drumRotation: reading / 0.5,
    hasHalfMm
  };
}

export function createSpiralMicrometerSim(initial: SpiralMicrometerParams) {
  let reading = initial.reading;
  return {
    getState(): SpiralMicrometerState {
      return computeState(reading);
    },
    setParams(next: Partial<SpiralMicrometerParams>): void {
      if (typeof next.reading === 'number') reading = next.reading;
    },
    step(_dt: number): void {
      /* 静态仪器 */
    },
    reset(): void {
      reading = initial.reading;
    }
  };
}

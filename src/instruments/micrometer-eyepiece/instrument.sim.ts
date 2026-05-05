/**
 * 高精度干涉测微仪 — 模拟器
 */

import type { InstrumentSim, InstrumentState } from '../_contract/instrument-contract';
import type { MicrometerEyepieceParams } from './instrument.meta';

export interface MicrometerEyepieceState extends InstrumentState {
  currentReading: number;
}

export function createMicrometerEyepieceSim(
  initial: MicrometerEyepieceParams,
): InstrumentSim<MicrometerEyepieceState, MicrometerEyepieceParams> {
  let currentReading = initial.initialReading;

  return {
    getState() {
      return { currentReading };
    },
    setParams(params) {
      if (params.initialReading !== undefined) {
        currentReading = params.initialReading;
      }
    },
    step() {
      // 纯交互式仪器，无自动步进
    },
    reset() {
      currentReading = initial.initialReading;
    },
  };
}

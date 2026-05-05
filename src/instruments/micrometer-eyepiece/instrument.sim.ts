/**
 * 高精度干涉测微仪 — 模拟器
 */

import type { InstrumentSim, InstrumentState } from '../_contract/instrument-contract';
import type { MicrometerEyepieceParams } from './instrument.meta';

export interface MicrometerEyepieceState extends InstrumentState {
  currentReading: number;
  stripeOffset: number;
  stripeSpacing: number;
  stripeColor: string;
  stripeAngle: number;
}

export function createMicrometerEyepieceSim(
  initial: MicrometerEyepieceParams,
): InstrumentSim<MicrometerEyepieceState, MicrometerEyepieceParams> {
  let state: MicrometerEyepieceState = {
    currentReading: initial.initialReading,
    stripeOffset: initial.stripeOffset,
    stripeSpacing: initial.stripeSpacing,
    stripeColor: initial.stripeColor,
    stripeAngle: initial.stripeAngle,
  };

  return {
    getState() {
      return state;
    },
    setParams(params) {
      if (params.initialReading !== undefined) {
        state.currentReading = params.initialReading;
      }
      if (params.stripeOffset !== undefined) {
        state.stripeOffset = params.stripeOffset;
      }
      if (params.stripeSpacing !== undefined) {
        state.stripeSpacing = params.stripeSpacing;
      }
      if (params.stripeColor !== undefined) {
        state.stripeColor = params.stripeColor;
      }
      if (params.stripeAngle !== undefined) {
        state.stripeAngle = params.stripeAngle;
      }
    },
    step() {
      // 纯交互式仪器，无自动步进
    },
    reset() {
      state.currentReading = initial.initialReading;
      state.stripeOffset = initial.stripeOffset;
      state.stripeSpacing = initial.stripeSpacing;
      state.stripeColor = initial.stripeColor;
      state.stripeAngle = initial.stripeAngle;
    },
  };
}

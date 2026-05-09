/**
 * 干涉读数游标卡尺（双缝干涉测量）— 模拟器
 */

import type { InstrumentSim, InstrumentState } from '../_contract/instrument-contract';
import type { InterferenceVernierCaliperParams } from './instrument.meta';

export interface InterferenceVernierCaliperState extends InstrumentState {
  currentReading: number;
  zeroOffset: number;
  fringeSpacing: number;
  fringeBlur: number;
  fringeOpacity: number;
  fringeEnvelopeWidth: number;
  fringeColor: string;
  crosshairAngle: number;
}

export function createInterferenceVernierCaliperSim(
  initial: InterferenceVernierCaliperParams,
): InstrumentSim<InterferenceVernierCaliperState, InterferenceVernierCaliperParams> {
  const state: InterferenceVernierCaliperState = {
    currentReading: initial.initialReading,
    zeroOffset: initial.zeroOffset,
    fringeSpacing: initial.fringeSpacing,
    fringeBlur: initial.fringeBlur,
    fringeOpacity: initial.fringeOpacity,
    fringeEnvelopeWidth: initial.fringeEnvelopeWidth,
    fringeColor: initial.fringeColor,
    crosshairAngle: initial.crosshairAngle ?? 0,
  };

  return {
    getState() {
      return state;
    },
    setParams(params) {
      if (params.initialReading !== undefined) {
        state.currentReading = params.initialReading;
      }
      if (params.zeroOffset !== undefined) {
        state.zeroOffset = params.zeroOffset;
      }
      if (params.fringeSpacing !== undefined) {
        state.fringeSpacing = params.fringeSpacing;
      }
      if (params.fringeBlur !== undefined) {
        state.fringeBlur = params.fringeBlur;
      }
      if (params.fringeOpacity !== undefined) {
        state.fringeOpacity = params.fringeOpacity;
      }
      if (params.fringeEnvelopeWidth !== undefined) {
        state.fringeEnvelopeWidth = params.fringeEnvelopeWidth;
      }
      if (params.fringeColor !== undefined) {
        state.fringeColor = params.fringeColor;
      }
      if (params.crosshairAngle !== undefined) {
        state.crosshairAngle = params.crosshairAngle;
      }
    },
    step() {
      // 纯交互式仪器，无自动步进
    },
    reset() {
      state.currentReading = initial.initialReading;
      state.zeroOffset = initial.zeroOffset;
      state.fringeSpacing = initial.fringeSpacing;
      state.fringeBlur = initial.fringeBlur;
      state.fringeOpacity = initial.fringeOpacity;
      state.fringeEnvelopeWidth = initial.fringeEnvelopeWidth;
      state.fringeColor = initial.fringeColor;
      state.crosshairAngle = 0;
    },
  };
}

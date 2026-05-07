/**
 * 高精度干涉测微仪 — 模拟器
 */

import type { InstrumentSim, InstrumentState } from '../_contract/instrument-contract';
import type { MicrometerEyepieceParams, ViewMode } from './instrument.meta';

export interface MicrometerEyepieceState extends InstrumentState {
  currentReading: number;
  zeroOffset: number;
  stripeOffset: number;
  stripeSpacing: number;
  stripeColor: string;
  stripeAngle: number;
  viewMode: ViewMode;
  crosshairSpeed: number;
  scaleInverted: boolean;
}

export function createMicrometerEyepieceSim(
  initial: MicrometerEyepieceParams,
): InstrumentSim<MicrometerEyepieceState, MicrometerEyepieceParams> {
  const state: MicrometerEyepieceState = {
    currentReading: initial.initialReading,
    zeroOffset: initial.zeroOffset,
    stripeOffset: initial.stripeOffset,
    stripeSpacing: initial.stripeSpacing,
    stripeColor: initial.stripeColor,
    stripeAngle: initial.stripeAngle,
    viewMode: initial.viewMode,
    crosshairSpeed: initial.crosshairSpeed ?? 100,
    scaleInverted: initial.scaleInverted ?? false,
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
      if (params.viewMode !== undefined) {
        state.viewMode = params.viewMode;
      }
      if (params.crosshairSpeed !== undefined) {
        state.crosshairSpeed = params.crosshairSpeed;
      }
      if (params.scaleInverted !== undefined) {
        state.scaleInverted = params.scaleInverted;
      }
    },
    step() {
      // 纯交互式仪器，无自动步进
    },
    reset() {
      state.currentReading = initial.initialReading;
      state.zeroOffset = initial.zeroOffset;
      state.stripeOffset = initial.stripeOffset;
      state.stripeSpacing = initial.stripeSpacing;
      state.stripeColor = initial.stripeColor;
      state.stripeAngle = initial.stripeAngle;
      state.viewMode = initial.viewMode;
    },
  };
}

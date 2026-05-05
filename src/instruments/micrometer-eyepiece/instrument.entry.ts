/**
 * 高精度干涉测微仪 — 工厂入口
 */

import { micrometerEyepieceMeta } from './instrument.meta';
import { createMicrometerEyepieceSim } from './instrument.sim';
import { createMicrometerEyepieceView } from './instrument.view';
import type { InstrumentFactory } from '../_contract/instrument-contract';
import type { MicrometerEyepieceState } from './instrument.sim';
import type { MicrometerEyepieceParams } from './instrument.meta';

export const micrometerEyepieceFactory: InstrumentFactory<MicrometerEyepieceState, MicrometerEyepieceParams> = {
  meta: micrometerEyepieceMeta,
  createSim(initial) {
    return createMicrometerEyepieceSim(initial);
  },
  createView(options) {
    return createMicrometerEyepieceView(options);
  },
};

import type {
  InstrumentFactory,
} from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';
import type { InstrumentViewport } from '../_contract/instrument-contract';

import { micrometerEyepieceMeta } from './instrument.meta';
import { createMicrometerEyepieceSim, type MicrometerEyepieceState } from './instrument.sim';
import {
  createMicrometerEyepieceView,
  type MicrometerEyepieceView,
} from './instrument.view';

export function createMicrometerEyepiece(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): {
  sim: ReturnType<typeof createMicrometerEyepieceSim>;
  view: MicrometerEyepieceView;
} {
  const sim = createMicrometerEyepieceSim(micrometerEyepieceMeta.defaultParams);
  const view = createMicrometerEyepieceView(options);
  return { sim, view };
}

export const micrometerEyepieceFactory: InstrumentFactory<
  MicrometerEyepieceState,
  typeof micrometerEyepieceMeta.defaultParams
> = {
  meta: micrometerEyepieceMeta,
  createSim() {
    return createMicrometerEyepieceSim(micrometerEyepieceMeta.defaultParams);
  },
  createView(options) {
    return createMicrometerEyepieceView(options);
  },
};

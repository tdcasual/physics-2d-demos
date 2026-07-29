import type { InstrumentFactory, InstrumentViewport } from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';

import { vernierCaliperMeta } from './instrument.meta';
import {
  createVernierCaliperSim,
  type VernierCaliperState
} from './instrument.sim';
import {
  createVernierCaliperView,
  type VernierCaliperView
} from './instrument.view';

export function createVernierCaliper(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showReading?: boolean;
  showHints?: boolean;
}): {
  sim: ReturnType<typeof createVernierCaliperSim>;
  view: VernierCaliperView;
} {
  const sim = createVernierCaliperSim(vernierCaliperMeta.defaultParams);
  const view = createVernierCaliperView(options);
  return { sim, view };
}

export const vernierCaliperFactory: InstrumentFactory<
  VernierCaliperState,
  typeof vernierCaliperMeta.defaultParams
> = {
  meta: vernierCaliperMeta,
  createSim() {
    return createVernierCaliperSim(vernierCaliperMeta.defaultParams);
  },
  createView(options) {
    return createVernierCaliperView(options);
  }
};

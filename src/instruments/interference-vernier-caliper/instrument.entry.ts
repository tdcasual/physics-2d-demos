import type {
  InstrumentFactory,
} from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';
import type { InstrumentViewport } from '../_contract/instrument-contract';

import { interferenceVernierCaliperMeta } from './instrument.meta';
import { createInterferenceVernierCaliperSim, type InterferenceVernierCaliperState } from './instrument.sim';
import {
  createInterferenceVernierCaliperView,
  type InterferenceVernierCaliperView,
} from './instrument.view';

export function createInterferenceVernierCaliper(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): {
  sim: ReturnType<typeof createInterferenceVernierCaliperSim>;
  view: InterferenceVernierCaliperView;
} {
  const sim = createInterferenceVernierCaliperSim(interferenceVernierCaliperMeta.defaultParams);
  const view = createInterferenceVernierCaliperView(options);
  return { sim, view };
}

export const interferenceVernierCaliperFactory: InstrumentFactory<
  InterferenceVernierCaliperState,
  typeof interferenceVernierCaliperMeta.defaultParams
> = {
  meta: interferenceVernierCaliperMeta,
  createSim() {
    return createInterferenceVernierCaliperSim(interferenceVernierCaliperMeta.defaultParams);
  },
  createView(options) {
    return createInterferenceVernierCaliperView(options);
  },
};

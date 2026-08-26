import type {
  InstrumentFactory,
  InstrumentViewport
} from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';

import { spiralMicrometerMeta } from './instrument.meta';
import {
  createSpiralMicrometerSim,
  type SpiralMicrometerState
} from './instrument.sim';
import {
  createSpiralMicrometerView,
  type SpiralMicrometerView
} from './instrument.view';

export function createSpiralMicrometer(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showReading?: boolean;
  showHints?: boolean;
}): {
  sim: ReturnType<typeof createSpiralMicrometerSim>;
  view: SpiralMicrometerView;
} {
  const sim = createSpiralMicrometerSim(spiralMicrometerMeta.defaultParams);
  const view = createSpiralMicrometerView(options);
  return { sim, view };
}

export const spiralMicrometerFactory: InstrumentFactory<
  SpiralMicrometerState,
  typeof spiralMicrometerMeta.defaultParams
> = {
  meta: spiralMicrometerMeta,
  createSim() {
    return createSpiralMicrometerSim(spiralMicrometerMeta.defaultParams);
  },
  createView(options) {
    return createSpiralMicrometerView(options);
  }
};

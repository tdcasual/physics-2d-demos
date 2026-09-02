/**
 * 游标卡尺使用演示 — 工厂组装
 */

import type {
  InstrumentFactory,
  InstrumentViewport
} from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';

import { vernierCaliperGuideMeta } from './instrument.meta';
import {
  createVernierCaliperGuideSim,
  type VernierCaliperGuideState
} from './instrument.sim';
import { createVernierCaliperGuideView } from './instrument.view';

export function createVernierCaliperGuide(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
}) {
  const sim = createVernierCaliperGuideSim(
    vernierCaliperGuideMeta.defaultParams
  );
  const view = createVernierCaliperGuideView(options);
  return { sim, view };
}

export const vernierCaliperGuideFactory: InstrumentFactory<
  VernierCaliperGuideState,
  typeof vernierCaliperGuideMeta.defaultParams
> = {
  meta: vernierCaliperGuideMeta,
  createSim() {
    return createVernierCaliperGuideSim(vernierCaliperGuideMeta.defaultParams);
  },
  createView(options) {
    return createVernierCaliperGuideView(options);
  }
};

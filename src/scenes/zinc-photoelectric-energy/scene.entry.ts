import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createZincPhotoelectricView } from './scene.view';
import {
  createZincPhotoelectricSim,
  type ChargeState,
  type ZincPhotoelectricParams,
  type ZincPhotoelectricState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateZincPhotoelectricSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ZincPhotoelectricState) => void;
};
export function asChargeState(value: unknown): ChargeState | undefined {
  if (value === 'rubbed' || value === 0 || value === '0') return 'rubbed';
  if (value === 'grounded' || value === 1 || value === '1') return 'grounded';
  return undefined;
}
export function createZincPhotoelectricScene(
  options: CreateZincPhotoelectricSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ZincPhotoelectricState;
  getSnapshot(): ZincPhotoelectricState;
  getParams(): ZincPhotoelectricParams;
  setParams(next: Partial<ZincPhotoelectricParams>): ZincPhotoelectricParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createZincPhotoelectricSim();
  const view = createZincPhotoelectricView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ZincPhotoelectricParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): ReadoutItem[] {
      const s = sim.getState();
      return [
        {
          key: 'photonEnergy',
          label: '光子能量',
          value: s.photonEnergy,
          digits: 2,
          unit: 'eV'
        },
        {
          key: 'workFunction',
          label: '逸出功',
          value: s.workFunction,
          digits: 2,
          unit: 'eV'
        },
        {
          key: 'maxKineticEnergy',
          label: '最大初动能',
          value: s.maxKineticEnergy,
          digits: 2,
          unit: 'eV'
        }
      ];
    }
  };
}

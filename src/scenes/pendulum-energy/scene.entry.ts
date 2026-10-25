import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createPendulumEnergySim,
  type PendulumEnergyParams,
  type PendulumEnergyState
} from './scene.sim';
import { createPendulumEnergyView } from './scene.view';
import type { ReadoutItem } from '../../platform/readout';

export type CreatePendulumEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PendulumEnergyState) => void;
};

export function createPendulumEnergyScene(
  options: CreatePendulumEnergySceneOptions = {}
): SceneLifecycle & {
  getState(): PendulumEnergyState;
  getSnapshot(): PendulumEnergyState;
  getParams(): PendulumEnergyParams;
  setParams(next: Partial<PendulumEnergyParams>): PendulumEnergyParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createPendulumEnergySim();
  const view = createPendulumEnergyView({
    canvas: options.canvas,
    theme: options.theme,
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
    setParams: base.wrapAction((next: Partial<PendulumEnergyParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'speed',
          label: '实时速度 v',
          value: state.speed,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'potentialEnergy',
          label: '重力势能 Eₚ',
          value: state.potentialEnergy,
          digits: 3,
          unit: 'J'
        },
        {
          key: 'kineticEnergy',
          label: '动能 Eₖ',
          value: state.kineticEnergy,
          digits: 3,
          unit: 'J'
        },
        {
          key: 'mechanicalEnergy',
          label: '机械能',
          value: state.mechanicalEnergy,
          digits: 3,
          unit: 'J'
        }
      ];
    }
  };
}

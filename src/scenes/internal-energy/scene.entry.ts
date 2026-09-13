import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createInternalEnergyView } from './scene.view';
import {
  createInternalEnergySim,
  type InternalEnergyExperiment,
  type InternalEnergyParams,
  type InternalEnergyState
} from './scene.sim';

export type CreateInternalEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: InternalEnergyState) => void;
};

export function createInternalEnergyScene(
  options: CreateInternalEnergySceneOptions = {}
) {
  const sim = createInternalEnergySim();
  const view = createInternalEnergyView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
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
    getState: (): InternalEnergyState => sim.getState(),
    getSnapshot: (): InternalEnergyState => sim.getSnapshot(),
    getParams: (): InternalEnergyParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<InternalEnergyParams>) =>
      sim.setParams(next)
    ),
    triggerExperiment: base.wrapAction((experiment: InternalEnergyExperiment) =>
      sim.triggerExperiment(experiment)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'temperature',
          label: '温度 T',
          value: `${state.temperature.toFixed(0)} °C`
        },
        {
          key: 'pressure',
          label: '压强 p',
          value: `${state.pressure.toFixed(0)} kPa`
        },
        {
          key: 'volume',
          label: '体积 V',
          value: `${state.volume.toFixed(1)} mL`
        },
        {
          key: 'deltaU',
          label: '内能变化 ΔU',
          value: `${state.deltaU >= 0 ? '+' : ''}${state.deltaU.toFixed(1)} J`
        }
      ];
    }
  };
}

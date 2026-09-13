import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createBindingEnergySim,
  type BindingEnergyParams,
  type BindingEnergyState
} from './scene.sim';
import { createBindingEnergyView } from './scene.view';
export type CreateBindingEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BindingEnergyState) => void;
};
export function createBindingEnergyScene(
  options: CreateBindingEnergySceneOptions = {}
) {
  const sim = createBindingEnergySim();
  const view = createBindingEnergyView({
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
    getState: (): BindingEnergyState => sim.getState(),
    getSnapshot: (): BindingEnergyState => sim.getSnapshot(),
    getParams: (): BindingEnergyParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<BindingEnergyParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems() {
      const s = sim.getState();
      return [
        { key: 'A', label: '质量数 A', value: `${s.point.A}` },
        {
          key: 'binding',
          label: '比结合能',
          value: `${s.point.binding.toFixed(2)} MeV`
        },
        { key: 'total', label: '总结合能', value: `${s.total.toFixed(1)} MeV` },
        { key: 'status', label: '区域', value: s.status }
      ];
    }
  };
}

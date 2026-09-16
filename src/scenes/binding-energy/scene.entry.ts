import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
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

function gainReadout(state: BindingEnergyState): {
  key: string;
  label: string;
  value: string;
} {
  if (state.fusionGain > 0) {
    return {
      key: 'gain',
      label: '聚变增益',
      value: `${state.fusionGain.toFixed(2)} MeV`
    };
  }
  if (state.fissionGain > 0) {
    return {
      key: 'gain',
      label: '裂变增益',
      value: `${state.fissionGain.toFixed(2)} MeV`
    };
  }
  return { key: 'gain', label: '增益', value: '0（铁峰）' };
}

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

  function getReadoutItems() {
    const s = sim.getState();
    return [
      {
        key: 'nuclide',
        label: '核素',
        value: `${s.point.symbol} ${s.point.name}`
      },
      { key: 'A', label: '质量数 A', value: `${s.point.A}` },
      {
        key: 'binding',
        label: '比结合能 E/A',
        value: `${s.point.binding.toFixed(2)} MeV`
      },
      {
        key: 'total',
        label: '总结合能 E',
        value: `${s.total.toFixed(1)} MeV`
      },
      { key: 'status', label: '区域', value: s.status },
      gainReadout(s),
      {
        key: 'formula',
        label: 'E',
        value: 'A × (E/A)',
        layout: 'full' as const
      }
    ];
  }

  return {
    ...base,
    getState: (): BindingEnergyState => sim.getState(),
    getSnapshot: (): BindingEnergyState => sim.getSnapshot(),
    getParams: (): BindingEnergyParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<BindingEnergyParams>): BindingEnergyParams =>
        sim.setParams(next)
    ),
    nudgeA: base.wrapAction((delta: number) => sim.nudgeA(delta)),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    getReadoutItems
  };
}

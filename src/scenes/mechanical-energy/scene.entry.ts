import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createMechanicalEnergyView } from './scene.view';
import {
  createMechanicalEnergySim,
  type MechanicalEnergyParams,
  type MechanicalEnergyState
} from './scene.sim';

export type CreateMechanicalEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MechanicalEnergyState) => void;
};

export function createMechanicalEnergyScene(
  options: CreateMechanicalEnergySceneOptions = {}
) {
  const sim = createMechanicalEnergySim();
  const view = createMechanicalEnergyView({
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
    const state = sim.getState();
    return [
      {
        key: 'acceleration',
        label: '加速度 a',
        value: `${state.acceleration.toFixed(2)} m/s²`
      },
      {
        key: 'energy',
        label: '能量状态',
        value: state.params.environment === 'ideal' ? '近似守恒' : '存在耗散'
      },
      { key: 'points', label: '计数点', value: `${state.points.length} 个` }
    ];
  }
  return {
    ...base,
    getState: (): MechanicalEnergyState => sim.getState(),
    getSnapshot: (): MechanicalEnergyState => sim.getSnapshot(),
    getParams: (): MechanicalEnergyParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MechanicalEnergyParams>) =>
      sim.setParams(next)
    ),
    release: base.wrapAction(() => sim.release()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems
  };
}

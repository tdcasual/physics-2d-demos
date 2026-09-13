import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createVariableWorkView } from './scene.view';
import {
  createVariableWorkSim,
  type VariableWorkParams,
  type VariableWorkState
} from './scene.sim';
export type CreateVariableWorkSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: VariableWorkState) => void;
};
export function createVariableWorkScene(
  options: CreateVariableWorkSceneOptions = {}
) {
  const sim = createVariableWorkSim();
  const view = createVariableWorkView({
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
      { key: 'force', label: '即时外力 F', value: `${s.force.toFixed(2)} N` },
      {
        key: 'velocity',
        label: '即时速度 v',
        value: `${s.velocity.toFixed(2)} m/s`
      },
      { key: 'power', label: '即时功率 P', value: `${s.power.toFixed(2)} W` },
      { key: 'work', label: '累计做功 W', value: `${s.work.toFixed(2)} J` }
    ];
  }
  return {
    ...base,
    getState: (): VariableWorkState => sim.getState(),
    getSnapshot: (): VariableWorkState => sim.getSnapshot(),
    getParams: (): VariableWorkParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<VariableWorkParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems
  };
}

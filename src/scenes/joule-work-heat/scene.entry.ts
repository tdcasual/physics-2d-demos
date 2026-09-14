import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createJouleSim, type JouleParams, type JouleState } from './scene.sim';
import { createJouleView } from './scene.view';

export type CreateJouleSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: JouleState) => void;
};

export function createJouleScene(options: CreateJouleSceneOptions = {}) {
  const sim = createJouleSim();
  const view = createJouleView({
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
    getState: (): JouleState => sim.getState(),
    getSnapshot: (): JouleState => sim.getSnapshot(),
    getParams: (): JouleParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<JouleParams>) =>
      sim.setParams(next)
    ),
    matchWork: base.wrapAction(() => sim.matchWork()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'activeWork',
          label: '输入做功 W',
          value: `${state.activeWork.toFixed(0)} J`
        },
        {
          key: 'temperatureRise',
          label: '温升 ΔT',
          value: `${state.temperatureRise.toFixed(2)} °C`
        },
        {
          key: 'mechanicalWork',
          label: '机械功 mgh',
          value: `${state.mechanicalWork.toFixed(0)} J`
        },
        {
          key: 'electricWork',
          label: '电功 UIt',
          value: `${state.electricWork.toFixed(0)} J`
        }
      ];
    }
  };
}

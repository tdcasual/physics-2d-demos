import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createLightbulbSim,
  type LightbulbParams,
  type LightbulbState
} from './scene.sim';
import { createLightbulbView } from './scene.view';
export type CreateLightbulbSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: LightbulbState) => void;
};
export function createLightbulbScene(
  options: CreateLightbulbSceneOptions = {}
) {
  const sim = createLightbulbSim();
  const view = createLightbulbView({
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
    getState: (): LightbulbState => sim.getState(),
    getSnapshot: (): LightbulbState => sim.getSnapshot(),
    getParams: (): LightbulbParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<LightbulbParams>) =>
      sim.setParams(next)
    ),
    recordPoint: base.wrapAction(() => sim.recordPoint()),
    resetCurve: base.wrapAction(() => sim.resetCurve()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'voltage',
          label: '灯泡电压 U',
          value: `${state.voltage.toFixed(2)} V`
        },
        {
          key: 'current',
          label: '干路电流 I',
          value: `${state.current.toFixed(2)} A`
        },
        {
          key: 'resistance',
          label: '即时电阻 R',
          value: `${state.resistance.toFixed(1)} Ω`
        },
        {
          key: 'power',
          label: '消耗功率 P',
          value: `${state.power.toFixed(2)} W`
        }
      ];
    }
  };
}

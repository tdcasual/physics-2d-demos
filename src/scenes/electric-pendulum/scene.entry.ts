import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createElectricPendulumView } from './scene.view';
import {
  createElectricPendulumSim,
  type PendulumParams,
  type PendulumState
} from './scene.sim';
export type CreateElectricPendulumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PendulumState) => void;
};
export function createElectricPendulumScene(
  options: CreateElectricPendulumSceneOptions = {}
) {
  const sim = createElectricPendulumSim();
  const view = createElectricPendulumView({
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
    getState: (): PendulumState => sim.getState(),
    getSnapshot: (): PendulumState => sim.getSnapshot(),
    getParams: (): PendulumParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PendulumParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'theta',
          label: '摆角 θ',
          value: `${((s.theta * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'speed',
          label: '瞬时速度 v',
          value: `${s.speed.toFixed(2)} v₀`
        },
        {
          key: 'electricForce',
          label: '电场力 Fₑ',
          value: `${s.electricForce.toFixed(2)} mg`
        },
        {
          key: 'tension',
          label: '绳张力 T',
          value: `${s.tension.toFixed(2)} mg`
        }
      ];
    }
  };
}

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createAccelForceSim,
  type AccelForceParams,
  type AccelForceState
} from './scene.sim';
import { createAccelForceView } from './scene.view';
export type CreateAccelForceSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AccelForceState) => void;
};
export function createAccelForceScene(
  options: CreateAccelForceSceneOptions = {}
) {
  const sim = createAccelForceSim();
  const view = createAccelForceView({
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
    getState: (): AccelForceState => sim.getState(),
    getSnapshot: (): AccelForceState => sim.getSnapshot(),
    getParams: (): AccelForceParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<AccelForceParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems() {
      const s = sim.getState();
      return [
        { key: 'force', label: '拉力 F', value: `${s.force.toFixed(3)} N` },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: `${s.acceleration.toFixed(2)} m/s²`
        },
        {
          key: 'velocity',
          label: '速度 v',
          value: `${s.velocity.toFixed(2)} m/s`
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}

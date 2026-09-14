import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createLocomotiveView } from './scene.view';
import {
  createLocomotiveSim,
  type LocomotiveParams,
  type LocomotiveState
} from './scene.sim';

export type CreateLocomotiveSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: LocomotiveState) => void;
};
export function createLocomotiveScene(
  options: CreateLocomotiveSceneOptions = {}
): SceneLifecycle & {
  getState(): LocomotiveState;
  getSnapshot(): LocomotiveState;
  getParams(): LocomotiveParams;
  setParams(next: Partial<LocomotiveParams>): LocomotiveParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createLocomotiveSim();
  const view = createLocomotiveView({
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
    setParams: base.wrapAction((next: Partial<LocomotiveParams>) =>
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
      const s = sim.getState();
      return [
        {
          key: 'velocity',
          label: '当前速度 v',
          value: `${s.velocity.toFixed(1)} m/s`
        },
        {
          key: 'accelerationNow',
          label: '瞬时加速度 a',
          value: `${s.accelerationNow.toFixed(2)} m/s²`
        },
        {
          key: 'tractionForce',
          label: '牵引力 F',
          value: `${(s.tractionForce / 1000).toFixed(2)} kN`
        },
        {
          key: 'actualPower',
          label: '实际功率 P',
          value: `${s.actualPower.toFixed(1)} kW`
        }
      ];
    }
  };
}

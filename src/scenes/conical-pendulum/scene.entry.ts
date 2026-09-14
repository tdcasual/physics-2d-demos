import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createConicalPendulumSim,
  type ConicalPendulumParams,
  type ConicalPendulumState
} from './scene.sim';
import { createConicalPendulumView } from './scene.view';

export type CreateConicalPendulumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ConicalPendulumState) => void;
};

export function createConicalPendulumScene(
  options: CreateConicalPendulumSceneOptions = {}
) {
  const sim = createConicalPendulumSim();
  const view = createConicalPendulumView({
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
    setParams: base.wrapAction((next: Partial<ConicalPendulumParams>) =>
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
      const state = sim.getState();
      return [
        {
          key: 'centripetalForce',
          label: '合力/向心力 Fₙ',
          value: `${state.centripetalForce.toFixed(2)} N`
        },
        {
          key: 'tension',
          label: '绳子拉力 T',
          value: `${state.tension.toFixed(2)} N`
        },
        {
          key: 'period',
          label: '周期 Tₚ',
          value: `${state.period.toFixed(2)} s`
        },
        {
          key: 'linearSpeed',
          label: '线速度 v',
          value: `${state.linearSpeed.toFixed(2)} m/s`
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): ConicalPendulumState;
    getSnapshot(): ConicalPendulumState;
    getParams(): ConicalPendulumParams;
    setParams(next: Partial<ConicalPendulumParams>): ConicalPendulumParams;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}

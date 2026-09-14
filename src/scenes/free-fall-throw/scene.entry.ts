import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFreeFallSim,
  type FreeFallMode,
  type FreeFallParams,
  type FreeFallState
} from './scene.sim';
import { createFreeFallView } from './scene.view';

export type CreateFreeFallSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: FreeFallState) => void;
};

export function createFreeFallScene(options: CreateFreeFallSceneOptions = {}) {
  const sim = createFreeFallSim();
  const view = createFreeFallView({
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
    setParams: base.wrapAction((next: Partial<FreeFallParams>) =>
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
          key: 'time',
          label: '运动时刻 t',
          value: `${state.time.toFixed(2)} s`
        },
        {
          key: 'height',
          label: '实时高度 h',
          value: `${state.height.toFixed(2)} m`
        },
        {
          key: 'velocity',
          label: '球 A 速度 v',
          value: `${state.velocity >= 0 ? '+' : ''}${state.velocity.toFixed(2)} m/s`
        },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: `${state.acceleration.toFixed(1)} m/s²`
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): FreeFallState;
    getSnapshot(): FreeFallState;
    getParams(): FreeFallParams;
    setParams(next: Partial<FreeFallParams>): FreeFallParams;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}

export function asFreeFallMode(value: unknown): FreeFallMode | null {
  return value === 'compare' || value === 'single' || value === 'reverse'
    ? value
    : null;
}

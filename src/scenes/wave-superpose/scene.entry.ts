import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createWaveSuperposeView } from './scene.view';
import {
  createWaveSuperposeSim,
  type WaveSuperposeParams,
  type WaveSuperposeState
} from './scene.sim';

export type CreateWaveSuperposeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: WaveSuperposeState) => void;
};

export function createWaveSuperposeScene(
  options: CreateWaveSuperposeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): WaveSuperposeState;
  getSnapshot(): WaveSuperposeState;
  getParams(): WaveSuperposeParams;
  setParams(next: Partial<WaveSuperposeParams>): WaveSuperposeParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createWaveSuperposeSim();
  const view = createWaveSuperposeView({
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
    resize() {
      view.resize();
    },
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<WaveSuperposeParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        { key: 'sum', label: '合位移 y', value: `${s.sum.toFixed(2)} m` },
        { key: 'y1', label: '波源 1', value: `${s.y1.toFixed(2)} m` },
        { key: 'y2', label: '波源 2', value: `${s.y2.toFixed(2)} m` },
        {
          key: 'speed',
          label: '波速',
          value: `${s.waveSpeed1.toFixed(2)} m/s`
        },
        { key: 'status', label: '状态', value: '矢量叠加' }
      ];
    }
  };
}

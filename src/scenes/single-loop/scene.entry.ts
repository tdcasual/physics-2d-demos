import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSingleLoopView } from './scene.view';
import {
  createSingleLoopSim,
  regionLabel,
  type SingleLoopParams,
  type SingleLoopState
} from './scene.sim';

export type CreateSingleLoopSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SingleLoopState) => void;
};

export function createSingleLoopScene(
  options: CreateSingleLoopSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): SingleLoopState;
  getSnapshot(): SingleLoopState;
  getParams(): SingleLoopParams;
  setParams(params: Partial<SingleLoopParams>): SingleLoopParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createSingleLoopSim();
  const view = createSingleLoopView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
    theme: options.theme ?? 'light',
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
    setParams: base.wrapAction((next: Partial<SingleLoopParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      if (sim.getState().finished) sim.rewind();
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    getTransportState(): { isPlaying: boolean; speed: number } {
      const state = sim.getState();
      return {
        isPlaying: state.params.autoRun && !state.finished,
        speed: 1
      };
    },
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      return [
        { key: 'region', label: '区域', value: regionLabel(state.region) },
        {
          key: 'position',
          label: 'x',
          value: `${state.position.toFixed(2)} m`
        },
        {
          key: 'velocity',
          label: 'v',
          value: `${state.velocity.toFixed(2)} m/s`
        },
        {
          key: 'current',
          label: 'i',
          value: `${state.current.toFixed(2)} A`
        }
      ];
    }
  };
}

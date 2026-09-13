import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSingleLoopView } from './scene.view';
import {
  createSingleLoopSim,
  type SingleLoopParams,
  type SingleLoopState
} from './scene.sim';

export type CreateSingleLoopSceneOptions = {
  canvas?: HTMLCanvasElement;
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
} {
  const sim = createSingleLoopSim();
  const view = createSingleLoopView({
    canvas: options.canvas,
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
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      { key: 'region', label: '阶段', value: state.region },
      {
        key: 'position',
        label: '位置 x',
        value: `${state.position.toFixed(2)} m`
      },
      {
        key: 'velocity',
        label: '速度 v',
        value: `${state.velocity.toFixed(2)} m/s`
      },
      {
        key: 'current',
        label: '电流 i',
        value: `${state.current.toFixed(2)} A`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<SingleLoopParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

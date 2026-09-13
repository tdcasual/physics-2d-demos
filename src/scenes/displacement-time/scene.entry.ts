import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createDisplacementTimeSim,
  type DisplacementTimeParams,
  type DisplacementTimeState
} from './scene.sim';
import { createDisplacementTimeView } from './scene.view';

export type CreateDisplacementTimeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: DisplacementTimeState) => void;
};

export function createDisplacementTimeScene(
  options: CreateDisplacementTimeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): DisplacementTimeState;
  getSnapshot(): DisplacementTimeState;
  getParams(): DisplacementTimeParams;
  setParams(params: Partial<DisplacementTimeParams>): DisplacementTimeParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createDisplacementTimeSim();
  const view = createDisplacementTimeView({
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
      { key: 'time', label: '时刻 t', value: `${state.time.toFixed(2)} s` },
      {
        key: 'velocity',
        label: '瞬时速度 v',
        value: `${state.velocity.toFixed(2)} m/s`
      },
      {
        key: 'displacement',
        label: '总位移 x',
        value: `${state.displacement.toFixed(2)} m`
      }
    ];
  }

  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<DisplacementTimeParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

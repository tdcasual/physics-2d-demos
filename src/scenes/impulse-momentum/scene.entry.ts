import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createImpulseMomentumView } from './scene.view';
import {
  asImpulseForceModel,
  createImpulseMomentumSim,
  type ImpulseForceModel,
  type ImpulseMomentumParams,
  type ImpulseMomentumState
} from './scene.sim';

export type CreateImpulseMomentumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ImpulseMomentumState) => void;
};

export function createImpulseMomentumScene(
  options: CreateImpulseMomentumSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ImpulseMomentumState;
  getSnapshot(): ImpulseMomentumState;
  getParams(): ImpulseMomentumParams;
  setParams(params: Partial<ImpulseMomentumParams>): ImpulseMomentumParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createImpulseMomentumSim();
  const view = createImpulseMomentumView({
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
      { key: 'time', label: '时间 t', value: `${state.time.toFixed(2)} s` },
      {
        key: 'force',
        label: '合外力 Fₓ',
        value: `${state.force.toFixed(2)} N`
      },
      {
        key: 'impulse',
        label: '冲量 Iₓ',
        value: `${state.impulse.toFixed(2)} N·s`
      },
      {
        key: 'velocity',
        label: '速度 v',
        value: `${state.velocity.toFixed(2)} m/s`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ImpulseMomentumParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

export function asForceModel(value: unknown): ImpulseForceModel | undefined {
  return asImpulseForceModel(value);
}

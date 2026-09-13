import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createCentripetalView } from './scene.view';
import {
  createCentripetalSim,
  type CentripetalParams,
  type CentripetalState
} from './scene.sim';

export type CreateCentripetalSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CentripetalState) => void;
};

export function createCentripetalScene(
  options: CreateCentripetalSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): CentripetalState;
  getSnapshot(): CentripetalState;
  getParams(): CentripetalParams;
  setParams(params: Partial<CentripetalParams>): CentripetalParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createCentripetalSim();
  const view = createCentripetalView({
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
      {
        key: 'speed',
        label: '线速度 v',
        value: `${state.speed.toFixed(2)} m/s`
      },
      {
        key: 'centripetalAcceleration',
        label: '向心加速度 aₙ',
        value: `${state.centripetalAcceleration.toFixed(2)} m/s²`
      },
      {
        key: 'centripetalForce',
        label: '向心力 Fₙ',
        value: `${state.centripetalForce.toFixed(2)} N`
      },
      {
        key: 'period',
        label: '运动周期 T',
        value: `${state.period.toFixed(2)} s`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<CentripetalParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

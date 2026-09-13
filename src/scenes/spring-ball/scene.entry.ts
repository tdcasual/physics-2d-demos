import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSpringBallView } from './scene.view';
import {
  createSpringBallSim,
  type SpringBallMode,
  type SpringBallParams,
  type SpringBallPreset,
  type SpringBallState
} from './scene.sim';

export type CreateSpringBallSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SpringBallState) => void;
};

export function asPreset(value: unknown): SpringBallPreset | undefined {
  if (
    value === 'h0' ||
    value === 'h-x0' ||
    value === 'h-2x0' ||
    value === 'h-3x0'
  )
    return value;
  if (typeof value === 'number')
    return (['h0', 'h-x0', 'h-2x0', 'h-3x0'][value] ?? undefined) as
      | SpringBallPreset
      | undefined;
  return undefined;
}

export function asMode(value: unknown): SpringBallMode | undefined {
  if (value === 'single' || value === 'continuous') return value;
  if (typeof value === 'number') return value > 0 ? 'continuous' : 'single';
  return undefined;
}

export function createSpringBallScene(
  options: CreateSpringBallSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): SpringBallState;
  getSnapshot(): SpringBallState;
  getParams(): SpringBallParams;
  setParams(params: Partial<SpringBallParams>): SpringBallParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createSpringBallSim();
  const view = createSpringBallView({
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
      { key: 'stage', label: '运动阶段', value: state.stage },
      {
        key: 'velocity',
        label: '速度 v',
        value: `${state.velocity.toFixed(2)} m/s`
      },
      {
        key: 'acceleration',
        label: '加速度 a',
        value: `${state.acceleration.toFixed(2)} m/s²`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<SpringBallParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

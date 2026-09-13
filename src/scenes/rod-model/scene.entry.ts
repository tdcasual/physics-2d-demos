import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createRodModelView } from './scene.view';
import {
  createRodModelSim,
  type RodModel,
  type RodParams,
  type RodState
} from './scene.sim';

export type CreateRodModelSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RodState) => void;
};

export function createRodModelScene(
  options: CreateRodModelSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): RodState;
  getSnapshot(): RodState;
  getParams(): RodParams;
  setParams(params: Partial<RodParams>): RodParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createRodModelSim();
  const view = createRodModelView({
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
        key: 'model',
        label: '模型',
        value: state.params.model === 'resistor' ? '纯电阻棒' : '纯电容棒'
      },
      {
        key: 'velocity',
        label: '速度 v',
        value: `${state.velocity.toFixed(2)} m/s`
      },
      {
        key: 'acceleration',
        label: '加速度 a',
        value: `${state.acceleration.toFixed(2)} m/s²`
      },
      {
        key: 'magneticForce',
        label: '安培力 F安',
        value: `${state.magneticForce.toFixed(2)} N`
      },
      {
        key: 'current',
        label: '感应电流 I',
        value: `${state.current.toFixed(2)} A`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<RodParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

export function asRodModel(value: unknown): RodModel | null {
  if (value === 'resistor' || value === 0 || value === '0') return 'resistor';
  if (value === 'capacitor' || value === 1 || value === '1') return 'capacitor';
  return null;
}

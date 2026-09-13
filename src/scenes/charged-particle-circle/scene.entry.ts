import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createChargedParticleSim,
  type ChargedParticleParams,
  type ChargedParticleState,
  type FieldDirection
} from './scene.sim';
import { createChargedParticleView } from './scene.view';

export type CreateChargedParticleSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ChargedParticleState) => void;
};

export function asFieldDirection(value: unknown): FieldDirection | undefined {
  if (value === 'into' || value === 'out') return value;
  if (typeof value === 'number') return value > 0 ? 'out' : 'into';
  return undefined;
}

export function createChargedParticleScene(
  options: CreateChargedParticleSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ChargedParticleState;
  getSnapshot(): ChargedParticleState;
  getParams(): ChargedParticleParams;
  setParams(params: Partial<ChargedParticleParams>): ChargedParticleParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createChargedParticleSim();
  const view = createChargedParticleView({
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
        key: 'radius',
        label: '轨道半径 R',
        value: `${state.radius.toFixed(0)}`
      },
      {
        key: 'period',
        label: '运动周期 T',
        value: `${(state.period / Math.PI).toFixed(1)}π`
      },
      {
        key: 'force',
        label: '洛伦兹力',
        value: `${state.forceMagnitude.toFixed(1)}`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ChargedParticleParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

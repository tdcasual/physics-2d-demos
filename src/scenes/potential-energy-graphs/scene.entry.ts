import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createPotentialGraphView } from './scene.view';
import {
  createPotentialGraphSim,
  type PotentialGraphParams,
  type PotentialGraphState,
  type PotentialScenario
} from './scene.sim';

export type CreatePotentialGraphSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PotentialGraphState) => void;
};

export function asPotentialScenario(
  value: unknown
): PotentialScenario | undefined {
  if (value === 'segments' || value === 'point' || value === 'dipole')
    return value;
  if (typeof value === 'number')
    return value === 1 ? 'point' : value === 2 ? 'dipole' : 'segments';
  return undefined;
}

export function createPotentialGraphScene(
  options: CreatePotentialGraphSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): PotentialGraphState;
  getSnapshot(): PotentialGraphState;
  getParams(): PotentialGraphParams;
  setParams(params: Partial<PotentialGraphParams>): PotentialGraphParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createPotentialGraphSim();
  const view = createPotentialGraphView({
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
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PotentialGraphParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      return [
        {
          key: 'position',
          label: '探针位置 x',
          value: `${state.probePosition.toFixed(2)} m`
        },
        {
          key: 'potential',
          label: '电势 φ',
          value: `${state.potential.toFixed(2)} V`
        },
        {
          key: 'field',
          label: '场强 E',
          value: `${state.field >= 0 ? '+' : ''}${state.field.toFixed(2)} V/m`
        },
        {
          key: 'energy',
          label: '电势能 Ep',
          value: `${state.potentialEnergy.toFixed(2)} μJ`
        }
      ];
    }
  };
}

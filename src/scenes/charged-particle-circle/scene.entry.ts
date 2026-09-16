import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  asFieldDirection,
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
  initialParams?: Partial<ChargedParticleParams>;
};

function formatRadius(radius: number): string {
  if (!Number.isFinite(radius)) return '—';
  return `${radius >= 10 ? radius.toFixed(0) : radius.toFixed(1)} m`;
}

function formatPeriod(period: number): string {
  if (!Number.isFinite(period) || period <= 0) return '—';
  return `${(period / Math.PI).toFixed(2)}π s`;
}

function formatForce(force: number): string {
  if (!Number.isFinite(force)) return '—';
  return `${force.toFixed(1)} N`;
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
  const sim = createChargedParticleSim(options.initialParams);
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
    onReadout: options.onReadout,
    resetView: () => view.reset()
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
        value: formatRadius(state.radius)
      },
      {
        key: 'period',
        label: '运动周期 T',
        value: formatPeriod(state.period)
      },
      {
        key: 'force',
        label: '洛伦兹力 |F|',
        value: formatForce(state.forceMagnitude)
      },
      {
        key: 'period-hint',
        label: '提示',
        value: 'T 与 v 无关'
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

export { asFieldDirection };
export type { FieldDirection };

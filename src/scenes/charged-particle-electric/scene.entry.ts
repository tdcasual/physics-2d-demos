import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createChargedParticleElectricView } from './scene.view';
import {
  createChargedParticleElectricSim,
  type ChargedParticleElectricParams,
  type ChargedParticleElectricState,
  type ElectricParticle
} from './scene.sim';

export type CreateChargedParticleElectricSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ChargedParticleElectricState) => void;
};

export function asElectricParticle(
  value: unknown
): ElectricParticle | undefined {
  return value === 'proton' || value === 'alpha' || value === 'electron'
    ? value
    : undefined;
}

export function createChargedParticleElectricScene(
  options: CreateChargedParticleElectricSceneOptions = {}
) {
  const sim = createChargedParticleElectricSim();
  const view = createChargedParticleElectricView({
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
  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'v0',
        label: '入场初速度 v₀',
        value: `${(state.v0 / 1e5).toFixed(2)} × 10⁵ m/s`
      },
      {
        key: 'y',
        label: '出板侧移 |y|',
        value: `${(Math.abs(state.y) * 100).toFixed(2)} cm`
      },
      {
        key: 'tanTheta',
        label: '偏转正切 |tan θ|',
        value: `${Math.abs(state.tanTheta).toFixed(3)} (${Math.abs(state.theta).toFixed(1)}°)`
      },
      {
        key: 'screenY',
        label: '屏上侧移 |Y|',
        value: `${(Math.abs(state.screenY) * 100).toFixed(2)} cm`
      }
    ];
  }
  return {
    ...base,
    getState: (): ChargedParticleElectricState => sim.getState(),
    getSnapshot: (): ChargedParticleElectricState => sim.getSnapshot(),
    getParams: (): ChargedParticleElectricParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ChargedParticleElectricParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems
  };
}

import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createProjectileComponentsView } from './scene.view';
import {
  createProjectileComponentsSim,
  formatFixed,
  type ProjectileComponentsParams,
  type ProjectileComponentsState
} from './scene.sim';

export type CreateProjectileComponentsSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ProjectileComponentsState) => void;
};

export function createProjectileComponentsScene(
  options: CreateProjectileComponentsSceneOptions = {}
) {
  const sim = createProjectileComponentsSim();
  const view = createProjectileComponentsView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
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
        key: 'time',
        label: 't / T',
        value: `${formatFixed(state.time, 2)} / ${formatFixed(state.flightTime, 2)} s`
      },
      {
        key: 'x',
        label: 'x = v₀t',
        value: `${formatFixed(state.x)} m`
      },
      {
        key: 'vx',
        label: 'vₓ = v₀',
        value: `${formatFixed(state.vx)} m/s`
      },
      {
        key: 'verticalDisplacement',
        label: 'y = ½gt²',
        value: `${formatFixed(state.verticalDisplacement)} m`
      },
      {
        key: 'vy',
        label: 'vᵧ = gt',
        value: `${formatFixed(state.vy)} m/s`
      },
      {
        key: 'speed',
        label: 'v = √(vₓ²+vᵧ²)',
        value: `${formatFixed(state.speed)} m/s`
      }
    ];
  }
  return {
    ...base,
    getState: (): ProjectileComponentsState => sim.getState(),
    getSnapshot: (): ProjectileComponentsState => sim.getSnapshot(),
    getParams: (): ProjectileComponentsParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ProjectileComponentsParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems
  };
}

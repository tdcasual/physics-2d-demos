import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createProjectileComponentsView } from './scene.view';
import {
  createProjectileComponentsSim,
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
      { key: 'time', label: '时间 t', value: `${state.time.toFixed(2)} s` },
      { key: 'x', label: '水平位移 x', value: `${state.x.toFixed(1)} m` },
      {
        key: 'verticalDisplacement',
        label: '竖直位移 y',
        value: `${state.verticalDisplacement.toFixed(1)} m`
      },
      {
        key: 'speed',
        label: '合速度 v',
        value: `${state.speed.toFixed(1)} m/s`
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

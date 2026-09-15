import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createProjectileDataSim,
  type ProjectileDataParams,
  type ProjectileDataState
} from './scene.sim';
import { createProjectileDataView } from './scene.view';

export type CreateProjectileDataSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ProjectileDataState) => void;
};

export function createProjectileDataScene(
  options: CreateProjectileDataSceneOptions = {}
) {
  const sim = createProjectileDataSim();
  const view = createProjectileDataView({
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

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      {
        key: 'delta-x',
        label: '水平等间距 Δx',
        value: `${state.deltaX.toFixed(3)} m`
      },
      {
        key: 'delta-y2',
        label: '竖直二阶差 Δ²y',
        value: `${state.deltaY2.toFixed(3)} m`
      },
      {
        key: 'restored-v0',
        label: '还原 v₀',
        value: `${state.restoredV0.toFixed(2)} m/s`
      },
      {
        key: 'current',
        label: '当前速度',
        value: `${state.speed.toFixed(2)} m/s`
      }
    ];
  }

  return {
    ...base,
    getState: (): ProjectileDataState => sim.getState(),
    getSnapshot: (): ProjectileDataState => sim.getSnapshot(),
    getParams: (): ProjectileDataParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<ProjectileDataParams>): ProjectileDataParams =>
        sim.setParams(next)
    ),
    getReadoutItems
  };
}

import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSatelliteView } from './scene.view';
import {
  createSatelliteSim,
  type SatelliteParams,
  type SatelliteState
} from './scene.sim';

export type CreateSatelliteSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SatelliteState) => void;
};

export function createSatelliteScene(
  options: CreateSatelliteSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): SatelliteState;
  getSnapshot(): SatelliteState;
  getParams(): SatelliteParams;
  setParams(params: Partial<SatelliteParams>): SatelliteParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createSatelliteSim();
  const view = createSatelliteView({
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
  return {
    ...base,
    resize() {
      view.resize();
    },
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<SatelliteParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        { key: 'status', label: '状态', value: state.status },
        {
          key: 'radius',
          label: '半径 r',
          value: `${state.radius.toFixed(1)} km`
        },
        {
          key: 'speed',
          label: '速度 v',
          value: `${state.speed.toFixed(2)} km/s`
        },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: `${state.acceleration.toFixed(3)} km/s²`
        },
        {
          key: 'period',
          label: '周期 T',
          value: `${state.orbitalPeriod.toFixed(2)} s`
        }
      ];
    }
  };
}

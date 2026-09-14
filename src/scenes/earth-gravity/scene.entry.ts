import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createEarthGravitySim,
  type EarthGravityParams,
  type EarthGravityState
} from './scene.sim';
import { createEarthGravityView } from './scene.view';

export type CreateEarthGravitySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: EarthGravityState) => void;
};

export function createEarthGravityScene(
  options: CreateEarthGravitySceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): EarthGravityState;
  getSnapshot(): EarthGravityState;
  getParams(): EarthGravityParams;
  setParams(params: Partial<EarthGravityParams>): EarthGravityParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createEarthGravitySim();
  const view = createEarthGravityView({
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
    setParams: base.wrapAction((next: Partial<EarthGravityParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'gravitationalForce',
          label: '万有引力 F万',
          value: `${state.gravitationalForce.toFixed(4)} N`
        },
        {
          key: 'centripetalForce',
          label: '向心力 F向',
          value: `${state.centripetalForce.toFixed(4)} N`
        },
        {
          key: 'weight',
          label: '重力 G',
          value: `${state.weight.toFixed(4)} N`
        },
        { key: 'angle', label: '偏角 α', value: `${state.angle.toFixed(3)}°` }
      ];
    }
  };
}

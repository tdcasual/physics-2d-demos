import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createCarBankSim,
  type CarBankParams,
  type CarBankState
} from './scene.sim';
import { createCarBankView } from './scene.view';

export type CreateCarBankSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CarBankState) => void;
};

export function createCarBankScene(options: CreateCarBankSceneOptions = {}) {
  const sim = createCarBankSim();
  const view = createCarBankView({
    canvas: options.canvas,
    theme: options.theme,
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
    setParams: base.wrapAction((next: Partial<CarBankParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'criticalSpeed',
          label: '无摩擦临界速度 v₀',
          value: `${state.criticalSpeed.toFixed(1)} m/s`
        },
        {
          key: 'frictionForce',
          label: '静摩擦力 f',
          value: `${(state.frictionForce / 1000).toFixed(2)} kN · ${state.frictionDirection}`
        },
        {
          key: 'normalForce',
          label: '支持力 N',
          value: `${(state.normalForce / 1000).toFixed(1)} kN`
        },
        {
          key: 'centripetalForce',
          label: '向心力 Fₙ',
          value: `${(state.centripetalForce / 1000).toFixed(1)} kN`
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): CarBankState;
    getSnapshot(): CarBankState;
    getParams(): CarBankParams;
    setParams(next: Partial<CarBankParams>): CarBankParams;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}

import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createUniformElectricAccelerationSim,
  type UniformElectricAccelerationParams,
  type UniformElectricAccelerationState
} from './scene.sim';
import { createUniformElectricAccelerationView } from './scene.view';

export type CreateUniformElectricAccelerationSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: UniformElectricAccelerationState) => void;
};

export function createUniformElectricAccelerationScene(
  options: CreateUniformElectricAccelerationSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): UniformElectricAccelerationState;
  getSnapshot(): UniformElectricAccelerationState;
  getParams(): UniformElectricAccelerationParams;
  setParams(
    next: Partial<UniformElectricAccelerationParams>
  ): UniformElectricAccelerationParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createUniformElectricAccelerationSim();
  const view = createUniformElectricAccelerationView({
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
    setParams: base.wrapAction(
      (next: Partial<UniformElectricAccelerationParams>) => sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'electricField',
          label: '电场强度 E',
          value: `${state.electricField.toFixed(0)} N/C`
        },
        {
          key: 'force',
          label: '电场力 F',
          value: `${state.force.toExponential(2)} N`
        },
        {
          key: 'speed',
          label: '当前速度 v',
          value: `${(state.speed / 1e5).toFixed(2)}×10⁵ m/s`
        },
        {
          key: 'finalSpeed',
          label: '末速度 v末',
          value: `${(state.finalSpeed / 1e5).toFixed(2)}×10⁵ m/s`
        },
        {
          key: 'work',
          label: '电场力做功 W',
          value: `${state.work.toExponential(2)} J`
        }
      ];
    }
  };
}

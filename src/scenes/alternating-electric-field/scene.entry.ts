import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createAlternatingElectricFieldSim,
  type AlternatingCharge,
  type AlternatingElectricFieldParams,
  type AlternatingElectricFieldState
} from './scene.sim';
import { createAlternatingElectricFieldView } from './scene.view';

export type CreateAlternatingElectricFieldSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AlternatingElectricFieldState) => void;
};

export function asAlternatingCharge(
  value: unknown
): AlternatingCharge | undefined {
  return value === 'electron' || value === 'positive' ? value : undefined;
}

export function createAlternatingElectricFieldScene(
  options: CreateAlternatingElectricFieldSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): AlternatingElectricFieldState;
  getSnapshot(): AlternatingElectricFieldState;
  getParams(): AlternatingElectricFieldParams;
  setParams(
    next: Partial<AlternatingElectricFieldParams>
  ): AlternatingElectricFieldParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createAlternatingElectricFieldSim();
  const view = createAlternatingElectricFieldView({
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
      (next: Partial<AlternatingElectricFieldParams>) => sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'phase',
          label: '相位 φ',
          value: `${(state.phase * 360).toFixed(0)}°`
        },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: `${state.acceleration.toFixed(2)} a₀`
        },
        {
          key: 'velocity',
          label: '速度 v',
          value: `${state.velocity.toFixed(2)} v₀`
        },
        {
          key: 'position',
          label: '位置 x',
          value: `${state.position.toFixed(1)} mm`
        }
      ];
    }
  };
}

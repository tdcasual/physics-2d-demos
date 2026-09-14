import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createVelocitySelectorSim,
  type SelectorCharge,
  type VelocitySelectorParams,
  type VelocitySelectorState
} from './scene.sim';
import { createVelocitySelectorView } from './scene.view';

export type CreateVelocitySelectorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: VelocitySelectorState) => void;
};

export function asSelectorCharge(value: unknown): SelectorCharge | undefined {
  return value === 'positive' || value === 'negative' ? value : undefined;
}

export function createVelocitySelectorScene(
  options: CreateVelocitySelectorSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): VelocitySelectorState;
  getSnapshot(): VelocitySelectorState;
  getParams(): VelocitySelectorParams;
  setParams(next: Partial<VelocitySelectorParams>): VelocitySelectorParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createVelocitySelectorSim();
  const view = createVelocitySelectorView({
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
    setParams: base.wrapAction((next: Partial<VelocitySelectorParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'balanceSpeed',
          label: '匹配速度 E/B',
          value: `${state.balanceSpeed.toFixed(2)} v₀*`
        },
        {
          key: 'electricForce',
          label: '电场力',
          value: `${state.electricForce.toFixed(2)} F₀`
        },
        {
          key: 'magneticForce',
          label: '洛伦兹力',
          value: `${state.magneticForce.toFixed(2)} F₀`
        },
        { key: 'status', label: '状态', value: state.status }
      ];
    }
  };
}

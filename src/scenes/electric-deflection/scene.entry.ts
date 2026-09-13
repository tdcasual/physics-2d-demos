import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createElectricDeflectionSim,
  type DeflectionParticle,
  type ElectricDeflectionParams,
  type ElectricDeflectionState
} from './scene.sim';
import { createElectricDeflectionView } from './scene.view';

export type CreateElectricDeflectionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ElectricDeflectionState) => void;
};

export function asDeflectionParticle(
  value: unknown
): DeflectionParticle | undefined {
  return value === 'electron' || value === 'proton' ? value : undefined;
}

export function createElectricDeflectionScene(
  options: CreateElectricDeflectionSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ElectricDeflectionState;
  getSnapshot(): ElectricDeflectionState;
  getParams(): ElectricDeflectionParams;
  setParams(next: Partial<ElectricDeflectionParams>): ElectricDeflectionParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createElectricDeflectionSim();
  const view = createElectricDeflectionView({
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
    setParams: base.wrapAction((next: Partial<ElectricDeflectionParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'field',
          label: '场强 E',
          value: `${state.field.toFixed(1)} V/m`
        },
        {
          key: 'deflection',
          label: '出板偏转 |y|',
          value: `${(Math.abs(state.deflection) * 100).toFixed(1)} cm`
        },
        {
          key: 'screen',
          label: '屏上偏转 |Y|',
          value: `${(Math.abs(state.screenDeflection) * 100).toFixed(1)} cm`
        },
        {
          key: 'theta',
          label: '偏转角 |θ|',
          value: `${Math.abs(state.theta).toFixed(1)}°`
        },
        { key: 'status', label: '状态', value: state.status }
      ];
    }
  };
}

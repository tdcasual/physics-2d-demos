import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createAlternatingElectricDeflectionSim,
  type AlternatingElectricDeflectionParams,
  type AlternatingElectricDeflectionState,
  type DeflectionCharge
} from './scene.sim';
import { createAlternatingElectricDeflectionView } from './scene.view';

export type CreateAlternatingElectricDeflectionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AlternatingElectricDeflectionState) => void;
};

export function asDeflectionCharge(
  value: unknown
): DeflectionCharge | undefined {
  return value === 'positive' || value === 'negative' ? value : undefined;
}

export function createAlternatingElectricDeflectionScene(
  options: CreateAlternatingElectricDeflectionSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): AlternatingElectricDeflectionState;
  getSnapshot(): AlternatingElectricDeflectionState;
  getParams(): AlternatingElectricDeflectionParams;
  setParams(
    next: Partial<AlternatingElectricDeflectionParams>
  ): AlternatingElectricDeflectionParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createAlternatingElectricDeflectionSim();
  const view = createAlternatingElectricDeflectionView({
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
      (next: Partial<AlternatingElectricDeflectionParams>) =>
        sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        { key: 'time', label: '飞行时间', value: `${state.time.toFixed(2)} T` },
        {
          key: 'voltage',
          label: '即时电压',
          value: `${state.voltage >= 0 ? '+' : '−'}U₀`
        },
        {
          key: 'velocityY',
          label: '竖直速度',
          value: `${(state.velocityY / Math.max(1e-9, state.velocityScale)).toFixed(2)} vₘ`
        },
        {
          key: 'positionY',
          label: '竖直位移',
          value: `${(state.positionY / Math.max(1e-9, state.positionScale)).toFixed(3)} a₀T²`
        }
      ];
    }
  };
}

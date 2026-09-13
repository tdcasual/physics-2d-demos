import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createElectricFieldView } from './scene.view';
import {
  createElectricFieldSim,
  type ElectricFieldParams,
  type ElectricFieldState
} from './scene.sim';
export type CreateElectricFieldSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ElectricFieldState) => void;
};
export function createElectricFieldScene(
  options: CreateElectricFieldSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ElectricFieldState;
  getSnapshot(): ElectricFieldState;
  getParams(): ElectricFieldParams;
  setParams(next: Partial<ElectricFieldParams>): ElectricFieldParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createElectricFieldSim();
  const view = createElectricFieldView({
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
    setParams: base.wrapAction((next: Partial<ElectricFieldParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'field',
          label: '场强 E',
          value: `${s.fieldStrength.toFixed(2)} V/m`
        },
        {
          key: 'drift',
          label: '漂移速率 v',
          value: `${s.driftVelocity.toFixed(2)} m/s`
        },
        { key: 'current', label: '电流 I', value: `${s.current.toFixed(2)} A` },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}

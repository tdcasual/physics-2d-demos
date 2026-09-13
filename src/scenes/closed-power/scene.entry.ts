import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createClosedPowerSim,
  type ClosedPowerParams,
  type ClosedPowerState
} from './scene.sim';
import { createClosedPowerView } from './scene.view';

export type CreateClosedPowerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ClosedPowerState) => void;
};

export function createClosedPowerScene(
  options: CreateClosedPowerSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ClosedPowerState;
  getSnapshot(): ClosedPowerState;
  getParams(): ClosedPowerParams;
  setParams(next: Partial<ClosedPowerParams>): ClosedPowerParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createClosedPowerSim();
  const view = createClosedPowerView({
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
    setParams: base.wrapAction((next: Partial<ClosedPowerParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'current',
          label: '回路电流 I',
          value: `${state.current.toFixed(2)} A`
        },
        {
          key: 'terminalVoltage',
          label: '路端电压 U',
          value: `${state.terminalVoltage.toFixed(2)} V`
        },
        {
          key: 'outputPower',
          label: '输出功率 P出',
          value: `${state.outputPower.toFixed(2)} W`
        },
        {
          key: 'internalPower',
          label: '内阻功率 P内',
          value: `${state.internalPower.toFixed(2)} W`
        },
        {
          key: 'efficiency',
          label: '供电效率 η',
          value: `${(state.efficiency * 100).toFixed(1)} %`
        }
      ];
    }
  };
}

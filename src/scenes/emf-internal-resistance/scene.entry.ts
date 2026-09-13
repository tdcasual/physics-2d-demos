import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createEmfInternalView } from './scene.view';
import {
  createEmfInternalSim,
  type EmfInternalParams,
  type EmfInternalState
} from './scene.sim';

export type CreateEmfInternalSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: EmfInternalState) => void;
};

export function asSourceVoltage(value: unknown): number | undefined {
  const n = Number(value);
  return n === 1.5 || n === 3 || n === 6 ? n : undefined;
}

export function asInternalResistance(value: unknown): number | undefined {
  const n = Number(value);
  return n === 0.5 || n === 1 || n === 2 ? n : undefined;
}

export function createEmfInternalScene(
  options: CreateEmfInternalSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): EmfInternalState;
  getSnapshot(): EmfInternalState;
  getParams(): EmfInternalParams;
  setParams(params: Partial<EmfInternalParams>): EmfInternalParams;
  toggleSwitch(): boolean;
  recordPoint(): boolean;
  fitRecords(): EmfInternalState['fit'];
  clearRecords(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createEmfInternalSim();
  const view = createEmfInternalView({
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
    setParams: base.wrapAction((next: Partial<EmfInternalParams>) =>
      sim.setParams(next)
    ),
    toggleSwitch: base.wrapAction(() => sim.toggleSwitch()),
    recordPoint: base.wrapAction(() => sim.recordPoint()),
    fitRecords: base.wrapAction(() => sim.fitRecords()),
    clearRecords: base.wrapAction(() => sim.clearRecords()),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      return [
        {
          key: 'voltage',
          label: '端电压 U',
          value: `${state.terminalVoltage.toFixed(2)} V`
        },
        {
          key: 'current',
          label: '电流 I',
          value: `${state.current.toFixed(3)} A`
        },
        {
          key: 'records',
          label: '记录组数',
          value: `${state.records.length}/${6}`
        },
        {
          key: 'fit',
          label: '拟合结果',
          value: state.fit ? `E=${state.fit.emf.toFixed(2)} V` : '待拟合'
        }
      ];
    }
  };
}

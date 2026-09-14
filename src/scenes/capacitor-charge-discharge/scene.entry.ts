import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createCapacitorSim,
  type CapacitorParams,
  type CapacitorState
} from './scene.sim';
import { createCapacitorView } from './scene.view';

export type CreateCapacitorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CapacitorState) => void;
};

export function createCapacitorScene(
  options: CreateCapacitorSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): CapacitorState;
  getSnapshot(): CapacitorState;
  getParams(): CapacitorParams;
  setParams(params: Partial<CapacitorParams>): CapacitorParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createCapacitorSim();
  const view = createCapacitorView({
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
    setParams: base.wrapAction((next: Partial<CapacitorParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'voltageAcross',
          label: '极板电压 Uc',
          value: `${state.voltageAcross.toFixed(2)} V`
        },
        {
          key: 'currentMilliamp',
          label: '回路电流 I',
          value: `${state.currentMilliamp.toFixed(2)} mA`
        },
        {
          key: 'chargeMicrocoulomb',
          label: '积累电荷 Q',
          value: `${state.chargeMicrocoulomb.toFixed(1)} μC`
        },
        { key: 'tau', label: '时间常数 τ', value: `${state.tau.toFixed(2)} s` }
      ];
    }
  };
}

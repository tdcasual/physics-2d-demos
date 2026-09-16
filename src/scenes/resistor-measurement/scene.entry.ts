import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createResistorView } from './scene.view';
import {
  asCircuitMode,
  asMeterMode,
  createResistorSim,
  type ResistorCircuitMode,
  type ResistorMeterMode,
  type ResistorParams,
  type ResistorState
} from './scene.sim';

export type CreateResistorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ResistorState) => void;
  initialParams?: Partial<ResistorParams>;
};

export { asCircuitMode, asMeterMode };

export function createResistorScene(
  options: CreateResistorSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ResistorState;
  getSnapshot(): ResistorState;
  getParams(): ResistorParams;
  setParams(params: Partial<ResistorParams>): ResistorParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createResistorSim(options.initialParams);
  const view = createResistorView({
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
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      {
        key: 'voltage',
        label: '电压表读数',
        value: `${state.voltageMeasured.toFixed(2)} V`
      },
      {
        key: 'current',
        label: '电流表读数',
        value: `${state.measuredCurrent.toFixed(3)} A`
      },
      {
        key: 'resistance',
        label: '测量电阻',
        value: `${state.measuredResistance.toFixed(2)} Ω`
      },
      {
        key: 'error',
        label: '系统误差',
        value: `${state.errorPercent >= 0 ? '+' : ''}${state.errorPercent.toFixed(1)}%`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ResistorParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

export type { ResistorCircuitMode, ResistorMeterMode };

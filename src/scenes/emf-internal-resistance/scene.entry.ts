import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createEmfInternalView } from './scene.view';
import {
  asInternalResistance,
  asSourceVoltage,
  createEmfInternalSim,
  emfInternalConstants,
  type EmfInternalParams,
  type EmfInternalState
} from './scene.sim';

export type CreateEmfInternalSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: EmfInternalState) => void;
  initialParams?: Partial<EmfInternalParams>;
};

export { asInternalResistance, asSourceVoltage };

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
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createEmfInternalSim(options.initialParams);
  const view = createEmfInternalView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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
    const items = [
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
        key: 'resistance',
        label: '滑片电阻 R',
        value: `${state.rheostatResistance.toFixed(1)} Ω`
      },
      {
        key: 'records',
        label: '记录组数',
        value: `${state.records.length}/${emfInternalConstants.maxRecords}`
      },
      {
        key: 'fit',
        label: '拟合结果',
        value: state.fit
          ? `E测=${state.fit.emf.toFixed(2)} V  r测=${state.fit.internalResistance.toFixed(2)} Ω`
          : '待拟合'
      }
    ];
    return items;
  }

  return {
    ...base,
    init(): void {
      base.renderAndEmit();
    },
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
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    getReadoutItems
  };
}

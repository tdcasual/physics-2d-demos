import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createClosedCircuitView } from './scene.view';
import {
  createClosedCircuitSim,
  type ClosedCircuitParams,
  type ClosedCircuitState
} from './scene.sim';

export type CreateClosedCircuitSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ClosedCircuitState) => void;
};

export function createClosedCircuitScene(
  options: CreateClosedCircuitSceneOptions = {}
) {
  const sim = createClosedCircuitSim();
  const view = createClosedCircuitView({
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
  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'current',
        label: '干路电流 I',
        value: `${state.current.toFixed(2)} A`
      },
      {
        key: 'terminalVoltage',
        label: '路端电压 U',
        value: `${state.terminalVoltage.toFixed(2)} V`
      },
      {
        key: 'internalDrop',
        label: '内电压 Ir',
        value: `${state.internalDrop.toFixed(2)} V`
      },
      {
        key: 'outputPower',
        label: '输出功率 P出',
        value: `${state.outputPower.toFixed(2)} W`
      }
    ];
  }
  return {
    ...base,
    getState: (): ClosedCircuitState => sim.getState(),
    getSnapshot: (): ClosedCircuitState => sim.getSnapshot(),
    getParams: (): ClosedCircuitParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ClosedCircuitParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

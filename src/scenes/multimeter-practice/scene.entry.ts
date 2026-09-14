import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMultimeterSim,
  type MeterMode,
  type MeterRange,
  type MultimeterParams,
  type MultimeterState,
  type TargetId
} from './scene.sim';
import { createMultimeterView } from './scene.view';

export type CreateMultimeterSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MultimeterState) => void;
};

export function createMultimeterScene(
  options: CreateMultimeterSceneOptions = {}
) {
  const sim = createMultimeterSim();
  const view = createMultimeterView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    onProbeDrop: () => sim.autoConnect()
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  return {
    ...base,
    getState: (): MultimeterState => sim.getState(),
    getSnapshot: (): MultimeterState => sim.getSnapshot(),
    getParams: (): MultimeterParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MultimeterParams>) =>
      sim.setParams(next)
    ),
    autoConnect: base.wrapAction(() => sim.autoConnect()),
    disconnect: base.wrapAction(() => sim.disconnect()),
    calibrateZero: base.wrapAction(() => sim.calibrateZero()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        { key: 'target', label: '测量目标', value: state.targetLabel },
        { key: 'range', label: '档位', value: state.rangeLabel },
        {
          key: 'reading',
          label: '最终读数',
          value: state.connected ? state.measuredText : '--'
        },
        { key: 'status', label: '状态', value: state.status }
      ];
    }
  };
}

export function asTarget(value: unknown): TargetId | null {
  const raw = String(value);
  return [
    'short',
    'resistor15',
    'resistor150',
    'resistor1500',
    'diodeForward',
    'diodeReverse',
    'battery15',
    'battery9'
  ].includes(raw)
    ? (raw as TargetId)
    : null;
}

export function asMeterMode(value: unknown): MeterMode | null {
  const raw = String(value);
  return raw === 'resistance' || raw === 'voltage' || raw === 'diode'
    ? raw
    : null;
}

export function asMeterRange(value: unknown): MeterRange | null {
  const raw = String(value);
  return ['ohm1', 'ohm10', 'ohm100', 'ohm1k', 'volt2_5', 'volt10'].includes(raw)
    ? (raw as MeterRange)
    : null;
}

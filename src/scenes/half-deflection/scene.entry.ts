import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createHalfDeflectionView } from './scene.view';
import {
  createHalfDeflectionSim,
  type HalfDeflectionParams,
  type HalfDeflectionState,
  type MeterMethod
} from './scene.sim';

export type CreateHalfDeflectionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: HalfDeflectionState) => void;
};

export function asMeterMethod(value: unknown): MeterMethod | undefined {
  return value === 'current' || value === 'voltage' ? value : undefined;
}

export function createHalfDeflectionScene(
  options: CreateHalfDeflectionSceneOptions = {}
) {
  const sim = createHalfDeflectionSim();
  const view = createHalfDeflectionView({
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
        key: 'meterReading',
        label: '电表读数',
        value: `${state.meterReading.toFixed(2)} 格`
      },
      {
        key: 'halfTarget',
        label: '半偏目标',
        value: `${state.halfTarget.toFixed(2)} 格`
      },
      {
        key: 'estimate',
        label: '估算内阻',
        value: state.estimate > 0 ? `${state.estimate.toFixed(0)} Ω` : '—'
      }
    ];
  }
  return {
    ...base,
    getState: (): HalfDeflectionState => sim.getState(),
    getSnapshot: (): HalfDeflectionState => sim.getSnapshot(),
    getParams: (): HalfDeflectionParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<HalfDeflectionParams>) =>
      sim.setParams(next)
    ),
    record: base.wrapAction((stage: '满偏' | '半偏') => sim.record(stage)),
    clearRecords: base.wrapAction(() => sim.clearRecords()),
    getReadoutItems
  };
}

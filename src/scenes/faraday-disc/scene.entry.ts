import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFaradaySim,
  type FaradayParams,
  type FaradayState,
  type FaradayRotation,
  type FaradayField
} from './scene.sim';
import { createFaradayView } from './scene.view';

export type CreateFaradaySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: FaradayState) => void;
};

export function createFaradayScene(options: CreateFaradaySceneOptions = {}) {
  const sim = createFaradaySim();
  const view = createFaradayView({
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
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      { key: 'emf', label: 'E', value: `${state.emf.toFixed(2)} V` },
      { key: 'current', label: 'I', value: `${state.current.toFixed(2)} A` },
      { key: 'power', label: 'P', value: `${state.power.toFixed(3)} W` },
      { key: 'polarity', label: '极性', value: state.polarity },
      {
        key: 'status',
        label: '回路',
        value: state.params.closed ? '闭合' : '断开'
      }
    ];
  }
  return {
    ...base,
    getState: (): FaradayState => sim.getState(),
    getSnapshot: (): FaradayState => sim.getSnapshot(),
    getParams: (): FaradayParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<FaradayParams>): FaradayParams => sim.setParams(next)
    ),
    setRotation: base.wrapAction(
      (rotation: FaradayRotation): FaradayParams => sim.setParams({ rotation })
    ),
    setField: base.wrapAction(
      (field: FaradayField): FaradayParams => sim.setParams({ field })
    ),
    getReadoutItems
  };
}

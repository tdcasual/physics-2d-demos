import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFaradaySim,
  faradayMatchingPreset,
  type FaradayField,
  type FaradayParamPatch,
  type FaradayParams,
  type FaradayPresetId,
  type FaradayRotation,
  type FaradayState
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
    const aPole = state.rimPositive ? '负极' : '正极';
    const bPole = state.rimPositive ? '正极' : '负极';
    return [
      { key: 'emf', label: 'E', value: `${state.emf.toFixed(2)} V` },
      { key: 'current', label: 'I', value: `${state.current.toFixed(2)} A` },
      { key: 'power', label: 'P电', value: `${state.power.toFixed(3)} W` },
      {
        key: 'torque',
        label: 'M安',
        value: `${state.torque.toFixed(4)} N·m`
      },
      {
        key: 'polarity',
        label: '极性',
        value: `A ${aPole} / B ${bPole}`
      },
      {
        key: 'bulb',
        label: '灯泡',
        value: state.bulbOn ? '发光' : '熄灭'
      },
      {
        key: 'loop',
        label: '回路',
        value: state.params.closed ? '闭合' : '断开'
      }
    ];
  }

  return {
    ...base,
    getState: (): FaradayState => sim.getState(),
    getSnapshot: (): FaradayState => sim.getSnapshot(),
    getParams: (): FaradayParams & { preset: FaradayPresetId | null } => ({
      ...sim.getParams(),
      preset: faradayMatchingPreset(sim.getParams())
    }),
    matchingPreset: (): FaradayPresetId | null =>
      faradayMatchingPreset(sim.getParams()),
    setParams: base.wrapAction(
      (next: FaradayParamPatch): FaradayParams => sim.setParams(next)
    ),
    setRotation: base.wrapAction(
      (rotation: FaradayRotation): FaradayParams => sim.setParams({ rotation })
    ),
    setField: base.wrapAction(
      (field: FaradayField): FaradayParams => sim.setParams({ field })
    ),
    applyPreset: base.wrapAction(
      (id: FaradayPresetId | string): FaradayParams => sim.applyPreset(id)
    ),
    getReadoutItems
  };
}

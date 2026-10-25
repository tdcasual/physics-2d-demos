import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMassSpectrometerSim,
  type MassSpectrometerParams,
  type MassSpectrometerState
} from './scene.sim';
import { createMassSpectrometerView } from './scene.view';
import type { ReadoutItem } from '../../platform/readout';

export type CreateMassSpectrometerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MassSpectrometerState) => void;
};

export function createMassSpectrometerScene(
  options: CreateMassSpectrometerSceneOptions = {}
): SceneLifecycle & {
  getState(): MassSpectrometerState;
  getSnapshot(): MassSpectrometerState;
  getParams(): MassSpectrometerParams;
  setParams(next: Partial<MassSpectrometerParams>): MassSpectrometerParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createMassSpectrometerSim();
  const view = createMassSpectrometerView({
    canvas: options.canvas,
    theme: options.theme,
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
    setParams: base.wrapAction((next: Partial<MassSpectrometerParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'speed',
          label: '氘速度 v',
          value: state.particles[1].speed / 1e5,
          digits: 2,
          unit: '×10⁵ m/s'
        },
        {
          key: 'radius',
          label: '氘半径 R',
          value: state.measuredRadius * 100,
          digits: 2,
          unit: 'cm'
        },
        {
          key: 'calculatedMass',
          label: '计算质量 m',
          value: state.calculatedMass,
          digits: 2,
          unit: 'u'
        },
        {
          key: 'separation',
          label: '氢—氚间距',
          value: state.separation,
          digits: 0,
          unit: 'px'
        }
      ];
    }
  };
}

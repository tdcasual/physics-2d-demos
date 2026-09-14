import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createTwoBallSim,
  type TwoBallParams,
  type TwoBallState
} from './scene.sim';
import { createTwoBallView } from './scene.view';
export type CreateTwoBallSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: TwoBallState) => void;
};
export function createMechanicalEnergyTwoBallScene(
  options: CreateTwoBallSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): TwoBallState;
  getSnapshot(): TwoBallState;
  getParams(): TwoBallParams;
  setParams(next: Partial<TwoBallParams>): TwoBallParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createTwoBallSim();
  const view = createTwoBallView({
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
    resize(): void {
      view.resize();
      base.renderAndEmit();
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<TwoBallParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const s = sim.getState();
      return [
        {
          key: 'energy',
          label: '总机械能',
          value: `${s.totalEnergy.toFixed(2)} J`
        },
        { key: 'va', label: 'a 速度', value: `${s.vA.toFixed(2)} m/s` },
        { key: 'vb', label: 'b 速度', value: `${s.vB.toFixed(2)} m/s` }
      ];
    }
  };
}

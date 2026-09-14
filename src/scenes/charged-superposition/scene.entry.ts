import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createChargedSuperpositionSim,
  type ChargedSuperpositionParams,
  type ChargedSuperpositionState
} from './scene.sim';
import { createChargedSuperpositionView } from './scene.view';

export type CreateChargedSuperpositionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ChargedSuperpositionState) => void;
};
export function createChargedSuperpositionScene(
  options: CreateChargedSuperpositionSceneOptions = {}
) {
  const sim = createChargedSuperpositionSim();
  const view = createChargedSuperpositionView({
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
    setParams: base.wrapAction((next: Partial<ChargedSuperpositionParams>) =>
      sim.setParams(next)
    ),
    relaunch: base.wrapAction(() => sim.relaunch()),
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
          key: 'screenOffsetMm',
          label: '打屏偏移量 Y',
          value: `${state.screenOffsetMm.toFixed(1)} mm`
        },
        {
          key: 'exitSpeed',
          label: '出射初速度 v₀',
          value: `${(state.exitSpeed / 1e6).toFixed(2)} ×10⁶ m/s`
        },
        {
          key: 'exitAngleDeg',
          label: '出射偏转角',
          value: `${state.exitAngleDeg.toFixed(1)}°`
        },
        { key: 'status', label: '粒子状态', value: state.status }
      ];
    }
  } as SceneLifecycle & {
    getState(): ChargedSuperpositionState;
    getSnapshot(): ChargedSuperpositionState;
    getParams(): ChargedSuperpositionParams;
    setParams(
      next: Partial<ChargedSuperpositionParams>
    ): ChargedSuperpositionParams;
    relaunch(): void;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}

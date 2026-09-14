import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createInductionAcceleratorView } from './scene.view';
import {
  createInductionAcceleratorSim,
  type InductionAcceleratorParams,
  type InductionAcceleratorState
} from './scene.sim';
export type CreateInductionAcceleratorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: InductionAcceleratorState) => void;
};
export function createInductionAcceleratorScene(
  options: CreateInductionAcceleratorSceneOptions = {}
): SceneLifecycle & {
  getState(): InductionAcceleratorState;
  getSnapshot(): InductionAcceleratorState;
  getParams(): InductionAcceleratorParams;
  setParams(
    next: Partial<InductionAcceleratorParams>
  ): InductionAcceleratorParams;
  relaunch(): void;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createInductionAcceleratorSim();
  const view = createInductionAcceleratorView({
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
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<InductionAcceleratorParams>) =>
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
      const s = sim.getState();
      return [
        {
          key: 'innerB',
          label: '中心平均磁场 B内均',
          value: `${s.innerB.toFixed(2)} T`
        },
        {
          key: 'orbitB',
          label: '轨道处磁场 B轨',
          value: `${s.orbitB.toFixed(2)} T`
        },
        {
          key: 'speed',
          label: '电子切线速度 v',
          value: `${(s.speed / 1e7).toFixed(2)} ×10⁷ m/s`
        },
        {
          key: 'centripetalForce',
          label: '所需向心力 F向',
          value: `${s.centripetalForce.toFixed(2)} N`
        },
        {
          key: 'lorentzForce',
          label: '实际洛伦兹力 F洛',
          value: `${s.lorentzForce.toFixed(2)} N`
        }
      ];
    }
  };
}

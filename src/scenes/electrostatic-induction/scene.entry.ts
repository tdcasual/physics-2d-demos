import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createElectrostaticInductionView } from './scene.view';
import {
  createElectrostaticInductionSim,
  type ElectrostaticInductionParams,
  type ElectrostaticInductionState,
  type InductionAction
} from './scene.sim';

export type CreateElectrostaticInductionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ElectrostaticInductionState) => void;
};

export function createElectrostaticInductionScene(
  options: CreateElectrostaticInductionSceneOptions = {}
): SceneLifecycle & {
  getState(): ElectrostaticInductionState;
  getSnapshot(): ElectrostaticInductionState;
  getParams(): ElectrostaticInductionParams;
  setParams(
    next: Partial<ElectrostaticInductionParams>
  ): ElectrostaticInductionParams;
  act(action: InductionAction): void;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createElectrostaticInductionSim();
  const view = createElectrostaticInductionView({
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
    setParams: base.wrapAction((next: Partial<ElectrostaticInductionParams>) =>
      sim.setParams(next)
    ),
    act: base.wrapAction((action: InductionAction) => sim.act(action)),
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
          key: 'chargeA',
          label: '近端 A 感应电荷',
          value: `${s.chargeA > 0 ? '+' : ''}${s.chargeA.toFixed(0)}Q`
        },
        {
          key: 'chargeB',
          label: '远端 B 感应电荷',
          value: `${s.chargeB > 0 ? '+' : ''}${s.chargeB.toFixed(0)}Q`
        },
        {
          key: 'internalField',
          label: '内部合场强',
          value: `${s.internalField.toFixed(2)} E₀`
        },
        {
          key: 'potential',
          label: '导体电势',
          value: `${s.potential.toFixed(0)}%`
        },
        {
          key: 'electronShift',
          label: '电子迁移',
          value: `${s.electronShift.toFixed(2)}`
        }
      ];
    }
  };
}

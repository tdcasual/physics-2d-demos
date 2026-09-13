import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createEnergySim,
  energyConstants,
  type EnergyParams,
  type EnergyPreset,
  type EnergyState
} from './scene.sim';
import { createEnergyView } from './scene.view';

export type CreateEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: EnergyState) => void;
};
export function createEnergyScene(
  options: CreateEnergySceneOptions = {}
): SceneLifecycle & {
  getState(): EnergyState;
  getSnapshot(): EnergyState;
  getParams(): EnergyParams;
  setParams(next: Partial<EnergyParams>): EnergyParams;
  setPreset(preset: EnergyPreset): EnergyParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createEnergySim();
  const view = createEnergyView({
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
    setParams: base.wrapAction((next: Partial<EnergyParams>) =>
      sim.setParams(next)
    ),
    setPreset: base.wrapAction((preset: EnergyPreset) => sim.setPreset(preset)),
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
          key: 'totalMomentum',
          label: '总动量 Σp',
          value: `${s.totalMomentum.toFixed(2)} 千克·米/秒`
        },
        {
          key: 'totalEnergy',
          label: '总动能 ΣEₖ',
          value: `${s.totalEnergy.toFixed(2)} 焦耳`
        },
        {
          key: 'velocityA',
          label: 'A球末速度',
          value: `${s.velocityA.toFixed(2)} 米/秒`
        },
        {
          key: 'velocityB',
          label: 'B球末速度',
          value: `${s.velocityB.toFixed(2)} 米/秒`
        },
        {
          key: 'collision',
          label: '状态',
          value: s.collided ? '碰撞完成（e = 1）' : '等待碰撞'
        }
      ];
    }
  };
}
export { energyConstants };

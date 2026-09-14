import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createLaserSpeedSim,
  type LaserSpeedParams,
  type LaserSpeedState
} from './scene.sim';
import { createLaserSpeedView } from './scene.view';

export type CreateLaserSpeedSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: LaserSpeedState) => void;
};

export function createLaserSpeedScene(
  options: CreateLaserSpeedSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): LaserSpeedState;
  getSnapshot(): LaserSpeedState;
  getParams(): LaserSpeedParams;
  setParams(params: Partial<LaserSpeedParams>): LaserSpeedParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createLaserSpeedSim();
  const view = createLaserSpeedView({
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
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<LaserSpeedParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'pulse1',
          label: '脉冲①往返',
          value: `${state.pulse1.returnTime.toFixed(2)} s`
        },
        {
          key: 'pulse2',
          label: '脉冲②往返',
          value: `${(state.pulse2.returnTime - state.pulse2.emissionTime).toFixed(2)} s`
        },
        {
          key: 'distance',
          label: '相对位移 Δx',
          value: `${state.measuredDistance.toFixed(1)} m`
        },
        {
          key: 'velocity',
          label: '测得车速 v',
          value: `${state.inferredVelocity.toFixed(1)} m/s`
        }
      ];
    }
  };
}

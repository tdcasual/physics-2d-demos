import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMagneticMirrorSim,
  type MagneticMirrorParams,
  type MagneticMirrorState
} from './scene.sim';
import { createMagneticMirrorView } from './scene.view';

export type CreateMagneticMirrorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MagneticMirrorState) => void;
};

export function createMagneticMirrorScene(
  options: CreateMagneticMirrorSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MagneticMirrorState;
  getSnapshot(): MagneticMirrorState;
  getParams(): MagneticMirrorParams;
  setParams(params: Partial<MagneticMirrorParams>): MagneticMirrorParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createMagneticMirrorSim();
  const view = createMagneticMirrorView({
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

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      {
        key: 'position',
        label: '轴向位置 x',
        value: `${(state.position * 23.4).toFixed(2)} cm`
      },
      {
        key: 'parallel-speed',
        label: '轴向速度 v∥',
        value: `${state.parallelSpeed.toFixed(2)} 米/秒`
      },
      {
        key: 'perpendicular-speed',
        label: '垂直速度 v⊥',
        value: `${state.perpendicularSpeed.toFixed(2)} 米/秒`
      },
      {
        key: 'pitch-distance',
        label: '轨迹螺距 d',
        value: `${state.pitchDistance.toFixed(2)} cm`
      },
      {
        key: 'energy',
        label: '动能 Eₖ',
        value: `${state.energy.toFixed(2)} 焦耳`
      },
      {
        key: 'magnetic-moment',
        label: '磁矩 μ',
        value: state.magneticMoment.toFixed(3)
      }
    ];
  }

  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MagneticMirrorParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createParallelogramSim,
  type ParallelogramParams,
  type ParallelogramState
} from './scene.sim';
import { createParallelogramView } from './scene.view';

export type CreateParallelogramSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ParallelogramState) => void;
};

export function createParallelogramScene(
  options: CreateParallelogramSceneOptions = {}
) {
  const sim = createParallelogramSim();
  const view = createParallelogramView({
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
      {
        key: 'theory',
        label: '理论合力',
        value: `${state.theoreticalMagnitude.toFixed(2)} N`
      },
      {
        key: 'measured',
        label: '实测合力',
        value: `${state.measuredMagnitude.toFixed(2)} N`
      },
      {
        key: 'magnitude-error',
        label: '大小误差',
        value: `${state.magnitudeError.toFixed(1)}%`
      },
      {
        key: 'angle-error',
        label: '方向误差',
        value: `${state.angleError.toFixed(1)}°`
      }
    ];
  }

  return {
    ...base,
    getState: (): ParallelogramState => sim.getState(),
    getSnapshot: (): ParallelogramState => sim.getSnapshot(),
    getParams: (): ParallelogramParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<ParallelogramParams>): ParallelogramParams =>
        sim.setParams(next)
    ),
    getReadoutItems
  };
}

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

const STAGE_LABEL: Record<ParallelogramParams['stage'], string> = {
  components: '画分力',
  construct: '作图',
  compare: '对比'
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
    const verdict = state.samePoint
      ? state.sameDirection
        ? '同点同向'
        : '同点'
      : '先作图再对比';
    return [
      {
        key: 'stage',
        label: '步骤',
        value: STAGE_LABEL[state.params.stage]
      },
      {
        key: 'f1',
        label: 'F₁',
        value: `${state.params.f1.toFixed(2)} N`
      },
      {
        key: 'f2',
        label: 'F₂',
        value: `${state.params.f2.toFixed(2)} N`
      },
      {
        key: 'angle',
        label: '夹角 θ',
        value: `${state.params.angle.toFixed(0)}°`
      },
      {
        key: 'theory',
        label: '理论合力 F',
        value: `${state.theoreticalMagnitude.toFixed(2)} N`
      },
      {
        key: 'measured',
        label: '实测合力 F′',
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
      },
      {
        key: 'verdict',
        label: '等效',
        value: verdict
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

import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createVerticalCircleSim,
  type VerticalCircleHandle,
  type VerticalCircleParams,
  type VerticalCircleState
} from './scene.sim';
import { createVerticalCircleView } from './scene.view';

export type CreateVerticalCircleSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: VerticalCircleState) => void;
};

function constraintLabel(
  model: VerticalCircleState['params']['model'],
  force: number
): string {
  if (model === 'rope' && force < -0.01) return `${force.toFixed(1)} N（松弛）`;
  if (force < -0.01) return `${force.toFixed(1)} N（受压）`;
  if (force > 0.01) return `${force.toFixed(1)} N（拉向圆心）`;
  return `${force.toFixed(1)} N`;
}

export function createVerticalCircleScene(
  options: CreateVerticalCircleSceneOptions = {}
) {
  const sim = createVerticalCircleSim();
  const view = createVerticalCircleView({
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

  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'model',
        label: '模型',
        value:
          state.params.model === 'rope'
            ? '绳模型（只能拉）'
            : '杆模型（拉与推）'
      },
      {
        key: 'vBottom',
        label: 'v_bottom',
        value: `${state.params.vBottom.toFixed(1)} m/s`
      },
      {
        key: 'vTop',
        label: 'v_top',
        value: `${state.topSpeed.toFixed(1)} m/s`
      },
      {
        key: 'speed',
        label: 'v',
        value: `${state.speed.toFixed(1)} m/s`
      },
      {
        key: 'constraint',
        label: state.params.model === 'rope' ? '绳张力 T' : '约束力 T',
        value: constraintLabel(state.params.model, state.constraintForce)
      },
      { key: 'status', label: '状态', value: state.status },
      {
        key: 'formulaV',
        label: 'v(θ)',
        value: 'v² = v₀² − 2gR(1+cosθ)',
        layout: 'full' as const
      },
      {
        key: 'formulaT',
        label: 'T',
        value: 'T = mv²/R − mg cosθ',
        layout: 'full' as const
      }
    ];
  }

  return {
    ...base,
    getState: (): VerticalCircleState => sim.getState(),
    getSnapshot: (): VerticalCircleState => sim.getSnapshot(),
    getParams: (): VerticalCircleParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<VerticalCircleParams>): VerticalCircleParams =>
        sim.setParams(next)
    ),
    pickHandle(x: number, y: number): VerticalCircleHandle {
      return sim.pickHandle(x, y);
    },
    moveHandle: base.wrapAction(
      (
        handle: Exclude<VerticalCircleHandle, null>,
        x: number,
        y: number
      ): void => {
        sim.moveHandle(handle, x, y);
      }
    ),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    getReadoutItems
  };
}

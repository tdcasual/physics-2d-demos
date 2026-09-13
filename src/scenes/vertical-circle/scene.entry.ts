import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
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
        value: state.params.model === 'rope' ? '绳' : '杆'
      },
      {
        key: 'bottomSpeed',
        label: '最低点速度',
        value: `${state.params.vBottom.toFixed(1)} m/s`
      },
      {
        key: 'topSpeed',
        label: '最高点速度',
        value: `${state.topSpeed.toFixed(1)} m/s`
      },
      {
        key: 'constraint',
        label: '约束力',
        value: `${state.constraintForce.toFixed(1)} N`
      },
      { key: 'status', label: '状态', value: state.status }
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
    getReadoutItems
  };
}

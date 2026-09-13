import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createDynamicCircleSim,
  type DynamicCircleBoundary,
  type DynamicCircleHandle,
  type DynamicCircleParams,
  type DynamicCircleState,
  type DynamicCircleTab
} from './scene.sim';
import { createDynamicCircleView } from './scene.view';

export type CreateDynamicCircleSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: DynamicCircleState) => void;
};

export function createDynamicCircleScene(
  options: CreateDynamicCircleSceneOptions = {}
) {
  const sim = createDynamicCircleSim();
  const view = createDynamicCircleView({
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
    const radius = Number.isFinite(state.radius)
      ? `${state.radius.toFixed(1)} m`
      : '∞';
    const angle = state.params.tab === 'scaling' ? -90 : state.params.theta;
    return [
      {
        key: 'tab',
        label: '模型',
        value: {
          scaling: '放缩圆',
          rotating: '旋转圆',
          translating: '平移圆',
          comprehensive: '综合聚焦'
        }[state.params.tab]
      },
      { key: 'radius', label: 'R', value: radius },
      { key: 'boundary', label: '边界', value: state.boundaryMetric },
      { key: 'angle', label: 'θ', value: `${angle.toFixed(0)}°` },
      { key: 'status', label: '状态', value: state.status }
    ];
  }

  return {
    ...base,
    getState: (): DynamicCircleState => sim.getState(),
    getSnapshot: (): DynamicCircleState => sim.getSnapshot(),
    getParams: (): DynamicCircleParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<DynamicCircleParams>): DynamicCircleParams =>
        sim.setParams(next)
    ),
    setTab: base.wrapAction(
      (tab: DynamicCircleTab): DynamicCircleParams => sim.setTab(tab)
    ),
    setBoundary: base.wrapAction(
      (boundary: DynamicCircleBoundary): DynamicCircleParams =>
        sim.setBoundary(boundary)
    ),
    pickHandle(x: number, y: number): DynamicCircleHandle {
      return sim.pickHandle(x, y);
    },
    moveHandle: base.wrapAction(
      (
        handle: Exclude<DynamicCircleHandle, null>,
        x: number,
        y: number
      ): void => {
        sim.moveHandle(handle, x, y);
      }
    ),
    getReadoutItems
  };
}

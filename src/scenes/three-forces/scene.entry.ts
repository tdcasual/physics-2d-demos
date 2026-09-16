import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createThreeForcesSim,
  type ThreeForcesHandle,
  type ThreeForcesParams,
  type ThreeForcesState
} from './scene.sim';
import { createThreeForcesView } from './scene.view';

export type CreateThreeForcesSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ThreeForcesState) => void;
};

function tabLabel(tab: ThreeForcesState['params']['tab']): string {
  if (tab === 'friction') return '摩擦力';
  if (tab === 'spring') return '弹力';
  return '重力';
}

export function createThreeForcesScene(
  options: CreateThreeForcesSceneOptions = {}
) {
  const sim = createThreeForcesSim();
  const view = createThreeForcesView({
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
    const s = sim.getState();
    if (s.params.tab === 'spring') {
      return [
        { key: 'tab', label: '性质力', value: tabLabel(s.params.tab) },
        {
          key: 'springX',
          label: '形变量 x',
          value: `${s.springDisplacement.toFixed(2)} m`
        },
        {
          key: 'springK',
          label: '劲度系数 k',
          value: `${s.params.springK.toFixed(0)} N/m`
        },
        {
          key: 'springForce',
          label: 'F弹',
          value: `${s.springForce.toFixed(1)} N`
        },
        { key: 'status', label: '状态', value: s.status },
        {
          key: 'formulaSpring',
          label: '胡克定律',
          value: 'F弹 = −kx，|F弹| = kx',
          layout: 'full' as const
        }
      ];
    }
    return [
      { key: 'tab', label: '性质力', value: tabLabel(s.params.tab) },
      { key: 'gravity', label: '重力 G', value: `${s.gravity.toFixed(1)} N` },
      {
        key: 'g1',
        label: '下滑分力 G₁',
        value: `${s.downslope.toFixed(1)} N`
      },
      {
        key: 'g2',
        label: '垂直分力 G₂',
        value: `${s.perpendicular.toFixed(1)} N`
      },
      { key: 'normal', label: '支持力 FN', value: `${s.normal.toFixed(1)} N` },
      {
        key: 'friction',
        label: '摩擦力 f',
        value: `${s.friction.toFixed(1)} N`
      },
      {
        key: 'frictionMax',
        label: 'f_s,max',
        value: `${s.frictionMax.toFixed(1)} N`
      },
      {
        key: 'acceleration',
        label: '加速度 a',
        value: `${s.acceleration.toFixed(2)} m/s²`
      },
      { key: 'status', label: '状态', value: s.status },
      {
        key: 'formulaG',
        label: '重力',
        value: 'G = mg',
        layout: 'full' as const
      },
      {
        key: 'formulaComp',
        label: '分解',
        value: 'G₁ = G sinθ，G₂ = G cosθ',
        layout: 'full' as const
      },
      {
        key: 'formulaF',
        label: '摩擦',
        value: 'f ≤ μN',
        layout: 'full' as const
      }
    ];
  }

  return {
    ...base,
    getState: (): ThreeForcesState => sim.getState(),
    getSnapshot: (): ThreeForcesState => sim.getSnapshot(),
    getParams: (): ThreeForcesParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<ThreeForcesParams>): ThreeForcesParams =>
        sim.setParams(next)
    ),
    pickHandle(x: number, y: number): ThreeForcesHandle {
      return sim.pickHandle(x, y);
    },
    moveHandle: base.wrapAction(
      (
        handle: Exclude<ThreeForcesHandle, null>,
        x: number,
        y: number
      ): void => {
        sim.moveHandle(handle, x, y);
      }
    ),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    startAll: base.wrapAction(() => {
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    getReadoutItems
  };
}

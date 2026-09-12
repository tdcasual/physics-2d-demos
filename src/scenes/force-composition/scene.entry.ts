import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createForceCompositionSim,
  type ForceCompositionParams,
  type ForceCompositionState,
  type ForceCompositionTab
} from './scene.sim';
import { createForceCompositionView } from './scene.view';

export type CreateForceCompositionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ForceCompositionState) => void;
};

export function createForceCompositionScene(
  options: CreateForceCompositionSceneOptions = {}
) {
  const sim = createForceCompositionSim({
    tab: 'synthesis',
    rule: 'parallelogram',
    f1: 40,
    f2: 30,
    angle: 60,
    orthogonalF: 55,
    orthogonalAngle: 60,
    gravity: 40,
    inclineAngle: 30,
    rangeSweep: true
  });
  const view = createForceCompositionView({
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
    const p = state.params;
    const magnitude = (x: number, y: number): number => Math.hypot(x, y);
    if (p.tab === 'orthogonal') {
      return [
        { key: 'tab', label: '模式', value: '正交分解' },
        { key: 'result', label: 'F', value: `${p.orthogonalF.toFixed(1)} N` },
        { key: 'angle', label: 'θ', value: `${p.orthogonalAngle.toFixed(1)}°` },
        { key: 'fx', label: 'Fx', value: `${state.fx.x.toFixed(1)} N` },
        { key: 'fy', label: 'Fy', value: `${state.fy.y.toFixed(1)} N` }
      ];
    }
    if (p.tab === 'effect') {
      return [
        { key: 'tab', label: '模式', value: '按效果分解' },
        { key: 'result', label: 'G', value: `${p.gravity.toFixed(1)} N` },
        { key: 'angle', label: 'θ', value: `${p.inclineAngle.toFixed(1)}°` },
        {
          key: 'g1',
          label: 'G₁',
          value: `${magnitude(state.g1.x, state.g1.y).toFixed(1)} N`
        },
        {
          key: 'g2',
          label: 'G₂',
          value: `${magnitude(state.g2.x, state.g2.y).toFixed(1)} N`
        }
      ];
    }
    return [
      {
        key: 'tab',
        label: '模式',
        value: p.tab === 'range' ? '合力范围' : '合成法则'
      },
      {
        key: 'result',
        label: 'F合',
        value: `${magnitude(state.resultant.x, state.resultant.y).toFixed(1)} N`
      },
      { key: 'angle', label: 'θ', value: `${p.angle.toFixed(1)}°` },
      { key: 'f1', label: 'F₁', value: `${p.f1.toFixed(1)} N` },
      { key: 'f2', label: 'F₂', value: `${p.f2.toFixed(1)} N` }
    ];
  }

  return {
    ...base,
    getState: (): ForceCompositionState => sim.getState(),
    getSnapshot: (): ForceCompositionState => sim.getState(),
    getParams: (): ForceCompositionParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<ForceCompositionParams>): ForceCompositionParams =>
        sim.setParams(next)
    ),
    pickHandle(x: number, y: number): 'f1' | 'f2' | 'orthogonal' | null {
      return sim.pickHandle(x, y);
    },
    moveHandle: base.wrapAction(
      (handle: 'f1' | 'f2' | 'orthogonal', x: number, y: number): void => {
        sim.moveHandle(handle, x, y);
      }
    ),
    setTab: base.wrapAction((tab: ForceCompositionTab): void => {
      sim.setParams({ tab });
    }),
    getReadoutItems
  };
}

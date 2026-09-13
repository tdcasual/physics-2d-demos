import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createThreeForcesSim,
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
    return [
      {
        key: 'tab',
        label: '性质力',
        value:
          s.params.tab === 'gravity'
            ? '重力'
            : s.params.tab === 'friction'
              ? '摩擦力'
              : '弹力'
      },
      { key: 'gravity', label: '重力 G', value: `${s.gravity.toFixed(1)} N` },
      { key: 'normal', label: '支持力 FN', value: `${s.normal.toFixed(1)} N` },
      {
        key: 'friction',
        label: '摩擦力 f',
        value: `${s.friction.toFixed(1)} N`
      },
      { key: 'status', label: '状态', value: s.status }
    ];
  }
  return {
    ...base,
    getState: (): ThreeForcesState => sim.getState(),
    getSnapshot: (): ThreeForcesState => sim.getSnapshot(),
    getParams: (): ThreeForcesParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ThreeForcesParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

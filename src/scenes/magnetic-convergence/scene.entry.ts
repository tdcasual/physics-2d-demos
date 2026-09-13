import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMagneticConvergenceSim,
  type MagneticConvergenceParams,
  type MagneticConvergenceState
} from './scene.sim';
import { createMagneticConvergenceView } from './scene.view';

export type CreateMagneticConvergenceSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MagneticConvergenceState) => void;
};

export function createMagneticConvergenceScene(
  options: CreateMagneticConvergenceSceneOptions = {}
) {
  const sim = createMagneticConvergenceSim();
  const view = createMagneticConvergenceView({
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

  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'radiusRatio',
        label: '轨道半径比 r / R',
        value: state.params.radiusRatio.toFixed(1)
      },
      { key: 'status', label: '状态', value: state.status },
      {
        key: 'focusError',
        label: state.params.mode === 'converge' ? '焦点偏差' : '平行偏差',
        value: `${state.focusErrorPx.toFixed(0)} px`
      }
    ];
  }

  return {
    ...base,
    getState: (): MagneticConvergenceState => sim.getState(),
    getSnapshot: (): MagneticConvergenceState => sim.getSnapshot(),
    getParams: (): MagneticConvergenceParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MagneticConvergenceParams>) =>
      sim.setParams(next)
    ),
    emit: base.wrapAction(() => sim.emit()),
    clear: base.wrapAction(() => sim.clear()),
    getReadoutItems
  };
}

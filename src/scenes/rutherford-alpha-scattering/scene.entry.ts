import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createRutherfordSim,
  type RutherfordParams,
  type RutherfordState
} from './scene.sim';
import { createRutherfordView } from './scene.view';

export type CreateRutherfordSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RutherfordState) => void;
};

export function createRutherfordScene(
  options: CreateRutherfordSceneOptions = {}
) {
  const sim = createRutherfordSim();
  const view = createRutherfordView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  return {
    ...base,
    getState: (): RutherfordState => sim.getState(),
    getSnapshot: (): RutherfordState => sim.getSnapshot(),
    getParams: (): RutherfordParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<RutherfordParams>) =>
      sim.setParams(next)
    ),
    fireBeam: base.wrapAction(() => sim.fireBeam()),
    toggleModel: base.wrapAction(() => sim.toggleModel()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'totalCount',
          label: '入射粒子总数 N',
          value: `${state.totalCount}`
        },
        { key: 'largeAngle', label: '大角偏转', value: `${state.largeAngle}` },
        { key: 'backscatter', label: '直接反弹', value: `${state.backscatter}` }
      ];
    }
  };
}

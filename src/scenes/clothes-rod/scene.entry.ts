import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createClothesRodView } from './scene.view';
import {
  createClothesRodSim,
  type RodParams,
  type RodState
} from './scene.sim';
export type CreateClothesRodSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RodState) => void;
};
export function createClothesRodScene(
  options: CreateClothesRodSceneOptions = {}
) {
  const sim = createClothesRodSim();
  const view = createClothesRodView({
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
  return {
    ...base,
    getState: (): RodState => sim.getState(),
    getSnapshot: (): RodState => sim.getSnapshot(),
    getParams: (): RodParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<RodParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'thetaLeft',
          label: '左侧夹角 θ₁',
          value: `${((s.thetaLeft * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'thetaRight',
          label: '右侧夹角 θ₂',
          value: `${((s.thetaRight * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'tensionLeft',
          label: '左绳张力 T₁',
          value: `${s.tensionLeft.toFixed(1)} N`
        },
        {
          key: 'tensionRight',
          label: '右绳张力 T₂',
          value: `${s.tensionRight.toFixed(1)} N`
        }
      ];
    }
  };
}

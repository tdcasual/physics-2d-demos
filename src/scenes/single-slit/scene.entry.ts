import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createSingleSlitSim,
  type SingleSlitParams,
  type SingleSlitState
} from './scene.sim';
import { createSingleSlitView } from './scene.view';

export type CreateSingleSlitSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SingleSlitState) => void;
};

export function createSingleSlitScene(
  options: CreateSingleSlitSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): SingleSlitState;
  getSnapshot(): SingleSlitState;
  getParams(): SingleSlitParams;
  setParams(params: Partial<SingleSlitParams>): SingleSlitParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createSingleSlitSim();
  let renderAndEmit: () => void = () => {};
  const view = createSingleSlitView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints,
    onDetectorChange: (detectorX) => {
      sim.setParams({ detectorX });
      renderAndEmit();
    }
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  renderAndEmit = base.renderAndEmit;

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      { key: 'lambda', label: '波长 λ', value: `${state.params.lambda} nm` },
      { key: 'angle', label: '衍射角 θ', value: `${state.angle.toFixed(3)}°` },
      {
        key: 'first-minimum',
        label: '第一暗纹 x₁',
        value: `${state.firstMinimum.toFixed(2)} mm`
      },
      {
        key: 'central-width',
        label: '中央明纹 Δx',
        value: `${state.centralWidth.toFixed(2)} mm`
      },
      { key: 'intensity', label: '相对光强', value: state.intensity.toFixed(3) }
    ];
  }

  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<SingleSlitParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}

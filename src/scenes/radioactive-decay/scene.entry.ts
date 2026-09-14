import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createRadioactiveView } from './scene.view';
import {
  createRadioactiveSim,
  type RadioactiveParams,
  type RadioactiveState
} from './scene.sim';
export type CreateRadioactiveSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RadioactiveState) => void;
};
export function createRadioactiveScene(
  options: CreateRadioactiveSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): RadioactiveState;
  getSnapshot(): RadioactiveState;
  getParams(): RadioactiveParams;
  setParams(next: Partial<RadioactiveParams>): RadioactiveParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createRadioactiveSim();
  const view = createRadioactiveView({
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
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<RadioactiveParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const s = sim.getState();
      return [
        { key: 'remaining', label: '未衰变 N', value: `${s.remaining}` },
        { key: 'decayed', label: '已衰变 ΔN', value: `${s.decayed}` },
        {
          key: 'halfLives',
          label: '经历半衰期',
          value: `${s.halfLives.toFixed(2)} T`
        }
      ];
    }
  };
}

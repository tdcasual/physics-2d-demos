import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createWireLoopFieldSim,
  type WireLoopFieldParams,
  type WireLoopFieldState
} from './scene.sim';
import { createWireLoopFieldView } from './scene.view';

export type CreateWireLoopFieldSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: WireLoopFieldState) => void;
};
export function createWireLoopFieldScene(
  options: CreateWireLoopFieldSceneOptions = {}
): SceneLifecycle & {
  getState(): WireLoopFieldState;
  getSnapshot(): WireLoopFieldState;
  getParams(): WireLoopFieldParams;
  setParams(next: Partial<WireLoopFieldParams>): WireLoopFieldParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createWireLoopFieldSim();
  const view = createWireLoopFieldView({
    canvas: options.canvas,
    theme: options.theme,
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
    setParams: base.wrapAction((next: Partial<WireLoopFieldParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const s = sim.getState();
      return [
        { key: 'flux', label: '磁通量 Φ', value: `${s.flux.toFixed(3)} Wb` },
        { key: 'emf', label: '感应电动势 E', value: `${s.emf.toFixed(2)} V` },
        {
          key: 'current',
          label: '感应电流 I',
          value: `${s.current.toFixed(2)} A`
        },
        {
          key: 'magneticForce',
          label: '安培力 F安',
          value: `${s.magneticForce.toFixed(2)} N`
        }
      ];
    }
  };
}

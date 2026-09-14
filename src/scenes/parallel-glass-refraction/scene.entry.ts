import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createGlassSim,
  glassConstants,
  type GlassParams,
  type GlassState
} from './scene.sim';
import { createGlassView } from './scene.view';

export type CreateGlassSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: GlassState) => void;
};

export function createGlassScene(
  options: CreateGlassSceneOptions = {}
): SceneLifecycle & {
  getState(): GlassState;
  getSnapshot(): GlassState;
  getParams(): GlassParams;
  setParams(next: Partial<GlassParams>): GlassParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createGlassSim();
  const view = createGlassView({
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
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<GlassParams>) =>
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
        {
          key: 'incident-angle',
          label: '入射角 i',
          value: `${s.incidentAngle.toFixed(1)}°`
        },
        {
          key: 'refracted-angle',
          label: '折射角 r',
          value: `${((s.refractedRadians * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'exit-angle',
          label: "出射角 i'",
          value: `${s.incidentAngle.toFixed(1)}°`
        },
        {
          key: 'lateral-shift',
          label: '侧移量 Δx',
          value: `${s.lateralShift.toFixed(2)} cm`
        }
      ];
    }
  };
}

export { glassConstants };

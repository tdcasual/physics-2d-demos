import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createTirSim,
  tirConstants,
  type TirParams,
  type TirState
} from './scene.sim';
import { createTirView } from './scene.view';

export type CreateTirSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: TirState) => void;
};
export function createTirScene(
  options: CreateTirSceneOptions = {}
): SceneLifecycle & {
  getState(): TirState;
  getSnapshot(): TirState;
  getParams(): TirParams;
  setParams(next: Partial<TirParams>): TirParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createTirSim();
  const view = createTirView({
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
    setParams: base.wrapAction((next: Partial<TirParams>) =>
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
          key: 'critical-angle',
          label: '介质临界角 θc',
          value: `${((s.criticalAngle * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'incident-angle',
          label: '当前入射角 θ₁',
          value: `${((s.incidentAngle * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'refracted-angle',
          label: '圆弧折射角 θ₂',
          value:
            s.refractedAngle == null
              ? '—'
              : `${((s.refractedAngle * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'critical-height',
          label: '临界高度 hᶜ',
          value: `${s.criticalHeight.toFixed(2)} cm`
        },
        { key: 'status', label: '光学判定', value: s.status }
      ];
    }
  };
}
export { tirConstants };

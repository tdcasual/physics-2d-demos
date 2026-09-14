import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSemicylinderStandardView } from './scene.view';
import {
  createSemicylinderStandardSim,
  type SemicylinderStandardParams,
  type SemicylinderStandardState
} from './scene.sim';

export type CreateSemicylinderStandardSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SemicylinderStandardState) => void;
};

export function createSemicylinderStandardScene(
  options: CreateSemicylinderStandardSceneOptions = {}
): SceneLifecycle & {
  getState(): SemicylinderStandardState;
  getSnapshot(): SemicylinderStandardState;
  getParams(): SemicylinderStandardParams;
  setParams(
    next: Partial<SemicylinderStandardParams>
  ): SemicylinderStandardParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createSemicylinderStandardSim();
  const view = createSemicylinderStandardView({
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
    setParams: base.wrapAction((next: Partial<SemicylinderStandardParams>) =>
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
          key: 'criticalAngle',
          label: '临界角',
          value: `${s.criticalAngle.toFixed(1)}°`
        },
        {
          key: 'incidentAngle',
          label: '入射角',
          value: `${s.incidentAngle.toFixed(1)}°`
        },
        {
          key: 'refractedAngle',
          label: '折射角',
          value:
            s.refractedAngle == null ? '—' : `${s.refractedAngle.toFixed(1)}°`
        },
        { key: 'status', label: '光路状态', value: s.status }
      ];
    }
  };
}

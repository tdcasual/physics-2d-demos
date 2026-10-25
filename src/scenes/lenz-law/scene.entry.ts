import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createLenzLawSim,
  type LenzMotion,
  type LenzParams,
  type LenzState
} from './scene.sim';
import { createLenzLawView } from './scene.view';
import type { ReadoutItem } from '../../platform/readout';

export type CreateLenzLawSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: LenzState) => void;
};

export function createLenzLawScene(options: CreateLenzLawSceneOptions = {}) {
  const sim = createLenzLawSim();
  const view = createLenzLawView({
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
    setParams: base.wrapAction((next: Partial<LenzParams>) =>
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
      const state = sim.getState();
      return [
        {
          key: 'flux',
          label: '原磁通量 Φ',
          value: state.flux * 1000,
          digits: 2,
          unit: 'mWb'
        },
        {
          key: 'emf',
          label: '感应电动势 E',
          value: state.emf,
          digits: 2,
          unit: 'V'
        },
        {
          key: 'current',
          label: '感应电流 I',
          value: state.current,
          digits: 2,
          unit: 'A'
        },
        {
          key: 'force',
          label: '安培力 F',
          value: state.force,
          digits: 2,
          unit: 'N'
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): LenzState;
    getSnapshot(): LenzState;
    getParams(): LenzParams;
    setParams(next: Partial<LenzParams>): LenzParams;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): ReadoutItem[];
  };
}

export function asLenzMotion(value: unknown): LenzMotion | null {
  return value === 'approach' || value === 'recede' ? value : null;
}

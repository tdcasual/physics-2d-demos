import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createElectrificationSim,
  type ElectrificationScene,
  type ElectrificationSnapshot
} from './scene.sim';
import { createElectrificationView } from './scene.view';

export type CreateElectrificationSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: ElectrificationSnapshot) => void;
};

export function createElectrificationScene(
  options: CreateElectrificationSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: ElectrificationScene): void;
  setParams(next: { step?: number }): { step: number };
  getParams(): { step: number };
  runSceneAction(): void;
  getSnapshot(): ElectrificationSnapshot;
  subscribe(listener: () => void): () => void;
} {
  const sim = createElectrificationSim();
  const view = createElectrificationView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    theme: options.theme ?? 'dark'
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getSnapshot(),
    onReadout: options.onReadout
  });

  return {
    ...base,
    setScene(scene: ElectrificationScene): void {
      sim.setScene(scene);
      base.renderAndEmit();
      base.notify();
    },
    setParams(next: { step?: number }): { step: number } {
      if (typeof next.step === 'number' && Number.isFinite(next.step)) {
        sim.setStepIndex(next.step);
        base.renderAndEmit();
        base.notify();
      }
      return { step: sim.getSnapshot().state.stepIndex };
    },
    getParams(): { step: number } {
      return { step: sim.getSnapshot().state.stepIndex };
    },
    runSceneAction(): void {
      sim.runSceneAction();
      base.renderAndEmit();
      base.notify();
    },
    getSnapshot(): ElectrificationSnapshot {
      return sim.getSnapshot();
    }
  };
}

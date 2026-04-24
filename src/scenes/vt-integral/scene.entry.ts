import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import {
  createVtIntegralSim,
  type VtIntegralSnapshot,
  type VtMethod,
  type VtScene
} from './scene.sim';
import { createVtIntegralView } from './scene.view';

export type CreateVtIntegralSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: VtIntegralSnapshot) => void;
};

export function createVtIntegralScene(
  options: CreateVtIntegralSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: VtScene): void;
  setRects(value: number): void;
  setTime(value: number): void;
  setMethod(value: VtMethod): void;
  setCurveAmplitude(value: number): void;
  setCircleN(value: number): void;
  getSnapshot(): VtIntegralSnapshot;
} {
  const sim = createVtIntegralSim();
  const view = createVtIntegralView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    theme: options.theme ?? 'dark'
  });

  function renderAndEmit(): void {
    const snapshot = sim.getSnapshot();
    view.render(snapshot);
    options.onReadout?.(snapshot);
  }

  return {
    init(): void {
      sim.reset();
      renderAndEmit();
    },
    reset(): void {
      sim.reset();
      renderAndEmit();
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      renderAndEmit();
    },
    resize(): void {
      view.resize();
      renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
      renderAndEmit();
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      renderAndEmit();
    },
    setScene(scene: VtScene): void {
      sim.setScene(scene);
    },
    setRects(value: number): void {
      sim.setRects(value);
    },
    setTime(value: number): void {
      sim.setTime(value);
    },
    setMethod(value: VtMethod): void {
      sim.setMethod(value);
    },
    setCurveAmplitude(value: number): void {
      sim.setCurveAmplitude(value);
    },
    setCircleN(value: number): void {
      sim.setCircleN(value);
    },

    getSnapshot(): VtIntegralSnapshot {
      return sim.getSnapshot();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

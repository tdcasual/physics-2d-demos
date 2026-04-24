import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createEmfAnalogySim, type EmfAnalogySnapshot } from './scene.sim';
import { createEmfAnalogyView, type EmfViewMode } from './scene.view';

export type CreateEmfAnalogySceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: EmfAnalogySnapshot) => void;
};

export function createEmfAnalogyScene(
  options: CreateEmfAnalogySceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setSystemOn(on: boolean): void;
  setTapOpening(opening: number): void;
  incrementOpening(step?: number): void;
  setView(view: EmfViewMode): void;
  getView(): EmfViewMode;
  getSnapshot(): EmfAnalogySnapshot;
  start(): void;
  stop(): void;
} {
  const sim = createEmfAnalogySim();
  const view = createEmfAnalogyView({
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
    setSystemOn(on: boolean): void {
      sim.setSystemOn(on);
    },
    setTapOpening(opening: number): void {
      sim.setTapOpening(opening);
    },
    incrementOpening(step = 0.05): void {
      sim.incrementOpening(step);
    },
    setView(viewMode: EmfViewMode): void {
      view.setView(viewMode);
      renderAndEmit();
    },
    getView(): EmfViewMode {
      return view.getView();
    },
    getSnapshot(): EmfAnalogySnapshot {
      return sim.getSnapshot();
    },
    start(): void {
      (view as { start?(): void }).start?.();
    },
    stop(): void {
      (view as { stop?(): void }).stop?.();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

import type { TeachingMode } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-standards';
import type { SceneLifecycle } from '../types';
import { createEmfAnalogySim, type EmfAnalogySnapshot } from './scene.sim';
import { createEmfAnalogyView } from './scene.view';

export type CreateEmfAnalogySceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  legacyFlowDark?: boolean;
  onReadout?: (snapshot: EmfAnalogySnapshot) => void;
};

export function createEmfAnalogyScene(options: CreateEmfAnalogySceneOptions = {}): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setSystemOn(on: boolean): void;
  setTapOpening(opening: number): void;
  incrementOpening(step?: number): void;
  getSnapshot(): EmfAnalogySnapshot;
} {
  const sim = createEmfAnalogySim();
  const view = createEmfAnalogyView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    theme: options.theme ?? 'dark',
    legacyFlowDark: options.legacyFlowDark ?? false
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
    setMode(mode: TeachingMode): void {
      view.setMode(mode);
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
    getSnapshot(): EmfAnalogySnapshot {
      return sim.getSnapshot();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

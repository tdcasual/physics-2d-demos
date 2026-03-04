import type { TeachingMode } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import type { SceneLifecycle } from '../types';
import { createElectrificationSim, type ElectrificationScene, type ElectrificationSnapshot } from './scene.sim';
import { createElectrificationView } from './scene.view';

export type CreateElectrificationSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  onReadout?: (snapshot: ElectrificationSnapshot) => void;
};

export function createElectrificationScene(options: CreateElectrificationSceneOptions = {}): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: ElectrificationScene): void;
  runSceneAction(): void;
  getSnapshot(): ElectrificationSnapshot;
} {
  const sim = createElectrificationSim();
  const view = createElectrificationView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
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
    setMode(mode: TeachingMode): void {
      view.setMode(mode);
      renderAndEmit();
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      renderAndEmit();
    },
    setScene(scene: ElectrificationScene): void {
      sim.setScene(scene);
    },
    runSceneAction(): void {
      sim.runSceneAction();
    },
    getSnapshot(): ElectrificationSnapshot {
      return sim.getSnapshot();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

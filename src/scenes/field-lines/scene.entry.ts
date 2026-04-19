import type { TeachingMode } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-standards';
import type { SceneLifecycle } from '../types';
import { createFieldLinesSim, type FieldLinesScene, type FieldLinesSnapshot } from './scene.sim';
import { createFieldLinesView } from './scene.view';

export type CreateFieldLinesSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  onReadout?: (snapshot: FieldLinesSnapshot) => void;
};

export function createFieldLinesScene(options: CreateFieldLinesSceneOptions = {}): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: FieldLinesScene): void;
  setDensity(value: number): void;
  setCustomCharges(q1: number, q2: number): void;
  pickCharge(normX: number, normY: number): number | null;
  moveCharge(index: number, normX: number, normY: number): void;
  addCharge(q: number): void;
  removeCharge(index: number): void;
  getSnapshot(): FieldLinesSnapshot;
} {
  const sim = createFieldLinesSim({
    scene: 'single',
    density: 10,
    q1: 1,
    q2: -1
  });
  const view = createFieldLinesView({
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
    setScene(scene: FieldLinesScene): void {
      sim.setScene(scene);
    },
    setDensity(value: number): void {
      sim.setDensity(value);
    },
    setCustomCharges(q1: number, q2: number): void {
      sim.setCustomCharges(q1, q2);
    },
    pickCharge(normX: number, normY: number): number | null {
      return sim.pickCharge(normX, normY);
    },
    moveCharge(index: number, normX: number, normY: number): void {
      sim.setChargePosition(index, normX, normY);
    },
    addCharge(q: number): void {
      sim.addCharge(q);
    },
    removeCharge(index: number): void {
      sim.removeCharge(index);
    },
    getSnapshot(): FieldLinesSnapshot {
      return sim.getSnapshot();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

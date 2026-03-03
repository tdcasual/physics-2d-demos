import type { SceneLifecycle } from '../types';
import type { TeachingMode } from '../../app/teaching-standards';
import { projectileMeta } from './scene.meta';
import { createProjectileSim, type ProjectileParams, type ProjectileState } from './scene.sim';
import { createProjectileView } from './scene.view';

const defaultParams: ProjectileParams = {
  speed: projectileMeta.defaultParams.speed,
  angleDeg: projectileMeta.defaultParams.angleDeg,
  gravity: projectileMeta.defaultParams.gravity
};

export type CreateProjectileSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  onReadout?: (state: ProjectileState) => void;
};

export function createProjectileScene(options: CreateProjectileSceneOptions = {}): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  getState(): ProjectileState;
} {
  const sim = createProjectileSim(defaultParams);
  const view = createProjectileView({ canvas: options.canvas, mode: options.mode ?? 'normal' });

  return {
    init(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      view.render(state);
    },
    reset(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      view.render(state);
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      const state = sim.getState();
      view.render(state);
      options.onReadout?.(state);
    },
    resize(): void {
      view.resize();
    },
    setMode(mode: TeachingMode): void {
      view.setMode(mode);
    },
    getState(): ProjectileState {
      return sim.getState();
    },
    dispose(): void {
      view.dispose();
    }
  };
}

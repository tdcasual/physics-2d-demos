import type { SceneLifecycle } from '../types';
import type { TeachingMode } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { projectileMeta } from './scene.meta';
import {
  createProjectileSim,
  type ProjectileParams,
  type ProjectileState,
  type ResolvedProjectileParams
} from './scene.sim';
import { createProjectileView } from './scene.view';

const defaultParams: ProjectileParams = {
  speed: projectileMeta.defaultParams.speed,
  angleDeg: projectileMeta.defaultParams.angleDeg,
  gravity: projectileMeta.defaultParams.gravity,
  initialHeight: projectileMeta.defaultParams.initialHeight,
  windAccel: projectileMeta.defaultParams.windAccel,
  drag: projectileMeta.defaultParams.drag
};

export type CreateProjectileSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  onReadout?: (state: ProjectileState) => void;
};

export function createProjectileScene(options: CreateProjectileSceneOptions = {}): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  getState(): ProjectileState;
  getParams(): ResolvedProjectileParams;
  setParams(next: Partial<ProjectileParams>): ResolvedProjectileParams;
} {
  const sim = createProjectileSim(defaultParams);
  const view = createProjectileView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    theme: options.theme ?? 'dark'
  });

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
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
    },
    getState(): ProjectileState {
      return sim.getState();
    },
    getParams(): ResolvedProjectileParams {
      return sim.getParams();
    },
    setParams(next: Partial<ProjectileParams>): ResolvedProjectileParams {
      return sim.setParams(next);
    },
    dispose(): void {
      view.dispose();
    }
  };
}

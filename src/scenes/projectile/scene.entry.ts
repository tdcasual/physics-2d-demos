/**
 * 抛体运动场景入口 - 使用统一框架
 * 集成新版本的 view 和现有 sim
 */

import type { SceneLifecycle } from '../types';
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
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
  onReadout?: (state: ProjectileState) => void;
};

export function createProjectileScene(
  options: CreateProjectileSceneOptions = {} as CreateProjectileSceneOptions
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: 'light' | 'dark'): void;
  setMode(mode: 'normal' | 'presentation'): void;
  getState(): ProjectileState;
  getParams(): ResolvedProjectileParams;
  setParams(next: Partial<ProjectileParams>): ResolvedProjectileParams;
} {
  const sim = createProjectileSim(defaultParams);
  const view = createProjectileView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal'
  });

  return {
    init(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      // 不在这里调用 render，让调用者在 resize 后调用
    },
    reset(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      // 不在这里调用 render，让调用者控制
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
    setTheme(theme: 'light' | 'dark'): void {
      view.setTheme(theme);
    },
    setMode(mode: 'normal' | 'presentation'): void {
      view.setMode(mode);
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
      // view 和 sim 没有需要显式清理的资源
    }
  };
}

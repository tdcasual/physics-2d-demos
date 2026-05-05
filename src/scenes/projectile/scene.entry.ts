/**
 * 抛体运动场景入口 - 使用统一框架
 * 集成新版本的 view 和现有 sim
 */

import type { SceneLifecycle } from '../types';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createNotifySystem } from '../scene-entry-helpers';
import { projectileMeta } from './scene.meta';
import {
  createProjectileSim,
  type ProjectileParams,
  type ProjectileState,
  type ResolvedProjectileParams
} from './scene.sim';
import { createProjectileView } from './scene.view';

const defaultParams: ProjectileParams = {
  speed: projectileMeta.defaultParams.speed ?? projectileMeta.defaultParams.v0 ?? 30,
  angleDeg:
    projectileMeta.defaultParams.angleDeg ??
    projectileMeta.defaultParams.angle ??
    45,
  gravity:
    projectileMeta.defaultParams.gravity ?? projectileMeta.defaultParams.g ?? 9.8,
  initialHeight:
    projectileMeta.defaultParams.initialHeight ??
    projectileMeta.defaultParams.h0 ??
    0,
  windAccel: projectileMeta.defaultParams.windAccel ?? 0,
  drag: projectileMeta.defaultParams.drag ?? projectileMeta.defaultParams.c ?? 0
};

export type CreateProjectileSceneOptions = {
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
  onReadout?: (state: ProjectileState) => void;
};

function formatReadout(
  state: ProjectileState,
  params: ResolvedProjectileParams
) {
  return [
    { label: '时间 t', value: `${state.t.toFixed(2)} s` },
    { label: '位移 x', value: `${state.x.toFixed(2)} m` },
    { label: '高度 y', value: `${state.y.toFixed(2)} m` },
    { label: '速度 vx', value: `${state.vx.toFixed(2)} m/s` },
    { label: '速度 vy', value: `${state.vy.toFixed(2)} m/s` },
    {
      label: '参数 v0/θ',
      value: `${params.speed.toFixed(1)} / ${params.angleDeg.toFixed(1)}`
    },
    {
      label: '参数 g/h0',
      value: `${params.gravity.toFixed(2)} / ${params.initialHeight.toFixed(1)}`
    },
    {
      label: '风/阻力',
      value: `${params.windAccel.toFixed(1)} / ${params.drag.toFixed(3)}`
    }
  ];
}

export function createProjectileScene(
  options: CreateProjectileSceneOptions = {} as CreateProjectileSceneOptions
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: 'light' | 'dark'): void;
  setMode(mode: 'normal' | 'presentation'): void;
  getState(): ProjectileState;
  getParams(): ResolvedProjectileParams;
  setParams(next: Partial<ProjectileParams>): ResolvedProjectileParams;
  getReadoutItems(): Array<{
    label: string;
    value: string | number;
    layout?: 'half' | 'full';
  }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createProjectileSim(defaultParams);
  const view = createProjectileView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  const { notify, subscribe, clear } = createNotifySystem();

  return {
    init(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
    },
    reset(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      notify();
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      const state = sim.getState();
      view.render(state);
      options.onReadout?.(state);
      notify();
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
      const params = sim.setParams(next);
      notify();
      return params;
    },
    getReadoutItems(): Array<{
      label: string;
      value: string | number;
      layout?: 'half' | 'full';
    }> {
      return formatReadout(sim.getState(), sim.getParams());
    },
    subscribe,
    dispose(): void {
      clear();
      view.dispose();
    }
  };
}

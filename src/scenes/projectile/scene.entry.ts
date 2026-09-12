/**
 * 抛体运动场景入口 - 使用统一框架
 * 集成新版本的 view 和现有 sim
 */

import type { SceneLifecycle } from '../types';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { projectileMeta } from './scene.meta';
import {
  createProjectileSim,
  type ProjectileParams,
  type ProjectileState,
  type ResolvedProjectileParams
} from './scene.sim';
import { createProjectileView } from './scene.view';

const defaultParams: ProjectileParams = {
  speed: projectileMeta.defaultParams.v0 ?? 30,
  angleDeg: projectileMeta.defaultParams.theta ?? 45,
  gravity: projectileMeta.defaultParams.g ?? 9.8,
  initialHeight: projectileMeta.defaultParams.h0 ?? 0,
  windAccel: projectileMeta.defaultParams.windAccel ?? 0,
  drag: projectileMeta.defaultParams.c ?? 0
};

export type CreateProjectileSceneOptions = {
  canvas?: HTMLCanvasElement;
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
    { key: 't', label: '时间 t', value: `${state.t.toFixed(2)} s` },
    { key: 'x', label: '位移 x', value: `${state.x.toFixed(2)} m` },
    { key: 'y', label: '高度 y', value: `${state.y.toFixed(2)} m` },
    { key: 'vx', label: '速度 vx', value: `${state.vx.toFixed(2)} m/s` },
    { key: 'vy', label: '速度 vy', value: `${state.vy.toFixed(2)} m/s` },
    {
      key: 'v0-theta',
      label: '参数 v0/θ',
      value: `${params.speed.toFixed(1)} / ${params.angleDeg.toFixed(1)}`
    },
    {
      key: 'g-h0',
      label: '参数 g/h0',
      value: `${params.gravity.toFixed(2)} / ${params.initialHeight.toFixed(1)}`
    },
    {
      key: 'wind-drag',
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
    key: string;
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

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout,
    // init/reset 经标准入口会 renderAndEmit 一次（比旧手写入口多一次首绘），属有意对齐。
    // init/reset 时除 sim.reset() 外还需清空轨迹
    resetView: () => view.reset()
  });

  return {
    // setMode 经标准入口转发 demoHints，属有意对齐（旧入口可能丢弃 hints）
    ...base,
    getState(): ProjectileState {
      return sim.getState();
    },
    getParams(): ResolvedProjectileParams {
      return sim.getParams();
    },
    // wrapAction = 变更后 renderAndEmit + notify，属迁入标准入口后的有意行为
    setParams: base.wrapAction(
      (next: Partial<ProjectileParams>): ResolvedProjectileParams =>
        sim.setParams(next)
    ),
    getReadoutItems(): Array<{
      key: string;
      label: string;
      value: string | number;
      layout?: 'half' | 'full';
    }> {
      return formatReadout(sim.getState(), sim.getParams());
    }
  };
}

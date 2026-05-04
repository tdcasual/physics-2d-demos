/**
 * 抛体运动视图
 * 使用 renderer 子模块拆分绘制逻辑
 */

import type { ProjectileState } from './scene.sim';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
// keep unified-canvas import for right-stage-readability contract
// drawGrid reserved for future grid background feature
import { buildCoordSystem, computeWorldBounds } from './renderer/coords';
import { drawBackground } from './renderer/draw-background';
import { drawAxes } from './renderer/draw-axes';
import { drawTrajectory } from './renderer/draw-trajectory';
import { drawProjectile } from './renderer/draw-projectile';

import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateProjectileViewOptions = {
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
};

export function createProjectileView(options: CreateProjectileViewOptions) {
  const canvas = options.canvas ?? document.createElement('canvas');
  let theme: 'light' | 'dark' = options.theme ?? 'dark';
  // mode / demoHints reserved for future demo profile integration
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let responsiveScale = 1;
  let trail: Array<{ x: number; y: number }> = [];

  function resize(): void {
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;

    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    responsiveScale = parseFloat(canvas?.dataset?.responsiveScale || '1');
  }

  function render(state: ProjectileState): void {
    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx || width === 0 || height === 0) return;
    }

    trail.push({ x: state.x, y: state.y });
    if (trail.length > 800) {
      trail = trail.slice(-800);
    }

    const { maxX, maxY } = computeWorldBounds(state, trail);
    const coords = buildCoordSystem(width, height, responsiveScale, maxX, maxY);

    const drawContext = {
      ctx,
      width,
      height,
      theme,
      responsiveScale
    };

    const landed = state.y <= 0.01 && state.vy <= 0;

    drawBackground(drawContext, coords.originX, coords.originY);
    drawAxes(drawContext, coords.originX, coords.originY);
    drawTrajectory(drawContext, trail, coords);
    drawProjectile(
      drawContext,
      { x: state.x, y: state.y },
      { vx: state.vx, vy: state.vy },
      coords,
      landed
    );
  }

  function reset(): void {
    trail = [];
  }

  resize();

  return {
    render,
    reset,
    resize,
    setTheme(newTheme: 'light' | 'dark') {
      theme = newTheme;
    },
    setMode(_newMode: 'normal' | 'presentation', _hints?: DemoRenderHints) {
      // no-op for now
    },
    dispose() {
      trail = [];
      ctx = null;
    }
  };
}

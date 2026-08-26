/**
 * 劈尖干涉 — Canvas 渲染（工厂装配，绘制逻辑见 renderer/ 子模块）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { WedgeState } from './scene.sim';
import type { WedgeViewContext } from './renderer/types';
import { drawScene } from './renderer/draw-scene';

export type CreateWedgeViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createWedgeView(options: CreateWedgeViewOptions = {}) {
  const canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let graphCanvas = options.graphCanvas ?? null;
  let graphCtx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | undefined = options.demoHints;
  let cssWidth = 800;
  let cssHeight = 600;
  let scale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 800));
    cssHeight = Math.max(150, Math.floor(rect.height || 600));
    scale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function resizeGraphCanvas(): void {
    if (!graphCanvas) return;
    const newCtx = sizeCanvasToFill(graphCanvas);
    if (newCtx) graphCtx = newCtx;
  }

  // 绘制调用时把当前可变状态以快照形式显式传给 renderer 模块
  function viewContext(): WedgeViewContext {
    return {
      ctx,
      graphCanvas,
      graphCtx,
      theme,
      mode,
      demoHints,
      cssWidth,
      cssHeight,
      scale
    };
  }

  return {
    render(next: WedgeState): void {
      resizeCanvas();
      resizeGraphCanvas();
      drawScene(viewContext(), next);
    },
    resize(): void {
      resizeCanvas();
      resizeGraphCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(next: TeachingMode, hints?: DemoRenderHints): void {
      mode = next;
      demoHints = hints;
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      resizeGraphCanvas();
    },
    dispose(): void {}
  };
}

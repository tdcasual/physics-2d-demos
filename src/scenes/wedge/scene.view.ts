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
  let cssWidth = 0;
  let cssHeight = 0;
  let scale = 1;
  // 主 canvas 设备像素比（resize 时记录，renderer 热路径经 context 快照读取）
  let dpr = 1;
  // 图表 canvas 的记录尺寸（resize 时更新，render 热路径不再读 getBoundingClientRect）
  let graphW = 400;
  let graphH = 200;
  let graphScale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 800));
    cssHeight = Math.max(150, Math.floor(rect.height || 600));
    scale = parseFloat(canvas.dataset.responsiveScale || '1');
    dpr = canvas.width / Math.max(1, cssWidth);
  }

  function resizeGraphCanvas(): void {
    if (!graphCanvas) return;
    const newCtx = sizeCanvasToFill(graphCanvas);
    if (newCtx) graphCtx = newCtx;
    const rect = graphCanvas.getBoundingClientRect();
    graphW = Math.max(200, Math.floor(rect.width || 400));
    graphH = Math.max(100, Math.floor(rect.height || 200));
    graphScale = parseFloat(graphCanvas.dataset.responsiveScale || '1');
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
      scale,
      dpr,
      graphW,
      graphH,
      graphScale
    };
  }

  return {
    render(next: WedgeState): void {
      // sizing 由 SceneAdapter 的 ResizeObserver + rAF 路径驱动（scene.resize()），
      // 这里仅在尚未完成首次 sizing（记录尺寸为 0）时兜底一次，
      // 避免每帧 getBoundingClientRect + setTransform 的同步布局查询
      if (cssWidth === 0 || cssHeight === 0) resizeCanvas();
      if (graphCanvas && !graphCtx) resizeGraphCanvas();
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

/**
 * 劈尖干涉 — Canvas 渲染（工厂装配，绘制逻辑见 renderer/ 子模块）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
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
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  // 主 canvas：初始记录尺寸为 0，render 兜底据此触发首次 sizing
  const stage = createCanvasViewport({ canvas: options.canvas ?? null });
  // 图表 canvas 的记录尺寸（resize 时更新，render 热路径不再读 getBoundingClientRect）
  const graph = createCanvasViewport({
    canvas: options.graphCanvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: 400,
      fallbackHeight: 200,
      minWidth: 200,
      minHeight: 100
    },
    initialWidth: 400,
    initialHeight: 200
  });

  // 绘制调用时把当前可变状态以快照形式显式传给 renderer 模块
  function viewContext(): WedgeViewContext {
    return {
      ctx: stage.ctx,
      graphCanvas: graph.canvas,
      graphCtx: graph.ctx,
      theme: env.theme,
      mode: env.mode,
      demoHints: env.demoHints,
      cssWidth: stage.cssWidth,
      cssHeight: stage.cssHeight,
      scale: stage.responsiveScale,
      dpr: stage.dpr,
      graphW: graph.cssWidth,
      graphH: graph.cssHeight,
      graphScale: graph.responsiveScale
    };
  }

  return {
    render(next: WedgeState): void {
      // sizing 由 SceneAdapter 的 ResizeObserver + rAF 路径驱动（scene.resize()），
      // 这里仅在尚未完成首次 sizing（记录尺寸为 0）时兜底一次，
      // 避免每帧 getBoundingClientRect + setTransform 的同步布局查询
      stage.ensureSized();
      if (graph.canvas && !graph.ctx) graph.resize();
      drawScene(viewContext(), next);
    },
    resize(): void {
      stage.resize();
      graph.resize();
    },
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
    },
    setMode(next: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(next, hints);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
    },
    dispose(): void {}
  };
}

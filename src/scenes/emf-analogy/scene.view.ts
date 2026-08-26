import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { EmfAnalogySnapshot } from './scene.sim';
import { drawCircuit } from './renderer/draw-circuit';
import { drawWaterAnalogy } from './renderer/draw-water-analogy';

export type EmfViewMode = 'circuit' | 'water';

import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateEmfAnalogyViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

export function createEmfAnalogyView(
  options: CreateEmfAnalogyViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  // demoHints reserved for future demo profile integration
  let currentView: EmfViewMode = 'water';
  let snapshot: EmfAnalogySnapshot | null = null;
  let cssWidth = 1280;
  let cssHeight = 720;
  let responsiveScale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 1280));
    cssHeight = Math.max(150, Math.floor(rect.height || 720));
    responsiveScale = parseFloat(canvas?.dataset?.responsiveScale || '1');
  }

  function draw(): void {
    if (!ctx || !snapshot) return;

    const width = cssWidth;
    const height = cssHeight;

    if (currentView === 'circuit') {
      drawCircuit({
        ctx,
        width,
        height,
        snapshot,
        theme,
        phase: snapshot.state.phase,
        responsiveScale
      });
    } else {
      drawWaterAnalogy({
        ctx,
        width,
        height,
        snapshot,
        theme,
        phase: snapshot.state.phase,
        responsiveScale
      });
    }
  }

  // 渲染统一由 scene-shell 的播放循环驱动（onStep 推进相位、onRender 调 render），
  // 视图不再自建 RAF，避免播放时每帧重复绘制。
  return {
    render(next: EmfAnalogySnapshot): void {
      snapshot = next;
      draw();
    },

    resize(): void {
      resizeCanvas();
      if (snapshot) draw();
    },

    setMode(_nextMode: TeachingMode, _hints?: DemoRenderHints): void {
      if (snapshot) draw();
    },

    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw();
    },

    setView(view: EmfViewMode): void {
      currentView = view;
      if (snapshot) draw();
    },

    getView(): EmfViewMode {
      return currentView;
    },

    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}

export type EmfAnalogyView = ReturnType<typeof createEmfAnalogyView>;

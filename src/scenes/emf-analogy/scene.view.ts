import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { createCanvasViewport } from '../view-base';
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
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: 1280, fallbackHeight: 720 },
    initialWidth: 1280,
    initialHeight: 720,
    eagerContext: true
  });
  let theme: TeachingTheme = options.theme ?? 'dark';
  // demoHints reserved for future demo profile integration
  let currentView: EmfViewMode = 'water';
  let snapshot: EmfAnalogySnapshot | null = null;

  function draw(): void {
    const ctx = stage.ctx;
    if (!ctx || !snapshot) return;

    const width = stage.cssWidth;
    const height = stage.cssHeight;

    if (currentView === 'circuit') {
      drawCircuit({
        ctx,
        width,
        height,
        snapshot,
        theme,
        phase: snapshot.state.phase,
        responsiveScale: stage.responsiveScale
      });
    } else {
      drawWaterAnalogy({
        ctx,
        width,
        height,
        snapshot,
        theme,
        phase: snapshot.state.phase,
        responsiveScale: stage.responsiveScale
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
      stage.resize();
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
      stage.release();
    }
  };
}

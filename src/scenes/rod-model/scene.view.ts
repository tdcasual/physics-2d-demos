import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { rodModelConstants as C, type RodState } from './scene.sim';
import { drawApparatus } from './renderer/draw-apparatus';
import { drawGraphs } from './renderer/draw-graphs';
import { PALETTE, sizeGraphCanvasToHost } from './renderer/draw-helpers';

export type { HorizontalArrowGeom } from './renderer/draw-helpers';
export {
  forceArrowGeom,
  rightwardRodArrow,
  rodXToPx,
  sizeGraphCanvasToHost,
  stageMetrics,
  velocityArrowGeom
} from './renderer/draw-helpers';
export {
  plotBox,
  plotChrome,
  plotTimeMax,
  velocityAxisMax
} from './renderer/draw-graphs';

export type CreateRodModelViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createRodModelView(options: CreateRodModelViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.stageFallbackWidth,
      fallbackHeight: C.stageFallbackHeight
    },
    initialWidth: C.stageFallbackWidth,
    initialHeight: C.stageFallbackHeight,
    eagerContext: true
  });
  const graph = {
    canvas: (options.graphCanvas ?? null) as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    cssWidth: C.graphFallbackWidth as number,
    cssHeight: C.graphFallbackHeight as number,
    responsiveScale: 1,
    resize(): void {
      if (!graph.canvas) return;
      const sized = sizeGraphCanvasToHost(graph.canvas);
      graph.ctx = sized.ctx;
      graph.cssWidth = sized.cssWidth;
      graph.cssHeight = sized.cssHeight;
      graph.responsiveScale = sized.responsiveScale;
    },
    attach(canvas: HTMLCanvasElement): void {
      graph.canvas = canvas;
      graph.resize();
    },
    release(): void {
      graph.canvas = null;
      graph.ctx = null;
    }
  };
  if (graph.canvas) graph.resize();
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: RodState | null = null;

  function paint(state: RodState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 10);
    ctx.clearRect(0, 0, width, height);
    drawApparatus(ctx, state, width, height, PALETTE[env.theme], rs, font);
    if (graph.canvas) {
      if (!graph.ctx) graph.resize();
      const gctx = graph.ctx;
      if (gctx) {
        const gScale = graph.responsiveScale;
        const gFont = (base: number): number =>
          scaledSize(base * typeScale, Math.max(gScale, 0.3), 10);
        drawGraphs(
          gctx,
          state,
          graph.cssWidth,
          graph.cssHeight,
          PALETTE[env.theme],
          gScale,
          gFont
        );
      }
    }
  }

  return {
    render(state: RodState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (graph.canvas) graph.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      graph.release();
      stage.release();
    }
  };
}

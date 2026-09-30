import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  potentialGraphConstants as C,
  type PotentialGraphState
} from './scene.sim';
import { drawApparatus } from './renderer/draw-apparatus';
import { drawGraphs } from './renderer/draw-graphs';
import {
  PALETTE,
  apparatusPxToX,
  axisLayout,
  sizeGraphCanvasToHost
} from './renderer/draw-helpers';

export {
  apparatusXToPx,
  graphXToPx,
  sizeGraphCanvasToHost
} from './renderer/draw-helpers';

export type CreatePotentialGraphViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onProbePosition?: (x: number) => void;
};

export function createPotentialGraphView(
  options: CreatePotentialGraphViewOptions = {}
) {
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
  let snapshot: PotentialGraphState | null = null;
  let dragging = false;

  function paint(state: PotentialGraphState): void {
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
        const gFont = (base: number): number =>
          scaledSize(
            base * typeScale,
            Math.max(graph.responsiveScale, 0.3),
            10
          );
        drawGraphs(
          gctx,
          state,
          graph.cssWidth,
          graph.cssHeight,
          PALETTE[env.theme],
          gFont
        );
      }
    }
  }

  function worldXFromEvent(event: PointerEvent): number | null {
    const canvas = stage.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const axis = axisLayout(
      stage.cssWidth,
      stage.cssHeight,
      stage.responsiveScale
    );
    if (!dragging && Math.abs(cssY - axis.y) > axis.band) return null;
    return apparatusPxToX(cssX, axis.left, axis.right);
  }

  function handlePointerDown(event: PointerEvent): void {
    const x = worldXFromEvent(event);
    if (x === null) return;
    dragging = true;
    stage.canvas?.setPointerCapture?.(event.pointerId);
    options.onProbePosition?.(x);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragging) return;
    const x = worldXFromEvent(event);
    if (x === null) return;
    options.onProbePosition?.(x);
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    try {
      stage.canvas?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* already released */
    }
  }

  function bindPointer(canvas: HTMLCanvasElement): void {
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'ew-resize';
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
  }

  function unbindPointer(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  }

  if (stage.canvas) bindPointer(stage.canvas);

  return {
    render(state: PotentialGraphState): void {
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
      if (stage.canvas) unbindPointer(stage.canvas);
      snapshot = null;
      graph.release();
      stage.release();
    }
  };
}

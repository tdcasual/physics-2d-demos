import type { ChaseMeetSnapshot } from './scene.sim';
import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../app/demo-profile';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import {
  getResponsiveViewport,
  resolveResponsiveStageWidth
} from '../../platform/viewport';
import {
  createStageDom,
  resizeCanvasWithDpr,
  resolveVisuals,
  type StageDom
} from './renderer/view-utils';
import { drawMotion } from './renderer/draw-motion';
import { drawGraphs } from './renderer/draw-graphs';
import { drawFallback } from './renderer/draw-fallback';

export type CreateChaseMeetViewOptions = {
  canvas?: HTMLCanvasElement;
  stageSlot?: HTMLElement;
  graphSlot?: HTMLElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

export function createChaseMeetView(options: CreateChaseMeetViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let stageSlot = options.stageSlot ?? null;
  let graphSlot = options.graphSlot ?? null;
  let stageDom: StageDom | null = null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | null = options.demoHints ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: ChaseMeetSnapshot | null = null;
  let cssWidth = 1280;
  let cssHeight = 720;

  function ensureStageDom(): StageDom | null {
    if (!stageSlot) return null;
    if (!stageDom) {
      stageDom = createStageDom(stageSlot);
      if (graphSlot && stageDom) {
        const graphsSection = stageDom.root.querySelector(
          '.chase-modern-card--graphs'
        );
        if (graphsSection) {
          stageDom.root.removeChild(graphsSection);
          graphSlot.replaceChildren();
          graphSlot.appendChild(graphsSection);
        }
      }
    }
    return stageDom;
  }

  function resizeFallbackCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    cssHeight = Math.max(280, Math.floor(rect.height || 720));
  }

  function initStageSize(): void {
    const dom = ensureStageDom();
    if (!dom) {
      resizeFallbackCanvas();
      return;
    }

    const scale = demoHints?.contentScale ?? (mode === 'presentation' ? 1.5 : 1.0);
    const viewport = getResponsiveViewport(960);
    const totalWidth = resolveResponsiveStageWidth(dom.root, {
      minWidthPx: 320,
      horizontalPaddingPx: 16,
      narrowBreakpointPx: 960
    });
    dom.root.classList.toggle('is-narrow', viewport.isNarrow);

    const stageHeight = Math.max(
      1,
      Math.floor(dom.root.getBoundingClientRect().height || viewport.height)
    );
    const trackHeight = Math.min(
      Math.round(380 * scale),
      Math.max(
        Math.round(170 * scale),
        stageHeight * (viewport.isNarrow ? 0.34 : 0.42)
      )
    );

    let graphHeight: number;
    let graphWidth: number;
    if (graphSlot) {
      const gRect = graphSlot.getBoundingClientRect();
      graphWidth = Math.max(1, Math.floor((gRect.width || totalWidth) / 2 - 4));
      graphHeight = Math.max(120, Math.floor(gRect.height || 300));
    } else {
      graphHeight = Math.min(
        Math.round(250 * scale),
        Math.max(
          Math.round(150 * scale),
          stageHeight * (viewport.isNarrow ? 0.22 : 0.34)
        )
      );
      graphWidth = viewport.isNarrow
        ? totalWidth
        : Math.max(180, totalWidth / 2 - 8);
    }

    const dpr = Math.min(
      2,
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
    );
    dom.dpr = dpr;
    resizeCanvasWithDpr(
      dom.motionCanvas,
      dom.motionCtx,
      totalWidth,
      trackHeight,
      dpr
    );
    resizeCanvasWithDpr(dom.xCanvas, dom.xCtx, graphWidth, graphHeight, dpr);
    resizeCanvasWithDpr(dom.vCanvas, dom.vCtx, graphWidth, graphHeight, dpr);
  }

  function draw(next: ChaseMeetSnapshot): void {
    const dom = ensureStageDom();
    if (!dom) {
      if (ctx) {
        drawFallback(ctx, cssWidth, cssHeight, next, theme);
      }
      return;
    }

    const cssW = dom.motionCanvas.width / dom.dpr;
    const cssH = dom.motionCanvas.height / dom.dpr;
    const s = demoHints?.contentScale ?? (mode === 'presentation' ? 1.5 : 1.0);
    const visuals = resolveVisuals(s, cssW, cssH);

    drawMotion({
      ctx: dom.motionCtx,
      cssW,
      cssH,
      visualScale: visuals.scale,
      snapshot: next,
      theme
    });

    const xW = dom.xCanvas.width / dom.dpr;
    const xH = dom.xCanvas.height / dom.dpr;
    const vW = dom.vCanvas.width / dom.dpr;
    const vH = dom.vCanvas.height / dom.dpr;
    const shortEdge = Math.min(xW, xH, vW, vH);
    const graphVisuals = resolveVisuals(s, shortEdge * 2, shortEdge);

    drawGraphs({
      xCtx: dom.xCtx,
      vCtx: dom.vCtx,
      xW,
      xH,
      vW,
      vH,
      visualScale: graphVisuals.scale,
      snapshot: next,
      theme
    });
  }

  return {
    render(next: ChaseMeetSnapshot): void {
      snapshot = next;
      draw(next);
    },
    reset(): void {
      if (snapshot) {
        draw(snapshot);
      }
    },
    attachCanvas(nextCanvas: HTMLCanvasElement): void {
      canvas = nextCanvas;
      ctx = nextCanvas.getContext('2d');
      resizeFallbackCanvas();
      if (snapshot) {
        draw(snapshot);
      }
    },
    attachStageSlot(nextSlot: HTMLElement): void {
      stageSlot = nextSlot;
      stageDom = null;
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    resize(): void {
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      mode = nextMode;
      if (hints) {
        demoHints = hints;
      }
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) {
        draw(snapshot);
      }
    },
    dispose(): void {
      snapshot = null;
      if (stageSlot) {
        stageSlot.replaceChildren();
      }
      if (graphSlot) {
        graphSlot.replaceChildren();
      }
      stageDom = null;
      stageSlot = null;
      graphSlot = null;
      canvas = null;
      ctx = null;
    }
  };
}

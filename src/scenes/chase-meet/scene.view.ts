import type { ChaseMeetSnapshot } from './scene.sim';
import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getResponsiveScale, sizeCanvasToFill } from '../../core/canvas-sizing';
import { createViewEnvironment } from '../view-base';
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

/** 1440×900 split-right 舞台短边 getResponsiveScale 实测（clamp 上限）。 */
const DESKTOP_LAYOUT_SCALE = 1.5;
/** 未挂载时 getBoundingClientRect 回落，不参与 scale（已知误报类）。 */
const FALLBACK_STAGE_W = 1280;
const FALLBACK_STAGE_H = 720;
const NARROW_BREAK_PX = 960;

const USABLE_BAND_MIN = 240 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_MIN_GRAPH = 180 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_MIN_NARROW = 200 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_CAP_NARROW = 300 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_MIN_PRESENT = 240 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_CAP = 380 / DESKTOP_LAYOUT_SCALE;
const TRACK_BAND_MIN = 190 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_MIN_MOBILE = 140 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_CAP_MOBILE = 220 / DESKTOP_LAYOUT_SCALE;
/**
 * mobile 图表 tab 里 x-t / v-t 纵向堆叠、面板可纵向滚动。图高下限按图宽比例给，
 * 不跟舞台短边算出的 layoutScale 走：320×568 时舞台很矮，layoutScale≈0.5 把
 * 图高压到 ~73px（282×73，宽高比接近 4:1，曲线几乎压平）。2.5:1 是保证
 * 坐标轴刻度与曲线仍可读的最扁比例。
 */
const GRAPH_MIN_ASPECT_MOBILE = 0.4;
const GRAPH_BAND_MIN = 120 / DESKTOP_LAYOUT_SCALE;
const GRAPH_SLOT_FALLBACK = 300;
const GRAPH_BAND_MIN_NARROW = 130 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_CAP_NARROW = 200 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_MIN_PRESENT = 140 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_CAP = 250 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_MIN_DESKTOP = 160 / DESKTOP_LAYOUT_SCALE;
const GRAPH_BAND_MIN_W = 180 / DESKTOP_LAYOUT_SCALE;

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
  // contentScale 计算统一走 view-base（normal=1，presentation=hints ?? 1.5）
  const env = createViewEnvironment({
    mode: options.mode,
    demoHints: options.demoHints ?? undefined
  });
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: ChaseMeetSnapshot | null = null;
  let cssWidth = FALLBACK_STAGE_W;
  let cssHeight = FALLBACK_STAGE_H;
  let graphResizeObserver: ResizeObserver | null = null;
  let lastGraphSlotSize = '';

  function observeGraphSlot(): void {
    if (
      !graphSlot ||
      graphResizeObserver ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    graphResizeObserver = new ResizeObserver(() => {
      if (!graphSlot) return;
      const rect = graphSlot.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nextSize = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      if (nextSize === lastGraphSlotSize) return;
      lastGraphSlotSize = nextSize;
      initStageSize();
      if (snapshot) draw(snapshot);
    });
    graphResizeObserver.observe(graphSlot);
  }

  function ensureStageDom(): StageDom | null {
    if (!stageSlot) return null;
    if (!stageDom) {
      stageDom = createStageDom(stageSlot);
    }
    return stageDom;
  }

  function attachGraphSlot(nextSlot: HTMLElement): void {
    graphResizeObserver?.disconnect();
    graphResizeObserver = null;
    lastGraphSlotSize = '';
    graphSlot = nextSlot;
    const dom = ensureStageDom();
    const graphsSection = dom?.root.querySelector('.chase-modern-card--graphs');
    if (!graphsSection) return;

    graphSlot.replaceChildren();
    graphSlot.appendChild(graphsSection);
    observeGraphSlot();
    initStageSize();
    if (snapshot) draw(snapshot);
  }

  function resizeFallbackCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width || FALLBACK_STAGE_W));
    cssHeight = Math.max(1, Math.floor(rect.height || FALLBACK_STAGE_H));
  }

  function initStageSize(): void {
    const dom = ensureStageDom();
    if (!dom) {
      resizeFallbackCanvas();
      return;
    }

    const viewport = getResponsiveViewport(NARROW_BREAK_PX);
    const totalWidth = resolveResponsiveStageWidth(dom.root, {
      minWidthPx: 1,
      horizontalPaddingPx: 16,
      narrowBreakpointPx: NARROW_BREAK_PX
    });
    dom.root.classList.toggle('is-narrow', viewport.isNarrow);

    const stageHeight = Math.max(
      1,
      Math.floor(dom.root.getBoundingClientRect().height || viewport.height)
    );
    const layoutScale = getResponsiveScale(totalWidth, stageHeight);
    const layoutId = stageSlot
      ?.closest('[data-layout-id]')
      ?.getAttribute('data-layout-id');
    const hasMobileGraphSlot =
      Boolean(graphSlot) && layoutId === 'mobile-stack';
    // 布局高度不乘 contentScale：现象倍率只进绘制。演示期按 60/40 切运动带/图像，
    // 并预留下方 docked-bottom 读数条，避免图被 HUD 盖住。
    const isPresentation = env.mode === 'presentation';
    const hudReserve = isPresentation
      ? Math.round(Math.min(window.innerHeight * 0.22, 176))
      : 0;
    const usableHeight = Math.max(
      USABLE_BAND_MIN * layoutScale,
      stageHeight - hudReserve
    );
    let trackHeight = viewport.isNarrow
      ? hasMobileGraphSlot
        ? Math.max(TRACK_BAND_MIN_GRAPH * layoutScale, stageHeight - 4)
        : Math.max(
            TRACK_BAND_MIN_NARROW * layoutScale,
            Math.min(
              TRACK_BAND_CAP_NARROW * layoutScale,
              Math.round(totalWidth * 0.52)
            )
          )
      : isPresentation
        ? Math.max(
            TRACK_BAND_MIN_PRESENT * layoutScale,
            Math.round(usableHeight * 0.62)
          )
        : Math.min(
            TRACK_BAND_CAP * layoutScale,
            Math.max(TRACK_BAND_MIN * layoutScale, stageHeight * 0.42)
          );

    let graphHeight: number;
    let graphWidth: number;
    if (graphSlot) {
      const gRect = graphSlot.getBoundingClientRect();
      if (hasMobileGraphSlot) {
        const plotWidth =
          dom.xCanvas.parentElement?.getBoundingClientRect().width ?? 0;
        const availableHeight = gRect.height
          ? Math.floor((gRect.height - 84) / 2)
          : Math.round(totalWidth * 0.44);
        graphWidth = Math.max(
          1,
          Math.floor(
            plotWidth || (gRect.width > 0 ? gRect.width - 14 : totalWidth - 16)
          )
        );
        graphHeight = Math.max(
          GRAPH_BAND_MIN_MOBILE * layoutScale,
          Math.round(graphWidth * GRAPH_MIN_ASPECT_MOBILE),
          Math.min(GRAPH_BAND_CAP_MOBILE * layoutScale, availableHeight)
        );
      } else {
        graphWidth = Math.max(
          1,
          Math.floor((gRect.width || totalWidth) / 2 - 4)
        );
        graphHeight = Math.max(
          GRAPH_BAND_MIN * layoutScale,
          Math.floor(gRect.height || GRAPH_SLOT_FALLBACK)
        );
      }
    } else if (viewport.isNarrow) {
      graphWidth = totalWidth;
      graphHeight = Math.max(
        GRAPH_BAND_MIN_NARROW * layoutScale,
        Math.min(
          GRAPH_BAND_CAP_NARROW * layoutScale,
          Math.round(totalWidth * 0.42)
        )
      );
    } else {
      graphHeight = isPresentation
        ? Math.max(
            GRAPH_BAND_MIN_PRESENT * layoutScale,
            Math.round(usableHeight * 0.3)
          )
        : Math.min(
            GRAPH_BAND_CAP * layoutScale,
            Math.max(GRAPH_BAND_MIN_DESKTOP * layoutScale, stageHeight * 0.34)
          );
      graphWidth = Math.max(GRAPH_BAND_MIN_W * layoutScale, totalWidth / 2 - 8);
    }

    if (isPresentation && !viewport.isNarrow && !graphSlot) {
      const motionCard = dom.motionCanvas.closest('.chase-modern-card--motion');
      const graphsCard = dom.xCanvas.closest('.chase-modern-card--graphs');
      const motionBox = motionCard?.getBoundingClientRect();
      const graphsBox = graphsCard?.getBoundingClientRect();
      if (motionBox && motionBox.height > 40) {
        trackHeight = Math.max(
          TRACK_BAND_MIN_NARROW * layoutScale,
          Math.floor(motionBox.height)
        );
      }
      if (graphsBox && graphsBox.height > 40) {
        graphWidth = Math.max(
          GRAPH_BAND_MIN_W * layoutScale,
          Math.floor((graphsBox.width || totalWidth) / 2 - 8)
        );
        graphHeight = Math.max(
          GRAPH_BAND_MIN * layoutScale,
          Math.floor(graphsBox.height - 36)
        );
      }
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
    const s = env.contentScale();
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
    attachGraphSlot,
    resize(): void {
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(nextMode, hints);
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
      graphResizeObserver?.disconnect();
      graphResizeObserver = null;
      lastGraphSlotSize = '';
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

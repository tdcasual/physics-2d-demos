import { readElementLayoutSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import type { TickerTapeState } from './scene.sim';
import { drawGraphs, toPoints, type GraphKind } from './renderer/draw-graphs';
import { drawTape, type TapeHit } from './renderer/draw-tape';

export type { GraphPanelLayout } from './renderer/graph-layout';
export {
  axisTicksForSpan,
  estimateTickLabelWidth,
  formatGraphTick,
  graphAxisAnchor,
  graphPlotInsets,
  layoutGraphPanels
} from './renderer/graph-layout';
export { findWorkspaceTransportBar, tapeScaleCap } from './renderer/tape-band';

export type CreateTickerTapeViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createTickerTapeView(options: CreateTickerTapeViewOptions) {
  const canvas = options.canvas ?? document.createElement('canvas');
  let readPointsOpen: () => boolean = () => false;
  function pointsOpen(): boolean {
    try {
      return readPointsOpen();
    } catch {
      return false;
    }
  }
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const size = readElementLayoutSize(c);
      return {
        width: Math.max(1, Math.floor(size.width)),
        height: Math.max(1, Math.floor(size.height))
      };
    }
  });
  const graphStage = createCanvasViewport({
    canvas: null,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const size = readElementLayoutSize(c);
      return {
        width: Math.max(1, Math.floor(size.width)),
        height: Math.max(1, Math.floor(size.height))
      };
    }
  });

  let onOriginDrag: ((tickIndex: number) => void) | null = null;
  let draggingOrigin = false;
  let hoverOrigin = false;
  /** 抓取点相对尺零刻度线的偏移（px）：拖动时尺随手走，不在按下瞬间跳吸。 */
  let grabOffsetPx = 0;
  let tapeHit: TapeHit | null = null;
  let plottedXCm: Array<number | null> | null = null;
  let plottedVMs: Array<number | null> | null = null;
  /** 每张图独立的描点/拟合状态：x–t 与 v–t 可分别描点、拟合。 */
  const plotted: Record<GraphKind, boolean> = { x: false, v: false };
  const fitted: Record<GraphKind, boolean> = { x: false, v: false };
  /** 绘图选择：勾选哪些图（可多选）。 */
  const selected: Record<GraphKind, boolean> = { x: true, v: true };
  /** 描点/拟合动画（纯视觉，状态在触发瞬间已置位）。 */
  type PlotAnim = {
    mode: 'scatter' | 'fit';
    start: number;
    state: TickerTapeState;
  };
  const anims: Partial<Record<GraphKind, PlotAnim>> = {};
  let animFrame: number | null = null;
  const graphLayoutRetries = { count: 0 };
  let graphResizeObserver: ResizeObserver | null = null;
  let graphResizeObservedHost: HTMLElement | null = null;
  let lastGraphState: TickerTapeState | null = null;
  const SCATTER_STEP_MS = 180;
  const FIT_DURATION_MS = 600;

  function prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function selectedKinds(): GraphKind[] {
    return (['x', 'v'] as const).filter((k) => selected[k]);
  }

  function animProgress(
    kind: GraphKind,
    mode: PlotAnim['mode'],
    pointCount: number,
    now: number
  ): number {
    const anim = anims[kind];
    if (!anim || anim.mode !== mode) return 1;
    if (prefersReducedMotion()) return 1;
    const duration =
      mode === 'scatter' ? pointCount * SCATTER_STEP_MS : FIT_DURATION_MS;
    if (duration <= 0) return 1;
    return Math.min(1, (now - anim.start) / duration);
  }

  function startAnim(
    kind: GraphKind,
    mode: PlotAnim['mode'],
    state: TickerTapeState
  ): void {
    anims[kind] = { mode, start: performance.now(), state };
    animState = state;
    startAnimLoop();
  }

  function anyAnimActive(now: number): boolean {
    return (['x', 'v'] as const).some((kind) => {
      const anim = anims[kind];
      if (!anim) return false;
      const points = anim.mode === 'scatter' ? 7 : 1;
      return animProgress(kind, anim.mode, points, now) < 1;
    });
  }

  function startAnimLoop(): void {
    if (animFrame != null) return;
    if (typeof requestAnimationFrame !== 'function') return;
    const tick = () => {
      animFrame = null;
      const now = performance.now();
      if (!anyAnimActive(now)) return;
      if (animState) paintGraphs(animState);
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
  }

  let animState: TickerTapeState | null = null;

  function copySeries(
    values: ReadonlyArray<number | null>
  ): Array<number | null> {
    return values.map((v) => v);
  }

  function seriesEqual(
    a: ReadonlyArray<number | null> | null,
    b: ReadonlyArray<number | null>
  ): boolean {
    if (!a || a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  function plotStatus(state: TickerTapeState): {
    x: { plotted: boolean; fitted: boolean; canFit: boolean };
    v: { plotted: boolean; fitted: boolean; canFit: boolean };
    /** 兼容字段：v–t 已拟合且数据未变（aFit 判分依据）。 */
    hasFit: boolean;
    /** 任一图已描点（工具条状态）。 */
    hasScatter: boolean;
    /** 数据校对完成，允许描点。 */
    canScatter: boolean;
    dirty: boolean;
    canFit: boolean;
  } {
    const dirty =
      (plotted.x &&
        plottedXCm !== null &&
        !seriesEqual(plottedXCm, state.measuredXCm)) ||
      (plotted.v && plottedVMs !== null && !seriesEqual(plottedVMs, state.vMs));
    const xPts = plottedXCm ? toPoints(plottedXCm, state.T, 0.01) : [];
    const vPts = plottedVMs ? toPoints(plottedVMs, state.T, 1) : [];
    const series = (kind: GraphKind, pointCount: number) => ({
      plotted: plotted[kind],
      fitted: fitted[kind] && plotted[kind] && !dirty,
      canFit:
        plotted[kind] && !dirty
          ? kind === 'x'
            ? pointCount >= 3
            : pointCount >= 2
          : false
    });
    const x = series('x', xPts.length);
    const v = series('v', vPts.length);
    const open = pointsOpen();
    return {
      x,
      v,
      hasFit: v.fitted,
      hasScatter: plotted.x || plotted.v,
      dirty,
      canScatter: open,
      canFit: open && (x.canFit || v.canFit)
    };
  }

  function paintGraphs(state: TickerTapeState): void {
    drawGraphs({
      graphStage,
      state,
      theme: env.theme,
      contentScale: env.contentScale(),
      pointsOpen: pointsOpen(),
      selected,
      plotted,
      plottedXCm,
      plottedVMs,
      status: plotStatus(state),
      animProgress,
      layoutRetries: graphLayoutRetries,
      onLayoutRetry: paintGraphs
    });
  }

  function paintTape(state: TickerTapeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const hit = drawTape({
      ctx,
      canvas,
      width: stage.cssWidth,
      height: stage.cssHeight,
      responsiveScale: stage.responsiveScale,
      contentScale: env.contentScale(),
      theme: env.theme,
      state
    });
    if (hit) tapeHit = hit;
  }

  function canvasLocalX(e: PointerEvent): number | null {
    const el = stage.canvas;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return e.clientX - rect.left;
  }

  function canvasLocalY(e: PointerEvent): number | null {
    const el = stage.canvas;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return e.clientY - rect.top;
  }

  function hitOrigin(px: number, py: number): boolean {
    if (!tapeHit) return false;
    const onOriginLine =
      Math.abs(px - tapeHit.originPx) <= tapeHit.hitR &&
      py >= tapeHit.tapeTop &&
      py <= tapeHit.tapeBottom;
    const onRuler =
      px >= tapeHit.rulerLeft &&
      px <= tapeHit.rulerRight &&
      py >= tapeHit.rulerTop &&
      py <= tapeHit.tapeBottom;
    return onOriginLine || onRuler;
  }

  function updateCursor(px: number, py: number): void {
    const el = stage.canvas;
    if (!el) return;
    if (draggingOrigin) {
      el.style.cursor = 'grabbing';
      return;
    }
    hoverOrigin = hitOrigin(px, py);
    el.style.cursor = hoverOrigin ? 'grab' : 'default';
  }

  function handlePointerDown(e: PointerEvent): void {
    const px = canvasLocalX(e);
    const py = canvasLocalY(e);
    if (px === null || py === null || !tapeHit) return;
    if (!hitOrigin(px, py)) return;
    draggingOrigin = true;
    grabOffsetPx = px - tapeHit.originPx;
    stage.canvas?.setPointerCapture(e.pointerId);
    updateCursor(px, py);
    onOriginDrag?.(tapeHit.nearestTick(px - grabOffsetPx));
  }

  function handlePointerMove(e: PointerEvent): void {
    const px = canvasLocalX(e);
    const py = canvasLocalY(e);
    if (px === null || py === null) return;
    updateCursor(px, py);
    if (!draggingOrigin || !tapeHit) return;
    onOriginDrag?.(tapeHit.nearestTick(px - grabOffsetPx));
  }

  function handlePointerUp(e: PointerEvent): void {
    draggingOrigin = false;
    grabOffsetPx = 0;
    const px = canvasLocalX(e);
    const py = canvasLocalY(e);
    if (px !== null && py !== null) updateCursor(px, py);
  }

  function attachEvents(): void {
    const el = stage.canvas;
    if (!el) return;
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
  }

  function observeGraphHost(canvas: HTMLCanvasElement): void {
    const host = canvas.parentElement;
    if (host === graphResizeObservedHost) return;
    graphResizeObserver?.disconnect();
    graphResizeObserver = null;
    graphResizeObservedHost = host;
    if (host && typeof ResizeObserver !== 'undefined') {
      graphResizeObserver = new ResizeObserver(() => {
        if (!lastGraphState) return;
        graphStage.resize();
        paintGraphs(lastGraphState);
      });
      graphResizeObserver.observe(host);
    }
  }

  function detachEvents(): void {
    const el = stage.canvas;
    if (!el) return;
    el.removeEventListener('pointerdown', handlePointerDown);
    el.removeEventListener('pointermove', handlePointerMove);
    el.removeEventListener('pointerup', handlePointerUp);
    el.removeEventListener('pointercancel', handlePointerUp);
  }

  function render(state: TickerTapeState): void {
    lastGraphState = state;
    if (stage.canvas) {
      stage.canvas.dataset.originTickIndex = String(state.originTickIndex);
    }
    stage.ensureSized();
    paintTape(state);
    if (stage.canvas && tapeHit) {
      // e2e 拖尺/纸带静止断言用的几何快照（CSS px，画布局部坐标）
      stage.canvas.dataset.originPx = tapeHit.originPx.toFixed(1);
      stage.canvas.dataset.rulerMidY = (
        (tapeHit.rulerTop + tapeHit.tapeBottom) /
        2
      ).toFixed(1);
      stage.canvas.dataset.tapeBandY = tapeHit.tapeBandY.toFixed(1);
      stage.canvas.dataset.tapeBandH = tapeHit.tapeBandH.toFixed(1);
    }
    if (graphStage.canvas) paintGraphs(state);
  }

  stage.resize();
  attachEvents();

  return {
    render,
    resize: () => {
      stage.resize();
      if (graphStage.canvas) {
        observeGraphHost(graphStage.canvas);
        graphStage.resize();
        if (lastGraphState) paintGraphs(lastGraphState);
      }
    },
    reset(): void {
      plottedXCm = null;
      plottedVMs = null;
      plotted.x = false;
      plotted.v = false;
      fitted.x = false;
      fitted.v = false;
      delete anims.x;
      delete anims.v;
    },
    plotScatter(state: TickerTapeState): void {
      if (!pointsOpen()) return;
      const kinds = selectedKinds();
      if (kinds.length === 0) return;
      if (kinds.includes('x')) {
        plottedXCm = copySeries(state.measuredXCm);
        plotted.x = true;
        fitted.x = false;
        startAnim('x', 'scatter', state);
      }
      if (kinds.includes('v')) {
        plottedVMs = copySeries(state.vMs);
        plotted.v = true;
        fitted.v = false;
        startAnim('v', 'scatter', state);
      }
    },
    plotFit(state: TickerTapeState): boolean {
      if (!pointsOpen()) return false;
      const status = plotStatus(state);
      const kinds = selectedKinds().filter((kind) => status[kind].canFit);
      if (kinds.length === 0) return false;
      for (const kind of kinds) {
        fitted[kind] = true;
        startAnim(kind, 'fit', state);
      }
      return true;
    },
    setSelectedGraphs(kinds: readonly GraphKind[]): void {
      selected.x = kinds.includes('x');
      selected.v = kinds.includes('v');
    },
    getSelectedGraphs: (): Array<'x' | 'v'> =>
      (['x', 'v'] as const).filter((kind) => selected[kind]),
    getPlotStatus(state: TickerTapeState) {
      return plotStatus(state);
    },
    setPlotGateReader(reader: () => boolean): void {
      readPointsOpen = reader;
    },
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      env.setMode(m, h);
    },
    attachGraphCanvas(graphCanvas: HTMLCanvasElement): void {
      graphStage.attach(graphCanvas);
      graphResizeObservedHost = null;
      observeGraphHost(graphCanvas);
    },
    setOnOriginDrag(cb: (tickIndex: number) => void): void {
      onOriginDrag = cb;
    },
    dispose(): void {
      detachEvents();
      stage.release();
      graphStage.release();
      graphResizeObserver?.disconnect();
      graphResizeObserver = null;
      graphResizeObservedHost = null;
      lastGraphState = null;
    }
  };
}

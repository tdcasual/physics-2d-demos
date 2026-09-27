import {
  getResponsiveScale,
  readElementLayoutSize,
  scaledSize,
  setCanvasSize
} from '../../core/canvas-sizing';
import { getThemeColors } from '../../core/colors';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { STAGE_FRAME_ATTR } from '../../platform/stage-chrome';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  clampOriginTickIndex,
  fitLineDroppingOutliers,
  fitQuadratic,
  RULER_RANGE_CM,
  type TickerTapeState
} from './scene.sim';

/** 纸带第一个打点左侧的小前置量（cm），纸带左端不贴画布内边。 */
const TAPE_LEAD_CM = 0.5;
/** 窄于该宽度时两图改为单列。 */
const GRAPH_STACK_BELOW = 560;
/** 中等宽度（含 880）下，可见高度矮于该值则单列滚动。 */
const GRAPH_STACK_SHORT = 320;
/**
 * 可用宽屏（1280 课堂档的绘图区约在此之上）。宽度够时并排，
 * 直到行高矮到刻度放不下。
 */
const GRAPH_WIDE_MIN = 960;
const GRAPH_WIDE_SHORT = 168;
const GRAPH_GAP_PX = 8;
const TICK_CHAR_EM = 0.62;

type GraphBox = { x: number; y: number; w: number; h: number };
type GraphTypePx = { title: number; tick: number; axis: number };

export type GraphPanelLayout = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  stacked: boolean;
  boxes: GraphBox[];
};

function readCanvasTypeBase(
  canvas: HTMLCanvasElement,
  name: string,
  fallback: number
): number {
  if (typeof getComputedStyle !== 'function') return fallback;
  const raw = getComputedStyle(canvas).getPropertyValue(name).trim();
  const value = Number(raw.replace(/px$/, ''));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Classroom targets live on --dw-canvas-*. Viewport tiers already set the floor. */
function graphTypePx(canvas: HTMLCanvasElement): GraphTypePx {
  return {
    title: readCanvasTypeBase(canvas, '--dw-canvas-title', 18),
    tick: readCanvasTypeBase(canvas, '--dw-canvas-tick', 16),
    axis: readCanvasTypeBase(canvas, '--dw-canvas-axis', 16)
  };
}

function graphsShouldStack(
  availW: number,
  visibleH: number,
  count: number
): boolean {
  if (count <= 1) return false;
  if (availW < GRAPH_STACK_BELOW) return true;
  // A short but wide host (844×390) must keep both curves inside the
  // visible canvas. Stacking here builds 160px rows and leaves only the
  // title above the fold.
  if (visibleH < 150) return false;
  if (availW >= GRAPH_WIDE_MIN) return visibleH < GRAPH_WIDE_SHORT;
  return visibleH < GRAPH_STACK_SHORT;
}

export function formatGraphTick(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 10 - 1e-9) return String(Math.round(value));
  const text = value.toFixed(2).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}

export function estimateTickLabelWidth(text: string, fontPx: number): number {
  const font = Math.max(1, fontPx);
  return Math.max(font * 0.9, text.length * font * TICK_CHAR_EM);
}

/** Center of the rotated y-axis title, in CSS px from the panel's left edge. */
export function graphAxisAnchor(axisPx: number): number {
  return Math.max(axisPx * 0.7, 10);
}

/**
 * Plot insets that keep the title, y ticks, rotated axis title, and x ticks
 * inside the panel at classroom sizes. Left is capped at 48% of the box so a
 * narrow panel still has a plot.
 */
export function graphPlotInsets(
  box: { w: number; h: number },
  typePx: GraphTypePx,
  tMax: number,
  yMax: number,
  tickLen: number
): { left: number; top: number; right: number; bottom: number } {
  const widestY = Math.max(
    estimateTickLabelWidth(formatGraphTick(0), typePx.tick),
    estimateTickLabelWidth(formatGraphTick(yMax), typePx.tick)
  );
  const axisBand = Math.ceil(typePx.axis * 1.35);
  const left = Math.min(
    box.w * 0.48,
    Math.max(36, widestY + tickLen + axisBand + 10)
  );
  let top = 6 + typePx.title + 6;
  const right = Math.max(
    12,
    Math.round(typePx.tick * 0.7),
    Math.ceil(
      estimateTickLabelWidth(formatGraphTick(tMax), typePx.tick) / 2 + 6
    )
  );
  let bottom = Math.max(
    typePx.tick + tickLen + 8,
    Math.round(typePx.tick * 1.25)
  );
  // A short landscape box otherwise spends its height on the title and
  // tick chrome, so the curve sits below the visible strip.
  if (box.h < 160 && box.h - top - bottom < box.h * 0.42) {
    const budget = box.h * 0.5;
    const chrome = Math.max(1, top + bottom);
    const scale = Math.min(1, budget / chrome);
    top = Math.max(2, top * scale);
    bottom = Math.max(2, bottom * scale);
  }
  return { left, top, right, bottom };
}

function niceStepAtLeast(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * mag;
}

function nextNiceStep(step: number): number {
  const mag = 10 ** Math.floor(Math.log10(step * (1 + 1e-9)));
  const unit = step / mag;
  if (unit < 1.5) return 2 * mag;
  if (unit < 3.5) return 5 * mag;
  if (unit < 7.5) return 10 * mag;
  return 20 * mag;
}

/**
 * Nice ticks whose labels fit `spanPx`. Horizontal pitch uses the formatted
 * label width; vertical pitch uses the line box. The step only grows, so a
 * wide axis cannot fall back to a 0.02 grid that collides at classroom sizes.
 */
export function axisTicksForSpan(
  max: number,
  spanPx: number,
  fontPx: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0];
  const span = Math.max(1, spanPx);
  const font = Math.max(8, fontPx);
  const minPitch = (step: number) => {
    if (orientation === 'vertical') return font * 1.45;
    const widest = Math.max(
      estimateTickLabelWidth(formatGraphTick(0), font),
      estimateTickLabelWidth(formatGraphTick(step), font),
      estimateTickLabelWidth(formatGraphTick(Math.min(max, step * 2)), font),
      estimateTickLabelWidth(formatGraphTick(max), font)
    );
    return widest + Math.max(4, font * 0.35);
  };
  const seed = Math.max(2, Math.floor(span / Math.max(font * 2.2, 28)));
  let step = niceStepAtLeast(max / seed);
  for (let guard = 0; guard < 8; guard += 1) {
    const intervals = Math.max(1, max / step);
    if (span / intervals >= minPitch(step)) break;
    const next = nextNiceStep(step);
    if (!(next > step)) break;
    step = next;
  }
  const ticks: number[] = [];
  const last = Math.ceil(max / step - 1e-9) * step;
  const limit = last + step * 0.25;
  for (let i = 0; i < 64; i += 1) {
    const value = Math.round(i * step * 1e6) / 1e6;
    if (value > limit + 1e-9) break;
    ticks.push(value);
  }
  return ticks.length > 0 ? ticks : [0];
}

/**
 * Selected graphs fill the chart panel. One graph uses the whole plot.
 * Two graphs sit side by side and share the visible height on a usable
 * widescreen, including a moderately short 1280×720 chart row. A narrow
 * panel, or a mid-width panel shorter than 320px, stacks and scrolls.
 * x–t / v–t are not forced into squares.
 */
export function layoutGraphPanels(
  availW: number,
  visibleH: number,
  count: number
): GraphPanelLayout | null {
  if (count <= 0 || !(availW >= 8) || !(visibleH >= 8)) return null;
  const gap = GRAPH_GAP_PX;
  const stack = graphsShouldStack(availW, visibleH, count);
  const cols = stack ? 1 : Math.min(count, 2);
  const rows = Math.ceil(count / cols);
  const boxW = (availW - gap * (cols + 1)) / cols;
  const fittedH = (visibleH - gap * (rows + 1)) / rows;
  let boxH = fittedH;
  if (stack && visibleH >= 150) {
    const readable = Math.min(280, Math.max(160, boxW * 0.62));
    boxH = Math.max(fittedH, readable);
  }
  if (!(boxW > 1) || !(boxH > 1)) return null;
  const contentH = gap + rows * (boxH + gap);
  const height = stack ? Math.max(visibleH, contentH) : visibleH;
  const boxes = Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: gap + col * (boxW + gap),
      y: gap + row * (boxH + gap),
      w: boxW,
      h: boxH
    };
  });
  return { width: availW, height, cols, rows, stacked: stack, boxes };
}

function measureGraphViewport(canvas: HTMLCanvasElement): {
  availW: number;
  visibleH: number;
} | null {
  const slot = canvas.parentElement;
  if (!slot) return null;
  const slotSize = readElementLayoutSize(slot);
  // clientWidth already excludes a scrollbar gutter. Measuring the offset
  // box paints a canvas wider than the host, which adds a scrollbar and
  // clips the axis labels.
  const availW = slot.clientWidth > 0 ? slot.clientWidth : slotSize.width;
  if (!(availW >= 8)) return null;
  const host = canvas.closest('.data-workspace-chart');
  const toolbar = host?.querySelector('.lab-plot-toolbar');
  const toolbarH = toolbar instanceof HTMLElement ? toolbar.offsetHeight : 0;
  let visibleH = slot.clientHeight > 0 ? slot.clientHeight : slotSize.height;
  if (host instanceof HTMLElement && host.clientHeight > 0) {
    const style = getComputedStyle(host);
    const pad =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0);
    const available = host.clientHeight - pad - toolbarH;
    // A dragged split can leave a little less than the old 160px floor.
    // Fit the plot when the host can still show the axes; only a truly
    // short host grows a scrollable canvas.
    visibleH = available >= 96 ? available : Math.max(120, available);
  }
  if (!(visibleH >= 8)) return null;
  return { availW, visibleH };
}

export type CreateTickerTapeViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

function palette(theme: TeachingTheme) {
  const c = getThemeColors(theme);
  const dark = theme === 'dark';
  return {
    bg: c.background,
    text: c.text,
    muted: dark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.9)',
    tape: dark ? '#334155' : '#f8fafc',
    tapeEdge: dark ? '#94a3b8' : '#64748b',
    tick: dark ? '#cbd5e1' : '#334155',
    count: dark ? '#fbbf24' : '#b45309',
    ruler: dark ? '#1e293b' : '#fde68a',
    rulerAlt: dark ? 'rgba(51,65,85,0.55)' : 'rgba(253,230,138,0.55)',
    rulerEdge: dark ? '#cbd5e1' : '#92400e',
    scatter: dark ? '#38bdf8' : '#0369a1',
    outlier: dark ? '#fbbf24' : '#c2410c',
    fit: dark ? '#f87171' : '#b91c1c',
    grid: dark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.28)'
  };
}

/**
 * 数据步里给纸带让出浮动工具条。
 * 贴顶的条（桌面）从它下沿留白，下沿约 82px 时下限仍是 88。
 * 窄屏工具条在舞台中部：下方够放尺就排在它下面，否则留在上方空带。
 */
const TAPE_SCALE_FLOOR = 240;
const TAPE_SCALE_CEIL = 320;

/** Height the data-step stage used before the half split, for glyph size. */
export function tapeScaleCap(
  viewportWidth: number,
  viewportHeight: number
): number {
  if (viewportWidth <= 720) return viewportHeight * 0.4 - 8;
  const fromViewport = viewportHeight * 0.28;
  return Math.min(TAPE_SCALE_CEIL, Math.max(TAPE_SCALE_FLOOR, fromViewport));
}

function legacyTapeBox(canvas: HTMLCanvasElement, cssBox: number): number {
  const root = canvas.closest('.layout-master');
  if (!(root instanceof HTMLElement)) return cssBox;
  if (!root.classList.contains('is-data-workspace')) return cssBox;
  if (root.classList.contains('is-data-workspace-chart')) return cssBox;
  if (typeof window === 'undefined' || window.innerHeight < 640) return cssBox;
  return Math.min(cssBox, tapeScaleCap(window.innerWidth, window.innerHeight));
}

/** Transport bar inside the stage frame. The mobile control bar is not one. */
export function findWorkspaceTransportBar(
  canvas: HTMLCanvasElement
): HTMLElement | null {
  const frame = canvas.closest(`[${STAGE_FRAME_ATTR}]`);
  const bar = frame?.querySelector('.stage-floating-controls');
  if (!(bar instanceof HTMLElement) || bar.offsetHeight < 1) return null;
  return bar;
}

function workspaceTapeBand(
  canvas: HTMLCanvasElement,
  height: number
): { chromeFloor: number; bottom: number } {
  if (!canvas.closest('.is-data-workspace')) {
    return { chromeFloor: 48, bottom: height };
  }
  const bar = findWorkspaceTransportBar(canvas);
  if (!bar) {
    return { chromeFloor: 88, bottom: height };
  }
  const barTop = bar.offsetTop;
  const barBottom = barTop + bar.offsetHeight;
  if (barTop <= 36) {
    return { chromeFloor: Math.max(88, barBottom + 6), bottom: height };
  }
  // 窄屏工具条在舞台中部。下方放得下尺就排在它下面，否则留在上方空带。
  if (height - (barBottom + 6) >= 88) {
    return { chromeFloor: barBottom + 6, bottom: height };
  }
  return { chromeFloor: 8, bottom: Math.max(48, barTop - 4) };
}

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
  type TapeHit = {
    originPx: number;
    tapeTop: number;
    tapeBottom: number;
    rulerTop: number;
    hitR: number;
    rulerLeft: number;
    rulerRight: number;
    tapeBandY: number;
    tapeBandH: number;
    nearestTick: (px: number) => number;
  };
  let tapeHit: TapeHit | null = null;
  let plottedXCm: Array<number | null> | null = null;
  let plottedVMs: Array<number | null> | null = null;
  /** 每张图独立的描点/拟合状态：x–t 与 v–t 可分别描点、拟合。 */
  type GraphKind = 'x' | 'v';
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
  let graphLayoutRetries = 0;
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
      if (animState) drawGraphs(animState);
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

  function toPoints(
    values: ReadonlyArray<number | null>,
    periodS: number,
    yScale: number
  ): Array<{ t: number; y: number }> {
    return values
      .map((y, i) => (y === null ? null : { t: i * periodS, y: y * yScale }))
      .filter((p): p is { t: number; y: number } => p !== null);
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

  function roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function drawTape(state: TickerTapeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const w = stage.cssWidth;
    const h = stage.cssHeight;
    if (w <= 0 || h <= 0) return;
    const boxH = legacyTapeBox(canvas, h);
    const scale =
      (boxH === h ? stage.responsiveScale : getResponsiveScale(w, boxH)) *
      env.contentScale();
    const tokens = getRenderTokens(scale);
    const colors = palette(env.theme);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    const pad = scaledSize(16, scale, 8);
    const gap = scaledSize(8, scale, 5);
    const topReserve = scaledSize(20, scale, 12);
    const captionGap = scaledSize(18, scale, 12);
    const band = workspaceTapeBand(canvas, boxH);
    const chromeTop = scaledSize(52, scale, band.chromeFloor);
    const minTapeH = tokens.pointRadiusPx * 1.45;
    const minRulerH = tokens.pointRadiusPx * 4.2;
    const capPx = scaledSize(28, scale, 20);
    const endPadPx = scaledSize(14, scale, 10);
    const originDot = state.timingDots[state.originTickIndex];
    const firstDot = state.timingDots[0];
    if (!originDot || !firstDot) return;
    // 窗口锚定纸带：纸带在屏幕上静止，拖尺时尺沿纸带滑动，
    // 尺零刻度吸附在所选计数点（O）上。
    const minXCm = firstDot.xCm - TAPE_LEAD_CM;
    const tapeInset = Math.max(scaledSize(12, scale, 8), capPx);
    const tapeLeft = pad + tapeInset;
    const tapeW = Math.max(scaledSize(24, scale, 16), w - pad - tapeLeft);
    // 纸带与尺共用同一厘米比例：学生把点垂直投影到尺上读数，
    // 读数必须等于纸带真值（cm）。可视窗口约 19 cm，桌面端 1 mm 数像素可估读。
    const tapeFitCm = 18.7;
    const cmToPx = tapeW / (tapeFitCm * 1.04);
    const rulerLengthCm = RULER_RANGE_CM;
    const xPx = (xCm: number) => tapeLeft + (xCm - minXCm) * cmToPx;
    const originPx = xPx(originDot.xCm);
    const rulerLeft = originPx - capPx;
    const rulerBodyW = rulerLengthCm * cmToPx;
    const rulerW = capPx + rulerBodyW + endPadPx;
    const rulerRight = rulerLeft + rulerW;
    const maxRelCm = rulerLengthCm;
    const rulerEndPx = originPx + rulerBodyW;
    // 15 cm 实尺：高度约为尺长的 1/8~1/10；纸带约为尺高的一半，
    // 明显更薄但点迹上下有喘息空间。不随舞台高度拉伸。
    const rulerAspect = 10;
    const naturalRulerH = Math.max(minRulerH, rulerBodyW / rulerAspect);
    const naturalTapeH = Math.max(minTapeH, naturalRulerH * 0.5);
    const chromeAndCaption = chromeTop + pad + topReserve + gap + captionGap;
    const availableBars = Math.max(
      minTapeH + minRulerH,
      band.bottom - chromeAndCaption
    );
    const naturalBars = naturalTapeH + naturalRulerH;
    const barFit =
      naturalBars > 0 ? Math.min(1, availableBars / naturalBars) : 1;
    const tapeH = naturalTapeH * barFit;
    const rulerH = naturalRulerH * barFit;
    const blockH = topReserve + tapeH + gap + rulerH + captionGap;
    const leftover = band.bottom - chromeTop - pad - blockH;
    const tapeY = chromeTop + topReserve + Math.max(0, leftover / 2);

    roundRectPath(ctx, tapeLeft, tapeY, tapeW, tapeH, scaledSize(4, scale, 2));
    ctx.fillStyle = colors.tape;
    ctx.strokeStyle = colors.tapeEdge;
    ctx.lineWidth = tokens.strokePx * 0.35;
    ctx.fill();
    ctx.stroke();

    if (originPx - tapeLeft > scaledSize(8, scale, 5)) {
      ctx.fillStyle =
        env.theme === 'dark'
          ? 'rgba(148,163,184,0.16)'
          : 'rgba(148,163,184,0.22)';
      ctx.fillRect(tapeLeft, tapeY, originPx - tapeLeft, tapeH);
    }

    const rulerY = tapeY + tapeH + gap;
    roundRectPath(
      ctx,
      rulerLeft,
      rulerY,
      rulerW,
      rulerH,
      scaledSize(3, scale, 2)
    );
    ctx.fillStyle = colors.ruler;
    ctx.strokeStyle = colors.rulerEdge;
    ctx.lineWidth = tokens.strokePx * 0.35;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.rulerEdge;
    ctx.fillRect(
      rulerLeft,
      rulerY,
      Math.max(2, tokens.strokePx * 0.55),
      rulerH
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(rulerLeft, rulerY, rulerW, rulerH);
    ctx.clip();
    const maxMm = Math.ceil(maxRelCm * 10);
    for (let cm = 0; cm * 10 <= maxMm; cm += 2) {
      const px0 = originPx + cm * cmToPx;
      const px1 = originPx + (cm + 1) * cmToPx;
      if (px1 < rulerLeft || px0 > rulerRight) continue;
      ctx.fillStyle = colors.rulerAlt;
      ctx.fillRect(px0, rulerY, px1 - px0, rulerH);
    }
    ctx.fillStyle = colors.rulerEdge;
    ctx.fillRect(
      rulerLeft,
      rulerY,
      rulerW,
      Math.max(1, tokens.strokePx * 0.45)
    );

    ctx.strokeStyle = colors.tick;
    ctx.fillStyle = colors.text;
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.34}px ui-sans-serif, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(1, tokens.strokePx * 0.12);
    for (let mm = 0; mm <= maxMm; mm++) {
      const px = originPx + (mm / 10) * cmToPx;
      if (px < originPx - 0.5 || px > rulerEndPx + 0.5) continue;
      const isCm = mm % 10 === 0;
      const isHalf = mm % 5 === 0;
      const tickFrac = isCm ? 0.46 : isHalf ? 0.32 : 0.18;
      ctx.beginPath();
      ctx.moveTo(px, rulerY);
      ctx.lineTo(px, rulerY + rulerH * tickFrac);
      ctx.stroke();
      if (isCm) {
        ctx.fillText(String(mm / 10), px, rulerY + rulerH * 0.72);
      }
    }
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.28}px ui-sans-serif, sans-serif`;
    ctx.fillStyle = colors.muted;
    ctx.fillText('cm', rulerLeft + capPx * 0.5, rulerY + rulerH * 0.55);
    ctx.restore();

    const visibleT = state.t;
    const countingSet = new Set(state.countingTickIndices);
    const highlightCounts = state.countEvery === 5;
    const dotY = tapeY + tapeH * 0.5;
    const sameR = tokens.pointRadiusPx * 0.22;
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, tapeLeft, tapeY, tapeW, tapeH, scaledSize(4, scale, 2));
    ctx.clip();
    for (let i = 0; i < state.timingDots.length; i++) {
      const dot = state.timingDots[i];
      if (dot.t > visibleT + 1e-9) continue;
      const px = xPx(dot.xCm);
      if (px < tapeLeft - 1 || px > tapeLeft + tapeW + 1) continue;
      const isCount = countingSet.has(i);
      const skipped = highlightCounts && !isCount;
      ctx.globalAlpha = skipped ? 0.28 : 1;
      ctx.fillStyle = highlightCounts && isCount ? colors.count : colors.tick;
      ctx.beginPath();
      ctx.arc(
        px,
        dotY,
        highlightCounts && isCount ? tokens.pointRadiusPx * 0.32 : sameR,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.strokeStyle = colors.count;
    ctx.lineWidth = tokens.strokePx * 0.25;
    ctx.beginPath();
    ctx.moveTo(originPx, tapeY - scaledSize(6, scale, 3));
    ctx.lineTo(originPx, rulerY + rulerH);
    ctx.stroke();

    ctx.fillStyle = colors.text;
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.42}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('O', originPx, tapeY - scaledSize(8, scale, 4));

    if (highlightCounts) {
      ctx.textBaseline = 'bottom';
      ctx.font = `${tokens.rightStage.secondaryFontPx * 0.34}px ui-sans-serif, sans-serif`;
      let lastLabelPx = Number.NEGATIVE_INFINITY;
      const minLabelGap = scaledSize(10, scale, 8);
      state.countingTickIndices.forEach((idx, n) => {
        const dot = state.timingDots[idx];
        if (dot.t > visibleT + 1e-9) return;
        const px = xPx(dot.xCm);
        const isLast = n === state.countingTickIndices.length - 1;
        if (n === 0) return;
        if (!isLast && px - lastLabelPx < minLabelGap) return;
        ctx.fillStyle = colors.count;
        ctx.fillText(String(n), px, tapeY - scaledSize(2, scale, 1));
        lastLabelPx = px;
      });
    }

    if (state.playing) {
      const current = state.timingDots.reduce((best, dot) =>
        Math.abs(dot.t - state.t) < Math.abs(best.t - state.t) ? dot : best
      );
      const px = xPx(current.xCm);
      ctx.fillStyle = colors.fit;
      ctx.beginPath();
      ctx.moveTo(px, tapeY - scaledSize(2, scale, 1));
      ctx.lineTo(
        px - scaledSize(5, scale, 3),
        tapeY - scaledSize(12, scale, 7)
      );
      ctx.lineTo(
        px + scaledSize(5, scale, 3),
        tapeY - scaledSize(12, scale, 7)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.muted;
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.34}px ui-sans-serif, sans-serif`;
    const captionY = rulerY + rulerH + scaledSize(16, scale, 10);
    ctx.fillText('拖动尺或 O 选择计时起点 · 最小分度 1 mm', pad, captionY);

    const hitR = scaledSize(36, scale, 28);
    tapeHit = {
      originPx,
      tapeTop: tapeY - scaledSize(36, scale, 24),
      tapeBottom: rulerY + rulerH,
      rulerTop: rulerY,
      hitR,
      rulerLeft,
      rulerRight,
      tapeBandY: tapeY,
      tapeBandH: tapeH,
      nearestTick: (px: number) => {
        let best = state.originTickIndex;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < state.timingDots.length; i++) {
          const dist = Math.abs(xPx(state.timingDots[i].xCm) - px);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        return clampOriginTickIndex(best, state.tapeKind);
      }
    };
  }

  function drawPanel(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; w: number; h: number },
    title: string,
    points: Array<{ t: number; y: number }>,
    yLabel: string,
    scale: number,
    colors: ReturnType<typeof palette>,
    fitKind: 'line' | 'quadratic',
    typePx: GraphTypePx,
    stage: {
      showPoints: boolean;
      showFit: boolean;
      pointProgress: number;
      fitProgress: number;
    }
  ): number {
    const tokens = getRenderTokens(scale);
    const titlePx = typePx.title;
    const tickPx = typePx.tick;
    const axisPx = typePx.axis;
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.strokeStyle = colors.tapeEdge;
    ctx.strokeRect(0.5, 0.5, Math.max(1, box.w - 1), Math.max(1, box.h - 1));
    ctx.fillStyle = colors.text;
    ctx.font = `700 ${titlePx}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, 8, 6);

    const tMax = Math.max(0.1, ...points.map((p) => p.t), 0.6);
    const yMax = Math.max(0.2, ...points.map((p) => p.y)) * 1.15;
    const tickLen = scaledSize(4, scale, 3);
    const insets = graphPlotInsets(box, typePx, tMax, yMax, tickLen);
    const plot = {
      l: insets.left,
      r: Math.max(insets.left + 8, box.w - insets.right),
      t: insets.top,
      b: Math.max(insets.top + 8, box.h - insets.bottom)
    };
    const pw = plot.r - plot.l;
    const ph = plot.b - plot.t;
    const xOf = (t: number) => plot.l + (t / tMax) * pw;
    const yOf = (y: number) => plot.b - (y / yMax) * ph;
    const tTicks = axisTicksForSpan(tMax, pw, tickPx, 'horizontal');
    const yTicks = axisTicksForSpan(yMax, ph, tickPx, 'vertical');

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = Math.max(1, tokens.strokePx * 0.16);
    ctx.beginPath();
    for (const t of tTicks) {
      if (t > tMax + 1e-9) continue;
      const px = xOf(t);
      ctx.moveTo(px, plot.t);
      ctx.lineTo(px, plot.b);
    }
    for (const y of yTicks) {
      if (y > yMax + 1e-9) continue;
      const py = yOf(y);
      ctx.moveTo(plot.l, py);
      ctx.lineTo(plot.r, py);
    }
    ctx.stroke();

    ctx.strokeStyle = colors.tapeEdge;
    ctx.lineWidth = Math.max(1.5, tokens.strokePx * 0.28);
    ctx.beginPath();
    ctx.moveTo(plot.l, plot.b);
    ctx.lineTo(plot.r, plot.b);
    ctx.moveTo(plot.l, plot.t);
    ctx.lineTo(plot.l, plot.b);
    ctx.stroke();

    ctx.strokeStyle = colors.tick;
    ctx.fillStyle = colors.muted;
    ctx.font = `700 ${tickPx}px ui-sans-serif, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(1, tokens.strokePx * 0.18);
    let tickClearance = pw;
    let previousRight = Number.NEGATIVE_INFINITY;
    let drawnLabels = 0;
    for (const t of tTicks) {
      if (t > tMax + 1e-9) continue;
      const px = xOf(t);
      const label = formatGraphTick(t);
      const half = estimateTickLabelWidth(label, tickPx) / 2;
      if (drawnLabels > 0) {
        tickClearance = Math.min(tickClearance, px - half - previousRight);
      }
      previousRight = px + half;
      drawnLabels += 1;
      ctx.beginPath();
      ctx.moveTo(px, plot.b);
      ctx.lineTo(px, plot.b + tickLen);
      ctx.stroke();
      ctx.fillText(label, px, plot.b + tickLen + 1);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const y of yTicks) {
      if (y > yMax + 1e-9) continue;
      const py = yOf(y);
      ctx.beginPath();
      ctx.moveTo(plot.l, py);
      ctx.lineTo(plot.l - tickLen, py);
      ctx.stroke();
      ctx.fillText(formatGraphTick(y), plot.l - tickLen - 2, py);
    }

    ctx.fillStyle = colors.muted;
    ctx.font = `700 ${axisPx}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('t / s', plot.r - 2, plot.b - scaledSize(3, scale, 2));
    ctx.save();
    ctx.translate(graphAxisAnchor(axisPx), (plot.t + plot.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    if (!stage.showPoints) {
      ctx.fillStyle = colors.muted;
      ctx.font = `700 ${tickPx}px ui-sans-serif, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        pointsOpen() ? '点击描点' : '数据校对完成后才能描点',
        (plot.l + plot.r) / 2,
        (plot.t + plot.b) / 2
      );
      ctx.restore();
      return tickClearance;
    }

    const outlierSet = new Set<number>();
    const fitProgress = Math.max(0, Math.min(1, stage.fitProgress));
    if (stage.showFit && fitKind === 'quadratic' && points.length >= 3) {
      const q = fitQuadratic(points);
      if (q) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.l, plot.t, pw, ph);
        ctx.clip();
        ctx.strokeStyle = colors.fit;
        ctx.lineWidth = tokens.strokePx * 0.7;
        ctx.beginPath();
        const steps = 24;
        const drawn = Math.max(1, Math.round(steps * fitProgress));
        for (let i = 0; i <= drawn; i++) {
          const t = (tMax * i) / steps;
          const y = q.a * t * t + q.b * t + q.c;
          if (i === 0) ctx.moveTo(xOf(t), yOf(y));
          else ctx.lineTo(xOf(t), yOf(y));
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (stage.showFit && fitKind === 'line' && points.length >= 2) {
      const { fit, outlierIndices } = fitLineDroppingOutliers(points);
      outlierIndices.forEach((i) => outlierSet.add(i));
      if (fit) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.l, plot.t, pw, ph);
        ctx.clip();
        ctx.strokeStyle = colors.fit;
        ctx.lineWidth = tokens.strokePx * 0.7;
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(fit.intercept));
        const endT = tMax * fitProgress;
        ctx.lineTo(xOf(endT), yOf(fit.intercept + fit.slope * endT));
        ctx.stroke();
        ctx.restore();
      }
    }

    // 描点动画：点按表格顺序逐个出现（progress 从 0 到 1）。
    const visible = Math.ceil(
      points.length * Math.max(0, Math.min(1, stage.pointProgress))
    );
    points.slice(0, visible).forEach((p, i) => {
      ctx.fillStyle = outlierSet.has(i) ? colors.outlier : colors.scatter;
      ctx.beginPath();
      ctx.arc(xOf(p.t), yOf(p.y), tokens.pointRadiusPx * 0.65, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return tickClearance;
  }

  function applyGraphCanvasSize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): void {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const currentW = Math.round(parseFloat(canvas.style.width) || 0);
    const currentH = Math.round(parseFloat(canvas.style.height) || 0);
    if (!graphStage.ctx || currentW !== w || currentH !== h) {
      graphStage.ctx = setCanvasSize(canvas, w, h);
    }
    const responsive = getResponsiveScale(w, h);
    canvas.dataset.responsiveScale = String(responsive);
    graphStage.cssWidth = w;
    graphStage.cssHeight = h;
    graphStage.responsiveScale = responsive;
    graphStage.dpr = canvas.width / w;
  }

  function drawGraphs(state: TickerTapeState): void {
    const canvas = graphStage.canvas;
    if (!canvas) return;
    const kinds = selectedKinds();
    const measured = kinds.length > 0 ? measureGraphViewport(canvas) : null;
    const layout = measured
      ? layoutGraphPanels(measured.availW, measured.visibleH, kinds.length)
      : null;
    if (!layout) {
      if (kinds.length > 0 && canvas.isConnected && graphLayoutRetries < 8) {
        graphLayoutRetries += 1;
        requestAnimationFrame(() => drawGraphs(state));
      }
      return;
    }
    graphLayoutRetries = 0;
    applyGraphCanvasSize(canvas, layout.width, layout.height);
    const ctx = graphStage.ctx;
    if (!ctx) return;
    const w = graphStage.cssWidth;
    const h = graphStage.cssHeight;
    if (w <= 0 || h <= 0) return;
    const scale = graphStage.responsiveScale * env.contentScale();
    const colors = palette(env.theme);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    const typePx = graphTypePx(canvas);
    const first = layout.boxes[0];
    canvas.dataset.graphCols = String(layout.cols);
    canvas.dataset.graphRows = String(layout.rows);
    canvas.dataset.graphCount = String(kinds.length);
    canvas.dataset.graphFill = layout.stacked ? 'stack' : 'fill';
    canvas.dataset.graphBoxW = first ? first.w.toFixed(1) : '0';
    canvas.dataset.graphBoxH = first ? first.h.toFixed(1) : '0';
    canvas.dataset.graphTitlePx = String(Math.round(typePx.title));
    canvas.dataset.graphTickPx = String(Math.round(typePx.tick));
    canvas.dataset.graphAxisPx = String(Math.round(typePx.axis));
    canvas.dataset.plotHint = pointsOpen()
      ? '点击描点'
      : '数据校对完成后才能描点';
    let tickClearance = Number.POSITIVE_INFINITY;
    const status = plotStatus(state);
    const now = performance.now();
    const defs: Array<{
      kind: GraphKind;
      title: string;
      points: Array<{ t: number; y: number }>;
      yLabel: string;
      fitKind: 'line' | 'quadratic';
      minPoints: number;
    }> = [
      {
        kind: 'x',
        title: 'x–t',
        points: plottedXCm ? toPoints(plottedXCm, state.T, 0.01) : [],
        yLabel: 'x / m',
        fitKind: 'quadratic',
        minPoints: 3
      },
      {
        kind: 'v',
        title: 'v–t',
        points: plottedVMs ? toPoints(plottedVMs, state.T, 1) : [],
        yLabel: 'v / (m/s)',
        fitKind: 'line',
        minPoints: 2
      }
    ];
    defs.forEach((def) => {
      if (!selected[def.kind]) return;
      const box = layout.boxes[kinds.indexOf(def.kind)];
      if (!box) return;
      const ser = status[def.kind];
      const pointProgress =
        ser.plotted && plotted[def.kind]
          ? animProgress(def.kind, 'scatter', def.points.length || 1, now)
          : 1;
      const fitProgress = ser.fitted
        ? animProgress(def.kind, 'fit', 1, now)
        : 1;
      const clearance = drawPanel(
        ctx,
        box,
        def.title,
        def.points,
        def.yLabel,
        scale,
        colors,
        def.fitKind,
        typePx,
        {
          showPoints: ser.plotted,
          showFit: ser.fitted && def.points.length >= def.minPoints,
          pointProgress,
          fitProgress
        }
      );
      if (Number.isFinite(clearance)) {
        tickClearance = Math.min(tickClearance, clearance);
      }
    });
    canvas.dataset.graphTickClearance = (
      Number.isFinite(tickClearance) ? tickClearance : 0
    ).toFixed(1);
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
        drawGraphs(lastGraphState);
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
    drawTape(state);
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
    if (graphStage.canvas) drawGraphs(state);
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
        if (lastGraphState) drawGraphs(lastGraphState);
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

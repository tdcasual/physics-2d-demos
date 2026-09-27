/**
 * Graph panel layout and axis-tick math.
 *
 * measureGraphViewport queries the data-workspace chart host DOM
 * (DATA_WORKSPACE_CHART_CLASS / LAB_PLOT_TOOLBAR_CLASS) so the canvas
 * size tracks the live toolbar and host padding. The rest of this
 * module is pure layout math.
 */
import { readElementLayoutSize } from '../../../core/canvas-sizing';

/** Host of the chart slot in the data-workspace panel. */
export const DATA_WORKSPACE_CHART_CLASS = 'data-workspace-chart';
/** Plot toolbar inside the chart host (height subtracted from visibleH). */
export const LAB_PLOT_TOOLBAR_CLASS = 'lab-plot-toolbar';

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
export type GraphTypePx = { title: number; tick: number; axis: number };

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
export function graphTypePx(canvas: HTMLCanvasElement): GraphTypePx {
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

export function measureGraphViewport(canvas: HTMLCanvasElement): {
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
  const host = canvas.closest(`.${DATA_WORKSPACE_CHART_CLASS}`);
  const toolbar = host?.querySelector(`.${LAB_PLOT_TOOLBAR_CLASS}`);
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

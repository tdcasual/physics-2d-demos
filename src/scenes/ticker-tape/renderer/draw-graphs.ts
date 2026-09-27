import {
  getResponsiveScale,
  scaledSize,
  setCanvasSize
} from '../../../core/canvas-sizing';
import { getRenderTokens } from '../../../platform/standards';
import type { TeachingTheme } from '../../../platform/standards';
import {
  fitLineDroppingOutliers,
  fitQuadratic,
  type TickerTapeState
} from '../scene.sim';
import {
  axisTicksForSpan,
  estimateTickLabelWidth,
  formatGraphTick,
  graphAxisAnchor,
  graphPlotInsets,
  graphTypePx,
  layoutGraphPanels,
  measureGraphViewport,
  type GraphTypePx
} from './graph-layout';
import { palette, type TapePalette } from './tape-band';

export type GraphKind = 'x' | 'v';

export type GraphStageMut = {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  cssWidth: number;
  cssHeight: number;
  responsiveScale: number;
  dpr: number;
};

export type PlotAnimMode = 'scatter' | 'fit';

export type DrawPanelStage = {
  showPoints: boolean;
  showFit: boolean;
  pointProgress: number;
  fitProgress: number;
};

export type DrawGraphsArgs = {
  graphStage: GraphStageMut;
  state: TickerTapeState;
  theme: TeachingTheme;
  contentScale: number;
  pointsOpen: boolean;
  selected: Record<GraphKind, boolean>;
  plotted: Record<GraphKind, boolean>;
  plottedXCm: ReadonlyArray<number | null> | null;
  plottedVMs: ReadonlyArray<number | null> | null;
  status: {
    x: { plotted: boolean; fitted: boolean };
    v: { plotted: boolean; fitted: boolean };
  };
  animProgress: (
    kind: GraphKind,
    mode: PlotAnimMode,
    pointCount: number,
    now: number
  ) => number;
  layoutRetries: { count: number };
  onLayoutRetry: (state: TickerTapeState) => void;
};

export function toPoints(
  values: ReadonlyArray<number | null>,
  periodS: number,
  yScale: number
): Array<{ t: number; y: number }> {
  return values
    .map((y, i) => (y === null ? null : { t: i * periodS, y: y * yScale }))
    .filter((p): p is { t: number; y: number } => p !== null);
}

export function applyGraphCanvasSize(
  stage: GraphStageMut,
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): void {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const currentW = Math.round(parseFloat(canvas.style.width) || 0);
  const currentH = Math.round(parseFloat(canvas.style.height) || 0);
  if (!stage.ctx || currentW !== w || currentH !== h) {
    stage.ctx = setCanvasSize(canvas, w, h);
  }
  const responsive = getResponsiveScale(w, h);
  canvas.dataset.responsiveScale = String(responsive);
  stage.cssWidth = w;
  stage.cssHeight = h;
  stage.responsiveScale = responsive;
  stage.dpr = canvas.width / w;
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  title: string,
  points: Array<{ t: number; y: number }>,
  yLabel: string,
  scale: number,
  colors: TapePalette,
  fitKind: 'line' | 'quadratic',
  typePx: GraphTypePx,
  stage: DrawPanelStage,
  pointsOpen: boolean
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
      pointsOpen ? '点击描点' : '数据校对完成后才能描点',
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

export function drawGraphs(args: DrawGraphsArgs): void {
  const {
    graphStage,
    state,
    theme,
    contentScale,
    pointsOpen,
    selected,
    plotted,
    plottedXCm,
    plottedVMs,
    status,
    animProgress,
    layoutRetries,
    onLayoutRetry
  } = args;
  const canvas = graphStage.canvas;
  if (!canvas) return;
  const kinds = (['x', 'v'] as const).filter((k) => selected[k]);
  const measured = kinds.length > 0 ? measureGraphViewport(canvas) : null;
  const layout = measured
    ? layoutGraphPanels(measured.availW, measured.visibleH, kinds.length)
    : null;
  if (!layout) {
    if (kinds.length > 0 && canvas.isConnected && layoutRetries.count < 8) {
      layoutRetries.count += 1;
      requestAnimationFrame(() => onLayoutRetry(state));
    }
    return;
  }
  layoutRetries.count = 0;
  applyGraphCanvasSize(graphStage, canvas, layout.width, layout.height);
  const ctx = graphStage.ctx;
  if (!ctx) return;
  const w = graphStage.cssWidth;
  const h = graphStage.cssHeight;
  if (w <= 0 || h <= 0) return;
  const scale = graphStage.responsiveScale * contentScale;
  const colors = palette(theme);
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
  canvas.dataset.plotHint = pointsOpen ? '点击描点' : '数据校对完成后才能描点';
  let tickClearance = Number.POSITIVE_INFINITY;
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
    const fitProgress = ser.fitted ? animProgress(def.kind, 'fit', 1, now) : 1;
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
      },
      pointsOpen
    );
    if (Number.isFinite(clearance)) {
      tickClearance = Math.min(tickClearance, clearance);
    }
  });
  canvas.dataset.graphTickClearance = (
    Number.isFinite(tickClearance) ? tickClearance : 0
  ).toFixed(1);
}

import { scaledSize } from '../../core/canvas-sizing';
import { getThemeColors } from '../../core/colors';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  clampOriginTickIndex,
  fitLineDroppingOutliers,
  fitQuadratic,
  type TickerTapeState
} from './scene.sim';

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

export function createTickerTapeView(options: CreateTickerTapeViewOptions) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const rect = c.getBoundingClientRect();
      return {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      };
    }
  });
  const graphStage = createCanvasViewport({
    canvas: null,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const rect = c.getBoundingClientRect();
      return {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      };
    }
  });

  let onOriginDrag: ((tickIndex: number) => void) | null = null;
  let draggingOrigin = false;
  let hoverOrigin = false;
  type TapeHit = {
    originPx: number;
    tapeTop: number;
    tapeBottom: number;
    rulerTop: number;
    hitR: number;
    rulerLeft: number;
    rulerRight: number;
    nearestTick: (px: number) => number;
  };
  let tapeHit: TapeHit | null = null;
  let plottedXCm: Array<number | null> | null = null;
  let plottedVMs: Array<number | null> | null = null;
  let showFit = false;

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
    hasScatter: boolean;
    hasFit: boolean;
    dirty: boolean;
    canFit: boolean;
  } {
    const hasScatter = plottedXCm !== null && plottedVMs !== null;
    const dirty =
      hasScatter &&
      (!seriesEqual(plottedXCm, state.measuredXCm) ||
        !seriesEqual(plottedVMs, state.vMs));
    const xPts = plottedXCm ? toPoints(plottedXCm, state.T, 0.01) : [];
    const vPts = plottedVMs ? toPoints(plottedVMs, state.T, 1) : [];
    return {
      hasScatter,
      hasFit: showFit && hasScatter && !dirty,
      dirty,
      canFit: hasScatter && !dirty && (xPts.length >= 3 || vPts.length >= 2)
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
    const scale = stage.responsiveScale * env.contentScale();
    const tokens = getRenderTokens(scale);
    const colors = palette(env.theme);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    const pad = scaledSize(16, scale, 8);
    const tapeH = Math.max(tokens.pointRadiusPx * 1.45, h * 0.072);
    const rulerH = Math.max(tokens.pointRadiusPx * 4.2, h * 0.185);
    const gap = scaledSize(8, scale, 5);
    const tapeY = h * 0.3;
    const originDot = state.timingDots[state.originTickIndex];
    const firstDot = state.timingDots[0];
    const lastDot = state.timingDots[state.timingDots.length - 1];
    if (!originDot || !firstDot || !lastDot) return;
    const minXCm = firstDot.xCm;
    const tapeInset = Math.max(scaledSize(12, scale, 8), rulerH * 0.14);
    const tapeLeft = pad + tapeInset;
    const tapeW = Math.max(scaledSize(24, scale, 16), w - pad - tapeLeft);
    // 纸带按原画贴合：70 cm 铺满舞台，点迹密度与原画一致，不随尺放大。
    const tapeFitCm = 70;
    const tapeCmToPx = tapeW / (tapeFitCm * 1.04);
    // 尺单独放大：1 mm 像素 = 原画 1 mm 的 5 倍；量程 15 cm。
    const rulerMmPxGain = 5;
    const rulerLengthCm = 15;
    const rulerCmToPx = tapeCmToPx * rulerMmPxGain;
    const capPx = Math.max(scaledSize(28, scale, 20), rulerH * 0.42);
    const endPadPx = scaledSize(14, scale, 10);
    const xPx = (xCm: number) => tapeLeft + (xCm - minXCm) * tapeCmToPx;
    const originPx = xPx(originDot.xCm);
    const rulerLeft = originPx - capPx;
    const rulerBodyW = rulerLengthCm * rulerCmToPx;
    const rulerW = capPx + rulerBodyW + endPadPx;
    const rulerRight = rulerLeft + rulerW;
    const maxRelCm = rulerLengthCm;
    const rulerEndPx = originPx + rulerBodyW;

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
      const px0 = originPx + cm * rulerCmToPx;
      const px1 = originPx + (cm + 1) * rulerCmToPx;
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
      const px = originPx + (mm / 10) * rulerCmToPx;
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
        return clampOriginTickIndex(best);
      }
    };
  }

  function axisTicks(max: number, approxCount: number): number[] {
    if (!(max > 0)) return [0];
    const raw = max / Math.max(2, approxCount);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const residual = raw / mag;
    const step = residual >= 5 ? 5 * mag : residual >= 2 ? 2 * mag : mag;
    const ticks: number[] = [];
    const last = Math.ceil(max / step - 1e-9) * step;
    for (let v = 0; v <= last + step * 0.25; v += step) {
      ticks.push(v);
    }
    return ticks;
  }

  function formatTick(value: number): string {
    if (Math.abs(value) >= 10 - 1e-9) return String(Math.round(value));
    const text = value.toFixed(2).replace(/\.?0+$/, '');
    return text === '-0' ? '0' : text;
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
    stage: { showPoints: boolean; showFit: boolean }
  ): void {
    const tokens = getRenderTokens(scale);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.strokeStyle = colors.tapeEdge;
    ctx.strokeRect(0, 0, box.w, box.h);
    ctx.fillStyle = colors.text;
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.62}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(title, scaledSize(8, scale, 6), scaledSize(16, scale, 12));

    const plot = {
      l: scaledSize(44, scale, 28),
      r: box.w - scaledSize(16, scale, 10),
      t: scaledSize(24, scale, 16),
      b: box.h - scaledSize(28, scale, 18)
    };
    const pw = plot.r - plot.l;
    const ph = plot.b - plot.t;
    const tMax = Math.max(0.1, ...points.map((p) => p.t), 0.6);
    const yMax = Math.max(0.2, ...points.map((p) => p.y)) * 1.15;
    const xOf = (t: number) => plot.l + (t / tMax) * pw;
    const yOf = (y: number) => plot.b - (y / yMax) * ph;
    const tTicks = axisTicks(tMax, 5);
    const yTicks = axisTicks(yMax, 4);
    const tickLen = scaledSize(4, scale, 3);

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
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.42}px ui-sans-serif, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(1, tokens.strokePx * 0.18);
    for (const t of tTicks) {
      if (t > tMax + 1e-9) continue;
      const px = xOf(t);
      ctx.beginPath();
      ctx.moveTo(px, plot.b);
      ctx.lineTo(px, plot.b + tickLen);
      ctx.stroke();
      ctx.fillText(formatTick(t), px, plot.b + tickLen + 1);
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
      ctx.fillText(formatTick(y), plot.l - tickLen - 2, py);
    }

    ctx.fillStyle = colors.muted;
    ctx.font = `${tokens.rightStage.secondaryFontPx * 0.48}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('t / s', plot.r - 2, plot.b - scaledSize(3, scale, 2));
    ctx.save();
    ctx.translate(scaledSize(11, scale, 7), (plot.t + plot.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    if (!stage.showPoints) {
      ctx.fillStyle = colors.muted;
      ctx.font = `${tokens.rightStage.secondaryFontPx * 0.42}px ui-sans-serif, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '填完表后再描点',
        (plot.l + plot.r) / 2,
        (plot.t + plot.b) / 2
      );
      ctx.restore();
      return;
    }

    const outlierSet = new Set<number>();
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
        for (let i = 0; i <= steps; i++) {
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
        ctx.lineTo(xOf(tMax), yOf(fit.intercept + fit.slope * tMax));
        ctx.stroke();
        ctx.restore();
      }
    }

    points.forEach((p, i) => {
      ctx.fillStyle = outlierSet.has(i) ? colors.outlier : colors.scatter;
      ctx.beginPath();
      ctx.arc(xOf(p.t), yOf(p.y), tokens.pointRadiusPx * 0.65, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGraphs(state: TickerTapeState): void {
    const ctx = graphStage.ctx;
    if (!ctx) return;
    graphStage.ensureSized();
    const w = graphStage.cssWidth;
    const h = graphStage.cssHeight;
    if (w <= 0 || h <= 0) return;
    const scale = graphStage.responsiveScale * env.contentScale();
    const colors = palette(env.theme);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    const gap = scaledSize(10, scale, 6);
    const status = plotStatus(state);
    const xPts = plottedXCm ? toPoints(plottedXCm, state.T, 0.01) : [];
    const vPts = plottedVMs ? toPoints(plottedVMs, state.T, 1) : [];
    const stage = { showPoints: status.hasScatter, showFit: status.hasFit };
    const sideBySide = w >= h;
    const xBox = sideBySide
      ? { x: gap, y: gap, w: (w - gap * 3) / 2, h: h - gap * 2 }
      : { x: gap, y: gap, w: w - gap * 2, h: (h - gap * 3) / 2 };
    const vBox = sideBySide
      ? {
          x: gap * 2 + xBox.w,
          y: gap,
          w: xBox.w,
          h: xBox.h
        }
      : {
          x: gap,
          y: gap * 2 + xBox.h,
          w: xBox.w,
          h: xBox.h
        };
    drawPanel(
      ctx,
      xBox,
      'x–t',
      xPts,
      'x / m',
      scale,
      colors,
      'quadratic',
      stage
    );
    drawPanel(
      ctx,
      vBox,
      'v–t',
      vPts,
      'v / (m/s)',
      scale,
      colors,
      'line',
      stage
    );
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
    stage.canvas?.setPointerCapture(e.pointerId);
    updateCursor(px, py);
    onOriginDrag?.(tapeHit.nearestTick(px));
  }

  function handlePointerMove(e: PointerEvent): void {
    const px = canvasLocalX(e);
    const py = canvasLocalY(e);
    if (px === null || py === null) return;
    updateCursor(px, py);
    if (!draggingOrigin || !tapeHit) return;
    onOriginDrag?.(tapeHit.nearestTick(px));
  }

  function handlePointerUp(e: PointerEvent): void {
    draggingOrigin = false;
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

  function detachEvents(): void {
    const el = stage.canvas;
    if (!el) return;
    el.removeEventListener('pointerdown', handlePointerDown);
    el.removeEventListener('pointermove', handlePointerMove);
    el.removeEventListener('pointerup', handlePointerUp);
    el.removeEventListener('pointercancel', handlePointerUp);
  }

  function render(state: TickerTapeState): void {
    stage.ensureSized();
    drawTape(state);
    if (graphStage.canvas) drawGraphs(state);
  }

  stage.resize();
  attachEvents();

  return {
    render,
    resize: () => {
      stage.resize();
      if (graphStage.canvas) graphStage.resize();
    },
    reset(): void {
      plottedXCm = null;
      plottedVMs = null;
      showFit = false;
    },
    plotScatter(state: TickerTapeState): void {
      plottedXCm = copySeries(state.measuredXCm);
      plottedVMs = copySeries(state.vMs);
      showFit = false;
    },
    plotFit(state: TickerTapeState): boolean {
      const status = plotStatus(state);
      if (!status.canFit) return false;
      showFit = true;
      return true;
    },
    getPlotStatus(state: TickerTapeState) {
      return plotStatus(state);
    },
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      env.setMode(m, h);
    },
    attachGraphCanvas(graphCanvas: HTMLCanvasElement): void {
      graphStage.attach(graphCanvas);
    },
    setOnOriginDrag(cb: (tickIndex: number) => void): void {
      onOriginDrag = cb;
    },
    dispose(): void {
      detachEvents();
      stage.release();
      graphStage.release();
    }
  };
}

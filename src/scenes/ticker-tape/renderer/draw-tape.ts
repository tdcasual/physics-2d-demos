import { getResponsiveScale, scaledSize } from '../../../core/canvas-sizing';
import { getRenderTokens } from '../../../platform/standards';
import type { TeachingTheme } from '../../../platform/standards';
import {
  clampOriginTickIndex,
  RULER_RANGE_CM,
  type TickerTapeState
} from '../scene.sim';
import { legacyTapeBox, palette, workspaceTapeBand } from './tape-band';

/** 纸带第一个打点左侧的小前置量（cm），纸带左端不贴画布内边。 */
const TAPE_LEAD_CM = 0.5;

export type TapeHit = {
  originPx: number;
  tapeTop: number;
  tapeBottom: number;
  rulerTop: number;
  hitR: number;
  rulerLeft: number;
  rulerRight: number;
  tapeBandY: number;
  tapeBandH: number;
  /** 纸带与尺共用的比例（未缩放，CSS px / cm）。 */
  cmToPx: number;
  nearestTick: (px: number) => number;
};

export type DrawTapeInput = {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  responsiveScale: number;
  contentScale: number;
  theme: TeachingTheme;
  state: TickerTapeState;
};

export function roundRectPath(
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

/**
 * Draw the paper tape and ruler. Returns a hit-test snapshot for the
 * factory to store; early geometry failures return null and leave the
 * previous snapshot in place.
 */
export function drawTape(input: DrawTapeInput): TapeHit | null {
  const {
    ctx,
    canvas,
    width: w,
    height: h,
    responsiveScale,
    contentScale,
    theme,
    state
  } = input;
  if (w <= 0 || h <= 0) return null;
  const boxH = legacyTapeBox(canvas, h);
  const scale =
    (boxH === h ? responsiveScale : getResponsiveScale(w, boxH)) * contentScale;
  const tokens = getRenderTokens(scale);
  const colors = palette(theme);
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
  if (!originDot || !firstDot) return null;
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
  const barFit = naturalBars > 0 ? Math.min(1, availableBars / naturalBars) : 1;
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
      theme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)';
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
  ctx.fillRect(rulerLeft, rulerY, Math.max(2, tokens.strokePx * 0.55), rulerH);

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
  ctx.fillRect(rulerLeft, rulerY, rulerW, Math.max(1, tokens.strokePx * 0.45));

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
    ctx.lineTo(px - scaledSize(5, scale, 3), tapeY - scaledSize(12, scale, 7));
    ctx.lineTo(px + scaledSize(5, scale, 3), tapeY - scaledSize(12, scale, 7));
    ctx.closePath();
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = colors.muted;
  ctx.font = `${tokens.rightStage.secondaryFontPx * 0.34}px ui-sans-serif, sans-serif`;
  const captionY = rulerY + rulerH + scaledSize(16, scale, 10);
  ctx.fillText('拖动尺或 O 选择计时起点 · 最小分度 1 mm', pad, captionY);

  const hitR = scaledSize(36, scale, 28);
  return {
    originPx,
    tapeTop: tapeY - scaledSize(36, scale, 24),
    tapeBottom: rulerY + rulerH,
    rulerTop: rulerY,
    hitR,
    rulerLeft,
    rulerRight,
    tapeBandY: tapeY,
    tapeBandH: tapeH,
    cmToPx,
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

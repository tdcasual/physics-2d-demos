import { curveY, type VtIntegralSnapshot } from '../scene.sim';
import type { Box, DrawContext } from './types';
import {
  axisBottomReserve,
  axisTopReserve,
  drawAxis,
  measureXOverhang,
  measureYGutter
} from './draw-axis';
import { drawHeaderText, layoutBody, layoutHeader } from './layout';
import {
  vtPalette,
  fontPx,
  lineW,
  markR,
  FONT_FAMILY,
  resolveTypeScale
} from './palette';

export type Scene2Layout = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  toX: (x: number) => number;
  toY: (y: number) => number;
  hitR: number;
};

/** y 轴数据范围：曲线 y = A·sin(πx) ∈ [0, A]，下方留少许、上方留标签空间 */
const Y_LOW = -0.15;
const Y_HIGH = 1.3;

export function scene2LayoutFromPlot(
  plot: Box,
  scale: number,
  amplitude: number
): Scene2Layout {
  const { left, right, top, bottom } = plot;
  const axisW = right - left;
  const axisH = bottom - top;
  const yMin = amplitude * Y_LOW;
  const ySpan = amplitude * (Y_HIGH - Y_LOW) || 1;
  return {
    left,
    right,
    top,
    bottom,
    toX: (x: number) => left + x * axisW,
    toY: (y: number) => bottom - ((y - yMin) / ySpan) * axisH,
    hitR: Math.max(28, 36 * scale)
  };
}

/**
 * 子场景 2 · 化曲为直：两点 A、B 的弦长与轨迹长。
 * 把 A、B 拖近时，直线 AB 与曲线弧长趋于相同。
 *
 * 返回本帧布局，供视图层命中测试（拖拽 A/B）使用同一套坐标。
 */
export function drawScene2(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): Scene2Layout {
  const { ctx, width, responsiveScale, contentScale } = context;
  const { params } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;
  const amp = params.curveAmplitude;
  const yMin = amp * Y_LOW;
  const yMax = amp * Y_HIGH;

  const header = layoutHeader(context, {
    title: '化曲为直 · 拖动 A、B 比较直线与轨迹'
  });
  const type = resolveTypeScale(s, cs);
  const hintH = type.labelPx * 1.6;
  const plot = layoutBody(
    context,
    header.bottom,
    {
      left: measureYGutter(context, yMin, yMax),
      top: axisTopReserve(context),
      right: measureXOverhang(context, 1),
      bottom: axisBottomReserve(context) + hintH
    },
    { width: width * 0.35, height: header.legendPx * 6 }
  );
  const layout = scene2LayoutFromPlot(plot, s, amp);
  const { left, right, top, bottom, toX, toY } = layout;

  drawAxis(context, {
    x: left,
    y: bottom,
    width: right - left,
    height: bottom - top,
    xMin: 0,
    xMax: 1,
    yMin,
    yMax,
    xLabel: 'x',
    yLabel: 'y'
  });

  ctx.save();
  drawHeaderText(context, header, {
    title: P.text,
    legend: P.textSecondary,
    note: P.textMuted
  });

  const xA = params.pointA;
  const xB = params.pointB;
  const yA = curveY(xA, amp);
  const yB = curveY(xB, amp);
  const pA = { x: toX(xA), y: toY(yA) };
  const pB = { x: toX(xB), y: toY(yB) };
  const lo = Math.min(xA, xB);
  const hi = Math.max(xA, xB);

  ctx.shadowColor = P.curveSoft;
  ctx.shadowBlur = 6 * s;
  ctx.strokeStyle = P.curve;
  ctx.lineWidth = lineW(2.8, s, cs);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 300; i += 1) {
    const x = i / 300;
    const px = toX(x);
    const py = toY(curveY(x, amp));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = P.accent;
  ctx.lineWidth = lineW(3.2, s, cs);
  ctx.beginPath();
  const arcSteps = Math.max(12, Math.round(180 * (hi - lo)));
  for (let i = 0; i <= arcSteps; i += 1) {
    const x = lo + ((hi - lo) * i) / Math.max(1, arcSteps);
    const px = toX(x);
    const py = toY(curveY(x, amp));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.strokeStyle = P.approx;
  ctx.lineWidth = lineW(2.2, s, cs);
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.beginPath();
  ctx.moveTo(pA.x, pA.y);
  ctx.lineTo(pB.x, pB.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const drawPoint = (
    p: { x: number; y: number },
    label: string,
    fill: string
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, markR(6, s, cs), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.text;
    ctx.lineWidth = lineW(1.2, s, cs);
    ctx.stroke();
    ctx.fillStyle = P.text;
    ctx.font = `700 ${fontPx(13, s, cs)}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, p.x, p.y - markR(6, s, cs) - type.tickPx * 0.3);
  };
  drawPoint(pA, 'A', P.approx);
  drawPoint(pB, 'B', P.accent);

  ctx.fillStyle = P.textMuted;
  ctx.font = `${fontPx(11, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    '把 A、B 拖近，直线长与轨迹长趋于相等',
    left,
    bottom + axisBottomReserve(context) + hintH
  );

  ctx.restore();
  return layout;
}

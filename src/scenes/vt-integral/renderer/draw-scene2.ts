import { curveY, type VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';
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

export function scene2Layout(
  width: number,
  height: number,
  scale: number,
  amplitude: number
): Scene2Layout {
  const left = 72 * scale;
  const right = width - 44 * scale;
  const bottom = height * 0.74;
  const top = height * 0.17;
  const axisW = right - left;
  const axisH = bottom - top;
  const ySpan = amplitude * 2.4;
  return {
    left,
    right,
    top,
    bottom,
    toX: (x: number) => left + x * axisW,
    toY: (y: number) => bottom - ((y + amplitude * 1.2) / ySpan) * axisH,
    hitR: Math.max(28, 36 * scale)
  };
}

/**
 * 子场景 2 · 化曲为直：两点 A、B 的弦长与轨迹长。
 * 把 A、B 拖近时，直线 AB 与曲线弧长趋于相同。
 */
export function drawScene2(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, height, responsiveScale, contentScale } = context;
  const { params } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;
  const amp = params.curveAmplitude;
  const layout = scene2Layout(width, height, s, amp);
  const { left, right, top, bottom, toX, toY } = layout;

  drawAxis(context, {
    x: left,
    y: bottom,
    width: right - left,
    height: bottom - top,
    xMin: 0,
    xMax: 1,
    yMin: -amp * 1.2,
    yMax: amp * 1.2,
    xLabel: 'x',
    yLabel: 'y'
  });

  ctx.save();

  ctx.fillStyle = P.text;
  ctx.font = `600 ${fontPx(14, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    '化曲为直 · 拖动 A、B 比较直线与轨迹',
    left + 2 * s,
    top - 14 * s
  );

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
    ctx.fillText(label, p.x, p.y - 10 * s);
  };
  drawPoint(pA, 'A', P.approx);
  drawPoint(pB, 'B', P.accent);

  ctx.fillStyle = P.textMuted;
  ctx.font = `${fontPx(11, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const type = resolveTypeScale(s, cs);
  ctx.fillText(
    '把 A、B 拖近，直线长与轨迹长趋于相等',
    left + 2 * s,
    bottom + type.tickPx + type.labelPx + 10
  );

  ctx.restore();
}

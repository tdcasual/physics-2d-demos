import {
  rectHeight,
  vAt,
  type VtCurveKind,
  type VtIntegralSnapshot
} from '../scene.sim';
import { vtRuleLabel } from '../scene-values';
import type { DrawContext } from './types';
import {
  axisBottomReserve,
  axisTopReserve,
  drawAxis,
  measureXOverhang,
  measureYGutter
} from './draw-axis';
import { drawHeaderText, layoutBody, layoutHeader } from './layout';
import { vtPalette, lineW } from './palette';

const CURVE_SAMPLES = 200;

const CURVE_EXPR: Record<VtCurveKind, string> = {
  constant: 'v = 2 m/s',
  linear: 'v = 0.5t',
  quadratic: 'v = 0.1t²',
  sine: 'v = sin t'
};

/**
 * 子场景 1 · 以直代曲：v-t 图面积（黎曼和）
 *
 * 每小段按左端点（初速度）或右端点（末速度）当作匀速，矩形面积 vᵢ·Δt
 * 之和逼近位移。矩形高出曲线的部分（多算）与低于曲线的部分（少算）分色，
 * 左右端点切换时可直观看到「一小一大夹逼真值」。
 */
export function drawScene1(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, responsiveScale: s, contentScale: cs } = context;
  const { params } = snapshot;
  const P = vtPalette(context.theme);
  const kind = params.curveKind;
  const T = params.time;
  const vFn = (t: number) => vAt(kind, t);

  let vPeak = 0.2;
  let vFloor = 0;
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const v = vFn((i / CURVE_SAMPLES) * T);
    vPeak = Math.max(vPeak, v);
    vFloor = Math.min(vFloor, v);
  }
  const yMax = Math.max(0.4, vPeak) * 1.15;
  const yMin = Math.min(0, vFloor) * 1.15;

  const header = layoutHeader(context, {
    title: `v–t 面积 · ${vtRuleLabel(params.method)}矩形逼近位移`,
    legend: [
      { text: CURVE_EXPR[kind] },
      { text: '矩形 vᵢ·Δt' },
      { text: '多算' },
      { text: '少算' }
    ]
  });
  const plot = layoutBody(
    context,
    header.bottom,
    {
      left: measureYGutter(context, yMin, yMax),
      top: axisTopReserve(context),
      right: measureXOverhang(context, T),
      bottom: axisBottomReserve(context)
    },
    { width: width * 0.35, height: header.legendPx * 6 }
  );
  const axisW = plot.right - plot.left;
  const axisH = plot.bottom - plot.top;
  const toX = (t: number) => plot.left + (t / T) * axisW;
  const ySpan = yMax - yMin;
  const toY = (v: number) => plot.bottom - ((v - yMin) / ySpan) * axisH;
  const yAxis = toY(0);

  drawAxis(context, {
    x: plot.left,
    y: plot.bottom,
    width: axisW,
    height: axisH,
    xMin: 0,
    xMax: T,
    yMin,
    yMax,
    xLabel: 't / s',
    yLabel: 'v / (m·s⁻¹)'
  });

  ctx.save();

  // 真实面积（曲线下）淡填充
  ctx.fillStyle = P.curveFill;
  ctx.beginPath();
  ctx.moveTo(plot.left, yAxis);
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = (i / CURVE_SAMPLES) * T;
    ctx.lineTo(toX(t), toY(vFn(t)));
  }
  ctx.lineTo(toX(T), yAxis);
  ctx.closePath();
  ctx.fill();

  const n = params.rects;
  const dt = T / n;
  const heights: number[] = [];
  for (let i = 0; i < n; i += 1) {
    heights.push(rectHeight(kind, i * dt, (i + 1) * dt, params.method));
  }

  // 矩形主体
  ctx.fillStyle = P.approxFill;
  for (let i = 0; i < n; i += 1) {
    const x0 = toX(i * dt);
    const x1 = toX((i + 1) * dt);
    const yv = toY(heights[i]);
    ctx.fillRect(x0, Math.min(yAxis, yv), x1 - x0, Math.abs(yAxis - yv));
  }

  // 多算 / 少算误差块：矩形顶边与曲线之间
  const sub = Math.max(4, Math.ceil(CURVE_SAMPLES / n));
  const fillPiece = (i: number, over: boolean): void => {
    const t0 = i * dt;
    const rv = heights[i];
    ctx.beginPath();
    for (let k = 0; k <= sub; k += 1) {
      const t = t0 + (dt * k) / sub;
      const v = vFn(t);
      const yTop = toY(over ? rv : Math.max(v, rv));
      if (k === 0) ctx.moveTo(toX(t), yTop);
      else ctx.lineTo(toX(t), yTop);
    }
    for (let k = sub; k >= 0; k -= 1) {
      const t = t0 + (dt * k) / sub;
      const v = vFn(t);
      ctx.lineTo(toX(t), toY(over ? Math.min(v, rv) : rv));
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = P.overFill;
  for (let i = 0; i < n; i += 1) fillPiece(i, true);
  ctx.fillStyle = P.underFill;
  for (let i = 0; i < n; i += 1) fillPiece(i, false);

  // 矩形分隔线与顶边
  ctx.strokeStyle = P.approxSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < n; i += 1) {
    const x = toX(i * dt);
    ctx.moveTo(x, yAxis);
    ctx.lineTo(x, toY(heights[i]));
  }
  ctx.stroke();
  ctx.strokeStyle = P.approx;
  ctx.lineWidth = lineW(1.2, s, cs);
  ctx.beginPath();
  for (let i = 0; i < n; i += 1) {
    const yv = toY(heights[i]);
    ctx.moveTo(toX(i * dt), yv);
    ctx.lineTo(toX((i + 1) * dt), yv);
  }
  ctx.stroke();

  // 真实曲线（珊瑚，带柔光）
  ctx.shadowColor = P.curveSoft;
  ctx.shadowBlur = 6 * s;
  ctx.strokeStyle = P.curve;
  ctx.lineWidth = lineW(2.8, s, cs);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = (i / CURVE_SAMPLES) * T;
    if (i === 0) ctx.moveTo(toX(t), toY(vFn(t)));
    else ctx.lineTo(toX(t), toY(vFn(t)));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 标题 + 图例
  drawHeaderText(context, header, {
    title: P.text,
    legend: P.textSecondary,
    note: P.textMuted
  });
  const sw = header.swatchW;
  const sh = header.legendPx * 0.75;
  const [curveItem, rectItem, overItem, underItem] = header.legend;
  ctx.strokeStyle = P.curve;
  ctx.lineWidth = lineW(2.4, s, cs);
  ctx.beginPath();
  ctx.moveTo(curveItem.x, curveItem.y);
  ctx.lineTo(curveItem.x + sw, curveItem.y);
  ctx.stroke();
  const swatch = (
    item: { x: number; y: number },
    fill: string,
    stroke: string
  ): void => {
    ctx.fillStyle = fill;
    ctx.fillRect(item.x, item.y - sh / 2, sw, sh);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(item.x, item.y - sh / 2, sw, sh);
  };
  swatch(rectItem, P.approxFill, P.approx);
  swatch(overItem, P.overFill, P.over);
  swatch(underItem, P.underFill, P.under);

  ctx.restore();
}

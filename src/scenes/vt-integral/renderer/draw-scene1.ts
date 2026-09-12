import { vAt, type VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';
import { pathRoundRect } from '../../../core/draw-primitives';
import { vtPalette, fontPx, lineW, FONT_FAMILY } from './palette';

// 黎曼矩形渐变缓存：每个矩形的渐变仅依赖 (n, time, method, 画布几何, theme)，
// 命中缓存时复用，参数或尺寸变化时整体重建
let rectGradCache: { key: string; gradients: CanvasGradient[] } | null = null;

/**
 * 子场景 1 · 以直代曲：v-t 图面积（黎曼和）
 * 用 N 个矩形逼近速度曲线下的面积，N 越大越贴合（位移 = v-t 面积）。
 */
export function drawScene1(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, height, responsiveScale, contentScale } = context;
  const { params } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;

  const left = 72 * s;
  const right = width - 44 * s;
  const bottom = height * 0.76;
  const top = height * 0.17;
  const axisW = right - left;
  const axisH = bottom - top;

  const samples = 48;
  let vPeak = 0.2;
  let vFloor = 0;
  for (let i = 0; i <= samples; i += 1) {
    const v = vAt(params.curveKind, (i / samples) * params.time);
    vPeak = Math.max(vPeak, v);
    vFloor = Math.min(vFloor, v);
  }
  const yMax = Math.max(0.4, vPeak) * 1.15;
  const yMin = Math.min(0, vFloor) * 1.15;
  const vFn = (t: number) => vAt(params.curveKind, t);
  const toX = (t: number) => left + (t / params.time) * axisW;
  const ySpan = yMax - yMin;
  const toY = (v: number) => bottom - ((v - yMin) / ySpan) * axisH;
  const yAxis = toY(0);

  drawAxis(context, {
    x: left,
    y: bottom,
    width: axisW,
    height: axisH,
    xMin: 0,
    xMax: params.time,
    yMin,
    yMax,
    xLabel: 't / s',
    yLabel: 'v / (m·s⁻¹)'
  });

  ctx.save();

  // 场景标题
  ctx.fillStyle = P.text;
  ctx.font = `600 ${fontPx(14, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('v–t 面积 · 矩形逼近位移', left + 2 * s, top - 14 * s);

  // 真实面积（曲线下）渐变填充
  const fillGrad = ctx.createLinearGradient(0, top, 0, bottom);
  fillGrad.addColorStop(0, P.curveFill);
  fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.moveTo(left, yAxis);
  for (let i = 0; i <= 200; i += 1) {
    const t = (i / 200) * params.time;
    ctx.lineTo(toX(t), toY(vFn(t)));
  }
  ctx.lineTo(toX(params.time), yAxis);
  ctx.closePath();
  ctx.fill();

  // 黎曼矩形（薄荷渐变 + 顶边高亮）
  const n = params.rects;
  const dt = params.time / n;
  const slotW = axisW / n;
  const barW = slotW;

  const rectValue = (i: number): number => {
    const t0 = i * dt;
    const t1 = (i + 1) * dt;
    if (params.method === 'left') return vFn(t0);
    if (params.method === 'right') return vFn(t1);
    if (params.method === 'mid') return vFn((t0 + t1) * 0.5);
    return (vFn(t0) + vFn(t1)) * 0.5;
  };

  // 每个矩形的渐变仅几何不同，按 (n, time, method, 画布几何, theme) 缓存复用
  const gradKey = [
    n,
    params.time,
    params.method,
    params.curveKind,
    width,
    height,
    P.isDark
  ].join('|');
  if (!rectGradCache || rectGradCache.key !== gradKey) {
    const gradients: CanvasGradient[] = [];
    for (let i = 0; i < n; i += 1) {
      const g = ctx.createLinearGradient(0, toY(rectValue(i)), 0, bottom);
      g.addColorStop(0, P.approxSoft);
      g.addColorStop(1, P.approxFill);
      gradients.push(g);
    }
    rectGradCache = { key: gradKey, gradients };
  }
  const rectGrads = rectGradCache.gradients;

  for (let i = 0; i < n; i += 1) {
    const x0 = left + i * slotW;
    const yVal = toY(rectValue(i));
    const yTop = Math.min(yAxis, yVal);
    const hPx = Math.max(1, Math.abs(yAxis - yVal));

    ctx.fillStyle = rectGrads[i];
    ctx.fillRect(x0, yTop, barW, hPx);

    ctx.strokeStyle = P.approx;
    ctx.lineWidth = lineW(1.2, s, cs);
    ctx.beginPath();
    ctx.moveTo(x0, yVal);
    ctx.lineTo(x0 + barW, yVal);
    ctx.stroke();
  }

  // 真实曲线（珊瑚，带柔光）
  ctx.shadowColor = P.curveSoft;
  ctx.shadowBlur = 6 * s;
  ctx.strokeStyle = P.curve;
  ctx.lineWidth = lineW(2.8, s, cs);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 200; i += 1) {
    const t = (i / 200) * params.time;
    const px = toX(t);
    const py = toY(vFn(t));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── 图例（右上，圆角面板）──
  const panelFont = fontPx(11, s, cs);
  const lineH = Math.max(18, 22 * s * cs);
  const panelW = Math.max(120, 132 * s * cs);
  const panelH = lineH * 2 + 16 * s;
  const px0 = right - panelW - 6 * s;
  const py0 = top + 4 * s;
  ctx.fillStyle = P.isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.82)';
  pathRoundRect(ctx, px0, py0, panelW, panelH, 8 * s);
  ctx.fill();
  ctx.strokeStyle = P.isDark
    ? 'rgba(148,163,184,0.25)'
    : 'rgba(100,116,139,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `${panelFont}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const rowY1 = py0 + 12 * s + lineH * 0.5;
  const rowY2 = rowY1 + lineH;
  // 真实曲线
  ctx.strokeStyle = P.curve;
  ctx.lineWidth = lineW(2.4, s, cs);
  ctx.beginPath();
  ctx.moveTo(px0 + 12 * s, rowY1);
  ctx.lineTo(px0 + 30 * s, rowY1);
  ctx.stroke();
  ctx.fillStyle = P.text;
  ctx.fillText('真实 v-t 曲线', px0 + 38 * s, rowY1);
  // 矩形近似
  ctx.fillStyle = P.approxFill;
  ctx.fillRect(px0 + 12 * s, rowY2 - 5 * s, 18 * s, 10 * s);
  ctx.strokeStyle = P.approx;
  ctx.lineWidth = 1;
  ctx.strokeRect(px0 + 12 * s, rowY2 - 5 * s, 18 * s, 10 * s);
  ctx.fillStyle = P.text;
  ctx.fillText('矩形近似', px0 + 38 * s, rowY2);

  ctx.restore();
}

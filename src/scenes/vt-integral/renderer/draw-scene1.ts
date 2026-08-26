import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';
import { vtPalette, fontPx, lineW, FONT_FAMILY } from './palette';

const METHOD_LABEL: Record<string, string> = {
  left: '左端点',
  mid: '中点',
  right: '右端点',
  trap: '梯形'
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 子场景 1 · 以直代曲：v-t 图面积（黎曼和）
 * 用 N 个矩形逼近速度曲线下的面积，N 越大越贴合（位移 = v-t 面积）。
 */
export function drawScene1(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, height, responsiveScale, contentScale } = context;
  const { params, metrics } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;

  const left = 72 * s;
  const right = width - 44 * s;
  const bottom = height * 0.76;
  const top = height * 0.17;
  const axisW = right - left;
  const axisH = bottom - top;

  const vMax = 1 + 0.8 * params.time;
  const yMax = vMax * 1.15;
  const vFn = (t: number) => 1 + 0.8 * t;
  const toX = (t: number) => left + (t / params.time) * axisW;
  const toY = (v: number) => bottom - (v / yMax) * axisH;

  drawAxis(context, {
    x: left,
    y: bottom,
    width: axisW,
    height: axisH,
    xMin: 0,
    xMax: params.time,
    yMin: 0,
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
  ctx.fillText('以直代曲 · 矩形逼近 v-t 图面积', left + 2 * s, top - 14 * s);

  // 真实面积（曲线下）渐变填充
  const fillGrad = ctx.createLinearGradient(0, top, 0, bottom);
  fillGrad.addColorStop(0, P.curveFill);
  fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let i = 0; i <= 200; i += 1) {
    const t = (i / 200) * params.time;
    ctx.lineTo(toX(t), toY(vFn(t)));
  }
  ctx.lineTo(toX(params.time), bottom);
  ctx.closePath();
  ctx.fill();

  // 黎曼矩形（薄荷渐变 + 顶边高亮）
  const n = params.rects;
  const dt = params.time / n;
  const slotW = axisW / n;
  const barW = slotW * (n > 30 ? 1 : 0.9);
  for (let i = 0; i < n; i += 1) {
    const t0 = i * dt;
    const t1 = (i + 1) * dt;
    let vRect: number;
    if (params.method === 'left') vRect = vFn(t0);
    else if (params.method === 'right') vRect = vFn(t1);
    else if (params.method === 'mid') vRect = vFn((t0 + t1) * 0.5);
    else vRect = (vFn(t0) + vFn(t1)) * 0.5;

    const x0 = left + i * slotW + (slotW - barW) * 0.5;
    const yTop = toY(vRect);
    const hPx = bottom - yTop;

    const g = ctx.createLinearGradient(0, yTop, 0, bottom);
    g.addColorStop(0, P.approxSoft);
    g.addColorStop(1, P.approxFill);
    ctx.fillStyle = g;
    ctx.fillRect(x0, yTop, barW, hPx);

    ctx.strokeStyle = P.approx;
    ctx.lineWidth = lineW(1.4, s, cs);
    ctx.beginPath();
    ctx.moveTo(x0, yTop);
    ctx.lineTo(x0 + barW, yTop);
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
  roundRect(ctx, px0, py0, panelW, panelH, 8 * s);
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

  // ── 收敛数据徽章（左下）──
  const badgeFont = fontPx(11, s, cs);
  const relPct = (metrics.relErr * 100).toFixed(2);
  const lines = [
    `分割 n = ${n}（${METHOD_LABEL[params.method] ?? params.method}）`,
    `近似面积 = ${metrics.rectArea.toFixed(3)}`,
    `真实面积 = ${metrics.trueArea.toFixed(3)}`,
    `相对误差 = ${relPct}%`
  ];
  const bLineH = Math.max(17, 20 * s * cs);
  const bPad = 12 * s;
  let bW = 0;
  ctx.font = `${badgeFont}px ${FONT_FAMILY}`;
  for (const ln of lines) bW = Math.max(bW, ctx.measureText(ln).width);
  bW += bPad * 2;
  const bH = bLineH * lines.length + bPad * 1.4;
  const bx = left + 8 * s;
  const by = bottom - bH - 8 * s;
  ctx.fillStyle = P.isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.82)';
  roundRect(ctx, bx, by, bW, bH, 8 * s);
  ctx.fill();
  ctx.strokeStyle = P.isDark
    ? 'rgba(148,163,184,0.25)'
    : 'rgba(100,116,139,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, idx) => {
    ctx.fillStyle = idx === 3 ? P.accent : P.textSecondary;
    ctx.fillText(ln, bx + bPad, by + bPad * 0.7 + bLineH * (idx + 0.5));
  });

  ctx.restore();
}

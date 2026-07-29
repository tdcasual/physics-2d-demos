import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';
import { vtPalette, fontPx, lineW, markR, FONT_FAMILY } from './palette';

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
 * 子场景 2 · 化曲为直：用折线段逼近曲线长度
 * 把光滑曲线细分成许多小段，每小段近似为直线段；段数越多，
 * 折线总长越接近真实弧长。
 */
export function drawScene2(
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
  const bottom = height * 0.74;
  const top = height * 0.17;
  const axisW = right - left;
  const axisH = bottom - top;

  const amplitude = params.curveAmplitude;
  const ySpan = amplitude * 2.4;
  const curveFn = (x: number) => amplitude * Math.sin(Math.PI * x);
  const toX = (x: number) => left + x * axisW;
  const toY = (y: number) => bottom - ((y + amplitude * 1.2) / ySpan) * axisH;

  drawAxis(context, {
    x: left,
    y: bottom,
    width: axisW,
    height: axisH,
    xMin: 0,
    xMax: 1,
    yMin: -amplitude * 1.2,
    yMax: amplitude * 1.2,
    xLabel: 'x',
    yLabel: 'y'
  });

  ctx.save();

  // 场景标题
  ctx.fillStyle = P.text;
  ctx.font = `600 ${fontPx(14, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('化曲为直 · 折线逼近曲线弧长', left + 2 * s, top - 14 * s);

  // 段数（view 层映射：随 amplitude 增大而细分，默认取较少段数以凸显"以直代曲"）
  const segments = Math.max(
    4,
    Math.min(40, Math.round(params.curveAmplitude * 32))
  );

  // 弦（首尾连线，灰色虚线，示意"直线距离"）
  ctx.strokeStyle = P.guide;
  ctx.lineWidth = lineW(1.2, s, cs);
  ctx.setLineDash([4 * s, 4 * s]);
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(curveFn(0)));
  ctx.lineTo(toX(1), toY(curveFn(1)));
  ctx.stroke();
  ctx.setLineDash([]);

  // 折线逼近（明黄虚线 + 顶点）
  const segPts: Array<{ x: number; y: number; rx: number; ry: number }> = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = i / segments;
    const y = curveFn(x);
    segPts.push({ x, y, rx: toX(x), ry: toY(y) });
  }
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = lineW(2, s, cs);
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  segPts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.rx, p.ry);
    else ctx.lineTo(p.rx, p.ry);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const dotR = markR(2.6, s, cs);
  ctx.fillStyle = P.accent;
  for (const p of segPts) {
    ctx.beginPath();
    ctx.arc(p.rx, p.ry, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 真实曲线（珊瑚，柔光）
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
    const py = toY(curveFn(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 折线总长（真实单位，与弧长同量纲）
  let polyLen = 0;
  for (let i = 1; i < segPts.length; i += 1) {
    polyLen += Math.hypot(
      segPts[i].x - segPts[i - 1].x,
      segPts[i].y - segPts[i - 1].y
    );
  }

  // ── 图例（右上）──
  const panelFont = fontPx(11, s, cs);
  const lineH = Math.max(18, 22 * s * cs);
  const panelW = Math.max(150, 168 * s * cs);
  const panelH = lineH * 3 + 16 * s;
  const px0 = right - panelW - 6 * s;
  const py0 = top + 4 * s;
  ctx.fillStyle = P.isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.82)';
  roundRect(ctx, px0, py0, panelW, panelH, 8 * s);
  ctx.fill();
  ctx.strokeStyle = P.isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `${panelFont}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const rows = [
    { label: '正弦曲线', color: P.curve, dash: false },
    { label: `折线逼近 (n=${segments})`, color: P.accent, dash: true },
    { label: '弦（直线距离）', color: P.guide, dash: true }
  ];
  rows.forEach((r, idx) => {
    const ry = py0 + 12 * s + lineH * (idx + 0.5);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = lineW(2.2, s, cs);
    ctx.setLineDash(r.dash ? [5 * s, 3 * s] : []);
    ctx.beginPath();
    ctx.moveTo(px0 + 12 * s, ry);
    ctx.lineTo(px0 + 30 * s, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = P.text;
    ctx.fillText(r.label, px0 + 38 * s, ry);
  });

  // ── 收敛数据徽章（左下）──
  const badgeFont = fontPx(11, s, cs);
  const lines = [
    `分段 n = ${segments}`,
    `折线长 ≈ ${polyLen.toFixed(4)}`,
    `曲线长 = ${metrics.curveLength.toFixed(4)}`
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
  ctx.strokeStyle = P.isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, idx) => {
    ctx.fillStyle = idx === 2 ? P.accent : P.textSecondary;
    ctx.fillText(ln, bx + bPad, by + bPad * 0.7 + bLineH * (idx + 0.5));
  });

  ctx.restore();
}

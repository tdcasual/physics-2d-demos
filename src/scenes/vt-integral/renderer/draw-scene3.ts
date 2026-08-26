import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
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
 * 子场景 3 · 割圆术：用圆内接正多边形逼近圆
 * 刘徽"割圆术"——边数越多，多边形周长越接近圆周（极限思想求 π）。
 */
export function drawScene3(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, height, responsiveScale, contentScale } = context;
  const { params, metrics } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;

  const cx = width * 0.36;
  const cy = height * 0.52;
  const r = Math.min(width * 0.3, height * 0.34);

  ctx.save();

  // 圆（径向渐变 + 虚线圆周）
  const grad = ctx.createRadialGradient(
    cx - r * 0.25,
    cy - r * 0.25,
    r * 0.1,
    cx,
    cy,
    r
  );
  if (P.isDark) {
    grad.addColorStop(0, 'rgba(51,65,85,0.55)');
    grad.addColorStop(1, 'rgba(15,23,42,0.25)');
  } else {
    grad.addColorStop(0, 'rgba(241,245,249,0.9)');
    grad.addColorStop(1, 'rgba(226,232,240,0.4)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = P.guide;
  ctx.lineWidth = lineW(1.6, s, cs);
  ctx.setLineDash([6 * s, 5 * s]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 内接正 n 边形顶点
  const n = params.circleN;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i += 1) {
    const theta = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(theta) * r, y: cy + Math.sin(theta) * r });
  }

  // 多边形填充（薄荷渐变）
  const polyGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  polyGrad.addColorStop(0, P.approxFill);
  polyGrad.addColorStop(
    1,
    P.isDark ? 'rgba(78,205,196,0.05)' : 'rgba(18,165,148,0.05)'
  );
  ctx.fillStyle = polyGrad;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fill();

  // 多边形边（薄荷，柔光）
  ctx.shadowColor = P.approxSoft;
  ctx.shadowBlur = 5 * s;
  ctx.strokeStyle = P.approx;
  ctx.lineWidth = lineW(2.2, s, cs);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 顶点
  const dotR = n > 60 ? 0 : markR(2.8, s, cs);
  if (dotR > 0) {
    ctx.fillStyle = P.isDark ? '#e2e8f0' : '#334155';
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 半径（虚线）与标签
  ctx.strokeStyle = P.guide;
  ctx.lineWidth = lineW(1.2, s, cs);
  ctx.setLineDash([4 * s, 4 * s]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = P.textMuted;
  ctx.font = `italic ${fontPx(12, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('r = 1', cx + r * 0.5, cy - 6 * s);

  // 圆心
  ctx.fillStyle = P.isDark ? 'rgba(226,232,240,0.8)' : 'rgba(51,65,85,0.8)';
  ctx.beginPath();
  ctx.arc(cx, cy, markR(2.6, s, cs), 0, Math.PI * 2);
  ctx.fill();

  // 收敛提示
  if (n >= 50) {
    ctx.fillStyle = P.accent;
    ctx.font = `italic 600 ${fontPx(13, s, cs)}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('割之又割，多边形已近乎与圆合体', cx, cy - r - 14 * s);
  }

  // ── 收敛数据面板（右侧）──
  const perimeter = 2 * n * Math.sin(Math.PI / n);
  const circumference = Math.PI * 2;
  const panelFont = fontPx(11.5, s, cs);
  const lineH = Math.max(20, 24 * s * cs);
  const rows = [
    { label: '内接正多边形', value: `n = ${n} 边`, accent: false },
    { label: '多边形周长', value: perimeter.toFixed(4), accent: false },
    { label: '圆周长 2π', value: circumference.toFixed(4), accent: false },
    {
      label: '两者之差',
      value: metrics.circumferenceDiff.toFixed(4),
      accent: true
    }
  ];
  let panelW = 0;
  ctx.font = `${panelFont}px ${FONT_FAMILY}`;
  for (const rw of rows) {
    panelW = Math.max(
      panelW,
      ctx.measureText(rw.label).width + ctx.measureText(rw.value).width
    );
  }
  panelW += 60 * s * cs;
  const panelH = lineH * (rows.length + 1) + 18 * s;
  const px0 = Math.min(width - panelW - 24 * s, cx + r + 40 * s);
  const py0 = cy - panelH * 0.5;

  ctx.fillStyle = P.isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.88)';
  roundRect(ctx, px0, py0, panelW, panelH, 10 * s);
  ctx.fill();
  ctx.strokeStyle = P.isDark
    ? 'rgba(148,163,184,0.28)'
    : 'rgba(100,116,139,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 面板标题
  ctx.fillStyle = P.text;
  ctx.font = `600 ${fontPx(12.5, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('割圆术 · 逼近圆周', px0 + 16 * s, py0 + lineH * 0.6);

  rows.forEach((rw, idx) => {
    const ry = py0 + lineH * (idx + 1.5);
    ctx.font = `${panelFont}px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = P.textSecondary;
    ctx.fillText(rw.label, px0 + 16 * s, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = rw.accent ? P.accent : P.text;
    ctx.fillText(rw.value, px0 + panelW - 16 * s, ry);
  });

  ctx.restore();
}

import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { vtPalette, fontPx, lineW, markR, FONT_FAMILY } from './palette';

// 圆渐变 / 多边形渐变 / 内接多边形顶点：仅依赖几何与主题，
// 命中缓存时复用，参数或画布尺寸变化时重建
let circleGradCache: { key: string; grad: CanvasGradient } | null = null;
let polyGradCache: { key: string; grad: CanvasGradient } | null = null;
let polyPtsCache: {
  key: string;
  pts: Array<{ x: number; y: number }>;
} | null = null;

/**
 * 子场景 3 · 割圆术：用圆内接正多边形逼近圆
 * 刘徽"割圆术"——边数越多，多边形周长越接近圆周（极限思想求 π）。
 */
export function drawScene3(
  context: DrawContext,
  snapshot: VtIntegralSnapshot
): void {
  const { ctx, width, height, responsiveScale, contentScale } = context;
  const { params } = snapshot;
  const P = vtPalette(context.theme);
  const s = responsiveScale;
  const cs = contentScale;

  const cx = width * 0.36;
  const cy = height * 0.52;
  const r = Math.min(width * 0.3, height * 0.34);

  ctx.save();

  // 圆（径向渐变 + 虚线圆周）
  const circleGradKey = `${cx}|${cy}|${r}|${P.isDark}`;
  if (!circleGradCache || circleGradCache.key !== circleGradKey) {
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
    circleGradCache = { key: circleGradKey, grad };
  }
  ctx.fillStyle = circleGradCache.grad;
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

  // 内接正 n 边形顶点（只依赖 n 与几何，缓存复用）
  const n = params.circleN;
  const ptsKey = `${n}|${cx}|${cy}|${r}`;
  if (!polyPtsCache || polyPtsCache.key !== ptsKey) {
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i += 1) {
      const theta = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(theta) * r, y: cy + Math.sin(theta) * r });
    }
    polyPtsCache = { key: ptsKey, pts };
  }
  const pts = polyPtsCache.pts;

  // 多边形填充（薄荷渐变）
  const polyGradKey = `${cx}|${cy}|${r}|${P.isDark}`;
  if (!polyGradCache || polyGradCache.key !== polyGradKey) {
    const polyGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    polyGrad.addColorStop(0, P.approxFill);
    polyGrad.addColorStop(
      1,
      P.isDark ? 'rgba(78,205,196,0.05)' : 'rgba(18,165,148,0.05)'
    );
    polyGradCache = { key: polyGradKey, grad: polyGrad };
  }
  ctx.fillStyle = polyGradCache.grad;
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

  ctx.fillStyle = P.text;
  ctx.font = `600 ${fontPx(14, s, cs)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('割圆术 · 逼近圆周', 24 * s, 28 * s);

  ctx.restore();
}

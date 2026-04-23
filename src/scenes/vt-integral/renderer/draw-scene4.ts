import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawMetricPanel } from './draw-metric-panel';

/**
 * Scene 4: 旋转体表面积 — 球棱锥体积逼近
 */
export function drawScene4(context: DrawContext, snapshot: VtIntegralSnapshot): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { params, metrics } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const cx = width * 0.28;
  const cy = height * 0.52;
  const r = Math.min(width, height) * 0.22;

  ctx.save();

  // 绘制球体剖面（2D 圆）
  const sphereGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.05, cx, cy, r);
  if (isDark) {
    sphereGrad.addColorStop(0, 'rgba(59,130,246,0.25)');
    sphereGrad.addColorStop(1, 'rgba(30,58,138,0.1)');
  } else {
    sphereGrad.addColorStop(0, 'rgba(96,165,250,0.2)');
    sphereGrad.addColorStop(1, 'rgba(191,219,254,0.08)');
  }

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isDark ? 'rgba(96,165,250,0.4)' : 'rgba(59,130,246,0.35)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // 内部切分示意（用同心圆表示逼近层数）
  const n = params.surfaceN;
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(71,85,105,0.12)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3 * s, 3 * s]);
  for (let i = 1; i <= Math.min(n, 8); i++) {
    const ratio = i / (n + 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * ratio, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 水平中线
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(71,85,105,0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // 右侧柱状图
  const barBaseX = width * 0.62;
  const barBaseY = height * 0.65;
  const barW = Math.max(30, 50 * s);
  const barMaxH = height * 0.35;
  const barGap = Math.max(40, 70 * s);

  const trueVal = metrics.surfaceTrue;
  const approxVal = metrics.surfaceApprox;
  const maxVal = Math.max(trueVal, approxVal) * 1.1;

  const trueH = (trueVal / maxVal) * barMaxH;
  const approxH = (approxVal / maxVal) * barMaxH;

  // 真实值柱
  const trueGrad = ctx.createLinearGradient(barBaseX, barBaseY - trueH, barBaseX, barBaseY);
  trueGrad.addColorStop(0, isDark ? 'rgba(96,165,250,0.9)' : 'rgba(37,99,235,0.85)');
  trueGrad.addColorStop(1, isDark ? 'rgba(96,165,250,0.5)' : 'rgba(37,99,235,0.45)');

  ctx.fillStyle = trueGrad;
  roundRect(ctx, barBaseX, barBaseY - trueH, barW, trueH, Math.max(3, 5 * s));
  ctx.fill();

  // 近似值柱
  const approxGrad = ctx.createLinearGradient(barBaseX + barGap, barBaseY - approxH, barBaseX + barGap, barBaseY);
  approxGrad.addColorStop(0, isDark ? 'rgba(45,212,191,0.9)' : 'rgba(13,148,136,0.85)');
  approxGrad.addColorStop(1, isDark ? 'rgba(45,212,191,0.5)' : 'rgba(13,148,136,0.45)');

  ctx.fillStyle = approxGrad;
  roundRect(ctx, barBaseX + barGap, barBaseY - approxH, barW, approxH, Math.max(3, 5 * s));
  ctx.fill();

  // 柱子顶部数值
  ctx.font = `700 ${Math.max(10, Math.round(13 * s))}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
  ctx.fillText(trueVal.toFixed(3), barBaseX + barW * 0.5, barBaseY - trueH - 4 * s);
  ctx.fillText(approxVal.toFixed(3), barBaseX + barGap + barW * 0.5, barBaseY - approxH - 4 * s);

  // 柱子标签
  ctx.font = `${Math.max(10, Math.round(12 * s))}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.fillText('真实值', barBaseX + barW * 0.5, barBaseY + 6 * s);
  ctx.fillText('近似值', barBaseX + barGap + barW * 0.5, barBaseY + 6 * s);

  // 误差指示线
  if (Math.abs(trueH - approxH) > 5) {
    const topY = Math.min(barBaseY - trueH, barBaseY - approxH) - 15 * s;
    ctx.strokeStyle = isDark ? 'rgba(248,113,113,0.5)' : 'rgba(239,68,68,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * s, 3 * s]);
    ctx.beginPath();
    ctx.moveTo(barBaseX + barW, topY);
    ctx.lineTo(barBaseX + barGap, topY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 误差标注
    ctx.font = `600 ${Math.max(9, Math.round(11 * s))}px "Noto Sans SC", system-ui, sans-serif`;
    ctx.fillStyle = isDark ? 'rgba(248,113,113,0.8)' : 'rgba(239,68,68,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `误差 ${(metrics.surfaceRelErr * 100).toFixed(1)}%`,
      barBaseX + (barW + barGap) * 0.5,
      topY - 2 * s
    );
  }

  // 标题
  ctx.font = `700 ${Math.max(14, Math.round(18 * s))}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
  ctx.fillText('球棱锥体积逼近', width * 0.62, height * 0.12);

  ctx.restore();

  // 数据面板
  drawMetricPanel(context, [
    { icon: '🔵', label: '真实体积', value: metrics.surfaceTrue.toFixed(4) },
    { icon: '🟢', label: '近似体积', value: metrics.surfaceApprox.toFixed(4) },
    { icon: '⚠', label: '相对误差', value: `${(metrics.surfaceRelErr * 100).toFixed(2)}%`, highlight: true },
    { icon: '📊', label: '网格密度 n', value: String(params.surfaceN) }
  ]);
}

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

import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawMetricPanel } from './draw-metric-panel';

/**
 * Scene 3: 圆内接多边形 — 用多边形逼近圆周
 */
export function drawScene3(context: DrawContext, snapshot: VtIntegralSnapshot): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { params, metrics } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const cx = width * 0.35;
  const cy = height * 0.48;
  const r = Math.min(width, height) * 0.28;

  ctx.save();

  // 绘制圆（径向渐变填充）
  const circleGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
  if (isDark) {
    circleGrad.addColorStop(0, 'rgba(30,41,59,0.6)');
    circleGrad.addColorStop(1, 'rgba(15,23,42,0.3)');
  } else {
    circleGrad.addColorStop(0, 'rgba(241,245,249,0.8)');
    circleGrad.addColorStop(1, 'rgba(226,232,240,0.4)');
  }

  ctx.fillStyle = circleGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 圆周虚线
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(71,85,105,0.25)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.setLineDash([5 * s, 4 * s]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 绘制多边形
  const n = params.circleN;
  const polygonPoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= n; i++) {
    const theta = (i / n) * Math.PI * 2;
    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;
    polygonPoints.push({ x: px, y: py });
  }

  // 多边形填充
  ctx.fillStyle = isDark ? 'rgba(45,212,191,0.12)' : 'rgba(20,184,166,0.1)';
  ctx.beginPath();
  for (let i = 0; i < polygonPoints.length; i++) {
    if (i === 0) ctx.moveTo(polygonPoints[i].x, polygonPoints[i].y);
    else ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // 多边形边框
  ctx.strokeStyle = isDark ? 'rgba(45,212,191,0.7)' : 'rgba(20,184,166,0.7)';
  ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 顶点标记
  const vertexR = Math.max(2, 3 * s);
  ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
  for (const p of polygonPoints) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, vertexR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 半径标注
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(71,85,105,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // 半径标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.5)' : 'rgba(71,85,105,0.5)';
  ctx.font = `${Math.max(9, Math.round(11 * s))}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('r = 1', cx + r * 0.5, cy - 10 * s);

  // 中心点
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(71,85,105,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, 2.5 * s), 0, Math.PI * 2);
  ctx.fill();

  // 右侧信息
  const infoX = width * 0.72;
  const infoY = height * 0.25;
  const infoFont = Math.max(11, Math.round(14 * s));
  const infoLineH = Math.max(24, 30 * s);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = `700 ${Math.max(13, Math.round(16 * s))}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
  ctx.fillText('圆内接正多边形', infoX, infoY);

  ctx.font = `${infoFont}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.7)';

  const lines = [
    `边数 n = ${n}`,
    `圆周率 π ≈ 3.14159`,
    `多边形周长 = ${(2 * n * Math.sin(Math.PI / n)).toFixed(4)}`,
    `圆周长 = ${(2 * Math.PI).toFixed(4)}`,
    `周长差 = ${metrics.circumferenceDiff.toFixed(4)}`
  ];

  lines.forEach((line, i) => {
    ctx.fillText(line, infoX, infoY + infoLineH * (i + 1));
  });

  // 当 n 很大时显示提示
  if (n >= 50) {
    ctx.font = `italic ${Math.max(10, Math.round(12 * s))}px "Noto Sans SC", system-ui, sans-serif`;
    ctx.fillStyle = isDark ? 'rgba(74,222,128,0.7)' : 'rgba(22,163,74,0.7)';
    ctx.fillText('多边形已非常接近圆！', infoX, infoY + infoLineH * (lines.length + 1.5));
  }

  ctx.restore();

  // 数据面板
  drawMetricPanel(context, [
    { icon: '🔷', label: '分割数 n', value: String(n) },
    { icon: '📐', label: '圆周长', value: (2 * Math.PI).toFixed(4) },
    { icon: '📏', label: '多边形周长', value: (2 * n * Math.sin(Math.PI / n)).toFixed(4) },
    { icon: '⚠', label: '周长差', value: metrics.circumferenceDiff.toFixed(4), highlight: true }
  ]);
}

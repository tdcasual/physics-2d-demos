import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';

/**
 * Scene 1: v-t 图面积 — 用矩形逼近曲线下面积
 */
export function drawScene1(context: DrawContext, snapshot: VtIntegralSnapshot): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { params, metrics } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const left = 70 * s;
  const right = width - 40 * s;
  const bottom = height * 0.72;
  const top = height * 0.15;
  const axisW = right - left;
  const axisH = bottom - top;

  // 计算曲线最大值用于 Y 轴范围
  const vMax = 1 + 0.8 * params.time;
  const yMax = vMax * 1.15;

  // 绘制坐标轴
  drawAxis(context, {
    x: left,
    y: bottom,
    width: axisW,
    height: axisH,
    xMin: 0,
    xMax: params.time,
    yMin: 0,
    yMax,
    xLabel: 't (s)',
    yLabel: 'v (m/s)'
  });

  // 绘制曲线 y = 1 + 0.8 * t
  ctx.save();
  ctx.strokeStyle = isDark ? '#4ade80' : '#16a34a';
  ctx.lineWidth = Math.max(2, 2.5 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * params.time;
    const v = 1 + 0.8 * t;
    const px = left + (t / params.time) * axisW;
    const py = bottom - (v / yMax) * axisH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 曲线下方填充（真实面积，半透明）
  ctx.fillStyle = isDark ? 'rgba(74,222,128,0.08)' : 'rgba(22,163,74,0.06)';
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * params.time;
    const v = 1 + 0.8 * t;
    const px = left + (t / params.time) * axisW;
    const py = bottom - (v / yMax) * axisH;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(right, bottom);
  ctx.closePath();
  ctx.fill();

  // 绘制矩形逼近
  const n = params.rects;
  const dt = params.time / n;
  const barW = (axisW / n) * 0.92;
  const gap = (axisW / n) * 0.08;

  for (let i = 0; i < n; i++) {
    const t0 = i * dt;
    const t1 = (i + 1) * dt;
    let vRect: number;

    if (params.method === 'left') vRect = 1 + 0.8 * t0;
    else if (params.method === 'right') vRect = 1 + 0.8 * t1;
    else if (params.method === 'mid') vRect = 1 + 0.8 * ((t0 + t1) * 0.5);
    else vRect = (1 + 0.8 * t0 + 1 + 0.8 * t1) * 0.5; // trap

    const x0 = left + (i / n) * axisW + gap * 0.5;
    const hPx = (vRect / yMax) * axisH;

    // 矩形填充：交替透明度
    const isEven = i % 2 === 0;
    ctx.fillStyle = isEven
      ? (isDark ? 'rgba(56,189,248,0.22)' : 'rgba(14,165,233,0.18)')
      : (isDark ? 'rgba(56,189,248,0.14)' : 'rgba(14,165,233,0.11)');
    ctx.fillRect(x0, bottom - hPx, barW, hPx);

    // 矩形上边沿高亮线
    ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.6)' : 'rgba(14,165,233,0.5)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.moveTo(x0, bottom - hPx);
    ctx.lineTo(x0 + barW, bottom - hPx);
    ctx.stroke();

    // 矩形左右边线（细）
    ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.2)' : 'rgba(14,165,233,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, bottom);
    ctx.lineTo(x0, bottom - hPx);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + barW, bottom);
    ctx.lineTo(x0 + barW, bottom - hPx);
    ctx.stroke();
  }

  // 图例
  const legendX = left + 10 * s;
  const legendY = top + 8 * s;
  const legendFont = Math.max(9, Math.round(11 * s));
  const legendLineH = Math.max(16, 20 * s);

  ctx.font = `${legendFont}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // 曲线图例
  ctx.strokeStyle = isDark ? '#4ade80' : '#16a34a';
  ctx.lineWidth = Math.max(2, 2 * s);
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 18 * s, legendY);
  ctx.stroke();
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.fillText('真实曲线', legendX + 24 * s, legendY);

  // 矩形图例
  ctx.fillStyle = isDark ? 'rgba(56,189,248,0.3)' : 'rgba(14,165,233,0.25)';
  ctx.fillRect(legendX, legendY + legendLineH - 4 * s, 18 * s, 8 * s);
  ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.5)' : 'rgba(14,165,233,0.4)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legendX, legendY + legendLineH - 4 * s, 18 * s, 8 * s);
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.fillText('矩形近似', legendX + 24 * s, legendY + legendLineH);

  ctx.restore();
}

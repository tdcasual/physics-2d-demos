import type { VtIntegralSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawAxis } from './draw-axis';

/**
 * Scene 2: 曲线长度 — 用折线段逼近正弦曲线
 */
export function drawScene2(context: DrawContext, snapshot: VtIntegralSnapshot): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { params } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const left = 70 * s;
  const right = width - 40 * s;
  const bottom = height * 0.72;
  const top = height * 0.15;
  const axisW = right - left;
  const axisH = bottom - top;

  const amplitude = params.curveAmplitude;

  // 绘制坐标轴
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

  // 绘制正弦曲线 y = amplitude * sin(π * x)
  ctx.strokeStyle = isDark ? '#f472b6' : '#db2777';
  ctx.lineWidth = Math.max(2, 2.5 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const x = i / 300;
    const y = amplitude * Math.sin(Math.PI * x);
    const px = left + x * axisW;
    const py = bottom - ((y + amplitude * 1.2) / (amplitude * 2.4)) * axisH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 曲线下方区域填充
  ctx.fillStyle = isDark ? 'rgba(244,114,182,0.06)' : 'rgba(219,39,119,0.05)';
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let i = 0; i <= 300; i++) {
    const x = i / 300;
    const y = amplitude * Math.sin(Math.PI * x);
    const px = left + x * axisW;
    const py = bottom - ((y + amplitude * 1.2) / (amplitude * 2.4)) * axisH;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(right, bottom);
  ctx.closePath();
  ctx.fill();

  // 用折线段逼近曲线（细分级别根据 amplitude 映射）
  const segments = Math.max(4, Math.min(50, Math.round(params.curveAmplitude * 80)));
  const segPoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= segments; i++) {
    const x = i / segments;
    const y = amplitude * Math.sin(Math.PI * x);
    const px = left + x * axisW;
    const py = bottom - ((y + amplitude * 1.2) / (amplitude * 2.4)) * axisH;
    segPoints.push({ x: px, y: py });
  }

  // 绘制折线
  ctx.strokeStyle = isDark ? 'rgba(250,204,21,0.7)' : 'rgba(202,138,4,0.7)';
  ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.beginPath();
  for (let i = 0; i < segPoints.length; i++) {
    if (i === 0) ctx.moveTo(segPoints[i].x, segPoints[i].y);
    else ctx.lineTo(segPoints[i].x, segPoints[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 折线端点标记
  const pointRadius = Math.max(2, 3 * s);
  ctx.fillStyle = isDark ? '#facc15' : '#ca8a04';
  for (const p of segPoints) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 直线距离（弦长）标注
  const startX = segPoints[0].x;
  const startY = segPoints[0].y;
  const endX = segPoints[segPoints.length - 1].x;
  const endY = segPoints[segPoints.length - 1].y;

  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(71,85,105,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 图例
  const legendX = left + 10 * s;
  const legendY = top + 8 * s;
  const legendFont = Math.max(9, Math.round(11 * s));
  const legendLineH = Math.max(16, 20 * s);

  ctx.font = `${legendFont}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = isDark ? '#f472b6' : '#db2777';
  ctx.lineWidth = Math.max(2, 2 * s);
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 18 * s, legendY);
  ctx.stroke();
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.fillText('正弦曲线', legendX + 24 * s, legendY);

  ctx.strokeStyle = isDark ? 'rgba(250,204,21,0.7)' : 'rgba(202,138,4,0.7)';
  ctx.lineWidth = Math.max(1.5, 1.5 * s);
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + legendLineH);
  ctx.lineTo(legendX + 18 * s, legendY + legendLineH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = isDark ? '#facc15' : '#ca8a04';
  ctx.beginPath();
  ctx.arc(legendX + 9 * s, legendY + legendLineH, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.fillText(`折线逼近 (n=${segments})`, legendX + 24 * s, legendY + legendLineH);

  ctx.restore();
}

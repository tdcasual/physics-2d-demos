import type { DrawContext, AxisConfig } from './types';

/**
 * 绘制带箭头、刻度、标签的坐标轴
 */
export function drawAxis(context: DrawContext, config: AxisConfig): void {
  const { ctx, theme, responsiveScale } = context;
  const { x, y, width, height, xMin, xMax, yMin, yMax, xLabel, yLabel } = config;

  const isDark = theme === 'dark';
  const axisColor = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(71,85,105,0.6)';
  const tickColor = isDark ? 'rgba(226,232,240,0.4)' : 'rgba(71,85,105,0.4)';
  const textColor = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.7)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const s = responsiveScale;
  // 演示模式放大：线宽/刻度放大幅度更柔和，字体足量放大保证投影可读
  const cs = Math.min(context.contentScale, 1.6);
  const fs = s * context.contentScale;
  const lineWidth = Math.max(1, 1.5 * s * cs);
  const tickLength = Math.max(4, 6 * s * cs);
  const fontSize = Math.max(9, Math.round(11 * fs));
  const arrowSize = Math.max(5, 8 * s * cs);

  ctx.save();

  // 网格线
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  // X轴网格线
  const xTicks = niceTicks(xMin, xMax, 5);
  for (const tx of xTicks) {
    const px = x + ((tx - xMin) / xRange) * width;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y - height);
    ctx.stroke();
  }

  // Y轴网格线
  const yTicks = niceTicks(yMin, yMax, 5);
  for (const ty of yTicks) {
    const py = y - ((ty - yMin) / yRange) * height;
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + width, py);
    ctx.stroke();
  }

  // X轴
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  // X轴箭头
  ctx.fillStyle = axisColor;
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width - arrowSize, y - arrowSize * 0.5);
  ctx.lineTo(x + width - arrowSize, y + arrowSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Y轴
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - height);
  ctx.stroke();

  // Y轴箭头
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.lineTo(x - arrowSize * 0.5, y - height + arrowSize);
  ctx.lineTo(x + arrowSize * 0.5, y - height + arrowSize);
  ctx.closePath();
  ctx.fill();

  // X轴刻度和标签
  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const tx of xTicks) {
    const px = x + ((tx - xMin) / xRange) * width;
    // 刻度线
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + tickLength);
    ctx.stroke();
    // 标签
    ctx.fillText(formatTick(tx), px, y + tickLength + 2);
  }

  // Y轴刻度和标签
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const ty of yTicks) {
    const py = y - ((ty - yMin) / yRange) * height;
    // 刻度线
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x - tickLength, py);
    ctx.stroke();
    // 标签
    ctx.fillText(formatTick(ty), x - tickLength - 3, py);
  }

  // 轴标签
  if (xLabel) {
    ctx.fillStyle = textColor;
    ctx.font = `600 ${Math.max(10, Math.round(12 * fs))}px "Noto Sans SC", system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(xLabel, x + width, y + tickLength + fontSize + 4);
  }

  if (yLabel) {
    ctx.fillStyle = textColor;
    ctx.font = `600 ${Math.max(10, Math.round(12 * fs))}px "Noto Sans SC", system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(yLabel, x - tickLength - 3, y - height);
  }

  ctx.restore();
}

/**
 * 生成美观的刻度值
 */
function niceTicks(min: number, max: number, count: number): number[] {
  const range = max - min;
  if (range === 0) return [min];

  const roughStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;

  let step: number;
  if (norm <= 1) step = mag;
  else if (norm <= 2) step = 2 * mag;
  else if (norm <= 5) step = 5 * mag;
  else step = 10 * mag;

  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) {
    if (v >= min - 1e-9) ticks.push(v);
  }
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) < 0.001) return '0';
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

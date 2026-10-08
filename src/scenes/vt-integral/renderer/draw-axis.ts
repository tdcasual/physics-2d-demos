import type { DrawContext, AxisConfig } from './types';
import { FONT_FAMILY, resolveTypeScale } from './palette';

/** 坐标轴字号 / 刻度长 / 箭头尺寸（布局预留与绘制共用同一来源） */
export function axisMetrics(context: DrawContext) {
  const t = resolveTypeScale(context.responsiveScale, context.contentScale);
  return {
    lineWidth: t.minorStroke,
    tickLength: Math.max(4, t.marker * 0.55),
    fontSize: t.tickPx,
    labelSize: t.labelPx,
    arrowSize: Math.max(5, t.marker * 0.7)
  };
}

/** y 刻度标签最大宽度 + 刻度长 + 间隙：绘图区左侧需要预留的宽度 */
export function measureYGutter(
  context: DrawContext,
  yMin: number,
  yMax: number
): number {
  const { ctx } = context;
  const m = axisMetrics(context);
  ctx.save();
  ctx.font = `${m.fontSize}px ${FONT_FAMILY}`;
  let widest = 0;
  for (const ty of niceTicks(yMin, yMax, 5)) {
    widest = Math.max(widest, ctx.measureText(formatTick(ty)).width);
  }
  ctx.restore();
  return widest + m.tickLength + 3 + m.fontSize * 0.4;
}

/** x 末刻度标签半宽：绘图区右侧需要预留的宽度 */
export function measureXOverhang(context: DrawContext, xMax: number): number {
  const { ctx } = context;
  const m = axisMetrics(context);
  ctx.save();
  ctx.font = `${m.fontSize}px ${FONT_FAMILY}`;
  const w = ctx.measureText(formatTick(xMax)).width;
  ctx.restore();
  return Math.max(w * 0.5, m.arrowSize);
}

/** 轴下方需要预留的高度（刻度 + 刻度标签 + x 轴名一行） */
export function axisBottomReserve(context: DrawContext): number {
  const m = axisMetrics(context);
  return m.tickLength + m.fontSize + 4 + m.labelSize * 1.3;
}

/** 轴上方需要预留的高度（y 轴名位于箭头右侧，与箭头顶端齐平） */
export function axisTopReserve(context: DrawContext): number {
  const m = axisMetrics(context);
  return m.arrowSize + m.labelSize * 0.6;
}

/**
 * 绘制带箭头、刻度、标签的坐标轴
 *
 * y 轴名左对齐画在箭头右侧（而非刻度列左侧），窄画布下不会被裁出画布。
 */
export function drawAxis(context: DrawContext, config: AxisConfig): void {
  const { ctx, theme } = context;
  const { x, y, width, height, xMin, xMax, yMin, yMax, xLabel, yLabel } =
    config;

  const isDark = theme === 'dark';
  const axisColor = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(71,85,105,0.6)';
  const tickColor = isDark ? 'rgba(226,232,240,0.4)' : 'rgba(71,85,105,0.4)';
  const textColor = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.7)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const { lineWidth, tickLength, fontSize, labelSize, arrowSize } =
    axisMetrics(context);

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
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
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
    ctx.font = `600 ${labelSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(xLabel, x + width, y + tickLength + fontSize + 4);
  }

  if (yLabel) {
    ctx.fillStyle = textColor;
    ctx.font = `600 ${labelSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel, x + arrowSize, y - height + arrowSize * 0.35);
  }

  ctx.restore();
}

/**
 * 生成美观的刻度值
 */
export function niceTicks(min: number, max: number, count: number): number[] {
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

export function formatTick(v: number): string {
  if (Math.abs(v) < 0.001) return '0';
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

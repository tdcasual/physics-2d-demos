/**
 * Canvas 绘制原语
 * 提供标准化的网格、数据面板、轨迹、球体、矢量等绘制函数
 */

import { Colors, alpha } from './colors';
import type { GridOptions } from './canvas-sizing-utils';

/**
 * 绘制标准化网格
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: GridOptions = {},
  isDark: boolean = false
): void {
  const {
    originX = 60,
    originY = height - 60,
    showGrid = true,
    showAxes = true,
    gridColor = isDark
      ? alpha(Colors.gray, 0.15)
      : alpha(Colors.grayLight, 0.5),
    axisColor = isDark ? Colors.mintLight : Colors.mint
  } = options;

  ctx.save();

  // 绘制背景
  ctx.fillStyle = isDark ? Colors.darkBg : Colors.bg;
  ctx.fillRect(0, 0, width, height);

  if (showGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // 垂直网格线（上下两个方向）
    for (let x = originX; x < width - 20; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
    }

    // 水平网格线（上下两个方向）
    // 向上绘制
    for (let y = originY; y > 20; y -= 50) {
      ctx.beginPath();
      ctx.moveTo(originX, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }
    // 向下绘制
    for (let y = originY; y < height - 20; y += 50) {
      ctx.beginPath();
      ctx.moveTo(originX, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }
  }

  if (showAxes) {
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;

    // Y轴（完整垂直线，上下两个方向）
    ctx.beginPath();
    ctx.moveTo(originX, 20);
    ctx.lineTo(originX, height - 20);
    ctx.stroke();

    // X轴（水平线）
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - 20, originY);
    ctx.stroke();

    // 箭头
    ctx.fillStyle = axisColor;
    // X轴箭头（向右）
    ctx.beginPath();
    ctx.moveTo(width - 20, originY);
    ctx.lineTo(width - 30, originY - 5);
    ctx.lineTo(width - 30, originY + 5);
    ctx.fill();
    // Y轴箭头（向上）
    ctx.beginPath();
    ctx.moveTo(originX, 20);
    ctx.lineTo(originX - 5, 30);
    ctx.lineTo(originX + 5, 30);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 绘制数据面板
 */
export function drawDataPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  items: Array<{ label: string; value: string }>,
  isDark: boolean = false
): void {
  const lineHeight = 28;
  const padding = 16;
  const maxLabelWidth = Math.max(...items.map((i) => i.label.length)) * 14;
  const maxValueWidth = Math.max(...items.map((i) => i.value.length)) * 10;
  const panelWidth = maxLabelWidth + maxValueWidth + padding * 3;
  const panelHeight = items.length * lineHeight + padding * 2;

  ctx.save();

  // 面板背景
  ctx.fillStyle = isDark
    ? alpha(Colors.darkCard, 0.9)
    : alpha(Colors.white, 0.95);
  ctx.strokeStyle = isDark
    ? alpha(Colors.coral, 0.3)
    : alpha(Colors.coral, 0.2);
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, panelWidth, panelHeight, 12);
  ctx.fill();
  ctx.stroke();

  // 文字
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  items.forEach((item, index) => {
    const itemY = y + padding + index * lineHeight + lineHeight / 2;

    // 标签
    ctx.font = '500 14px Satoshi, Noto Sans SC, sans-serif';
    ctx.fillStyle = isDark ? Colors.gray : Colors.gray;
    ctx.fillText(item.label, x + padding, itemY);

    // 值
    ctx.font = '600 14px Satoshi, Noto Sans SC, sans-serif';
    ctx.fillStyle = Colors.coral;
    ctx.fillText(item.value, x + padding + maxLabelWidth + 16, itemY);
  });

  ctx.restore();
}

/**
 * 绘制轨迹点
 */
export function drawTrail(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string = Colors.coral,
  lineWidth: number = 3
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制高亮小球
 */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number = 8,
  color: string = Colors.coral
): void {
  ctx.save();

  // 发光效果
  ctx.shadowColor = alpha(color, 0.5);
  ctx.shadowBlur = 15;

  // 球体
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 高光
  ctx.shadowBlur = 0;
  ctx.fillStyle = alpha(Colors.white, 0.4);
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 绘制矢量箭头
 */
export function drawVector(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string = Colors.mint,
  lineWidth: number = 3
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  // 线
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // 箭头
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLength = 12;
  const arrowAngle = Math.PI / 6;

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLength * Math.cos(angle - arrowAngle),
    toY - arrowLength * Math.sin(angle - arrowAngle)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLength * Math.cos(angle + arrowAngle),
    toY - arrowLength * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();

  ctx.restore();
}

/**
 * Canvas 绘制原语
 * 提供标准化的网格、轨迹、球体等绘制函数
 */

import { Colors, alpha } from './colors';
import type { GridOptions } from './canvas-sizing';

/**
 * 箭头绘制选项
 */
export interface ArrowOptions {
  /** 箭头颜色（同时设置 strokeStyle/fillStyle）；缺省沿用 ctx 当前样式 */
  color?: string;
  /** 线宽；缺省沿用 ctx 当前 lineWidth */
  lineWidth?: number;
  /** 箭头头部尺寸（px），默认 8 */
  headSize?: number;
  /** 箭头半角（弧度），默认 π/6 */
  headAngle?: number;
  /** true 时起点也绘制箭头（双向箭头），默认 false */
  doubleEnded?: boolean;
  /** true 时头部为实心填充三角，false 为开口 V 形描边，默认 true */
  fillHead?: boolean;
}

/**
 * 绘制带箭头的线段（从 (x1,y1) 指向 (x2,y2)）
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: ArrowOptions = {}
): void {
  const {
    color,
    lineWidth,
    headSize = 8,
    headAngle = Math.PI / 6,
    doubleEnded = false,
    fillHead = true
  } = options;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  if (Math.hypot(dx, dy) < 1) return;

  ctx.save();
  if (color !== undefined) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }
  if (lineWidth !== undefined) ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  // 箭杆
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 箭头头部
  const head = (tipX: number, tipY: number, dir: number): void => {
    const wing1X = tipX - headSize * Math.cos(dir - headAngle);
    const wing1Y = tipY - headSize * Math.sin(dir - headAngle);
    const wing2X = tipX - headSize * Math.cos(dir + headAngle);
    const wing2Y = tipY - headSize * Math.sin(dir + headAngle);
    ctx.beginPath();
    if (fillHead) {
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(wing1X, wing1Y);
      ctx.lineTo(wing2X, wing2Y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(wing1X, wing1Y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(wing2X, wing2Y);
      ctx.stroke();
    }
  };

  head(x2, y2, angle);
  if (doubleEnded) head(x1, y1, angle + Math.PI);

  ctx.restore();
}

/**
 * 构建圆角矩形路径（仅建 path，fill/stroke 由调用方决定）
 * r 会被钳制到 [0, min(w,h)/2]
 */
export function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

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

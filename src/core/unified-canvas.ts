/**
 * 统一 Canvas 渲染基础设施
 * 提供标准化的网格、坐标轴、文字渲染
 */

import { Colors, alpha, getCanvasColors } from './colors';

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export interface GridOptions {
  originX?: number;
  originY?: number;
  scaleX?: number;
  scaleY?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  gridColor?: string;
  axisColor?: string;
}

/**
 * 创建标准化的 Canvas 上下文
 */
export function createCanvasContext(canvas: HTMLCanvasElement): CanvasContext {
  const ctx = canvas.getContext('2d')!;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  // 设置高DPI
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  return {
    canvas,
    ctx,
    width: rect.width,
    height: rect.height,
    dpr
  };
}

/**
 * 计算最优 Canvas 尺寸
 * 根据舞台区域自动计算最佳 Canvas 尺寸，保持适当比例
 * 
 * @param stageWidth 舞台可用宽度
 * @param stageHeight 舞台可用高度
 * @param margin 边距（默认40px）
 * @returns 推荐的 Canvas 尺寸
 */
export function getOptimalCanvasSize(
  stageWidth: number,
  stageHeight: number,
  margin: number = 40
): { width: number; height: number; scale: number } {
  const availableWidth = stageWidth - margin * 2;
  const availableHeight = stageHeight - margin * 2;
  
  // 物理演示常用的宽高比
  const ASPECT_16_9 = 16 / 9;
  const ASPECT_4_3 = 4 / 3;
  const ASPECT_1_1 = 1;
  
  // 尝试 16:9
  let width = availableWidth;
  let height = width / ASPECT_16_9;
  let usedAspect = ASPECT_16_9;
  
  if (height > availableHeight) {
    // 16:9 太高，尝试 4:3
    height = availableHeight;
    width = height * ASPECT_4_3;
    usedAspect = ASPECT_4_3;
    
    if (width > availableWidth) {
      // 4:3 太宽，使用舞台宽度
      width = availableWidth;
      height = width / ASPECT_4_3;
    }
  }
  
  // 如果舞台接近正方形，使用 1:1
  const stageAspect = stageWidth / stageHeight;
  if (stageAspect > 0.9 && stageAspect < 1.1) {
    const size = Math.min(availableWidth, availableHeight);
    width = size;
    height = size;
    usedAspect = ASPECT_1_1;
  }
  
  // 计算缩放比例（用于坐标映射）
  const scale = Math.min(width / 800, height / 600);
  
  return {
    width: Math.floor(width),
    height: Math.floor(height),
    scale: Math.max(0.5, Math.min(2, scale)) // 限制在 0.5x - 2x
  };
}

/**
 * 设置 Canvas 尺寸并处理高DPI
 * 
 * 注意：每次调整尺寸后会重置 transform 矩阵并重新缩放
 * 避免多次调用导致累积缩放
 * 
 * @param canvas Canvas 元素
 * @param width CSS 宽度（逻辑像素）
 * @param height CSS 高度（逻辑像素）
 * @param setCssSize 是否设置 CSS 尺寸（默认 true）。如果为 false，只更新内部像素尺寸
 */
export function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  setCssSize: boolean = true
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  
  // 设置CSS尺寸（如果需要）
  if (setCssSize) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  
  // 设置实际像素尺寸（考虑DPR）
  // 注意：设置 canvas.width/height 会重置 context 状态
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  
  const ctx = canvas.getContext('2d')!;
  
  // 重置 transform 矩阵并应用 DPR 缩放
  // 这确保即使多次调用也不会累积缩放
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // 重置为单位矩阵
  ctx.scale(dpr, dpr);
  
  return ctx;
}

/**
 * 根据容器自动调整 Canvas 尺寸
 * 
 * 适用于 Canvas 使用 CSS width: 100%; height: 100% 填满容器的情况
 * 只更新内部像素尺寸，不修改 CSS 尺寸
 */
export function fitCanvasToContainer(
  canvas: HTMLCanvasElement,
  container?: HTMLElement
): { width: number; height: number; ctx: CanvasRenderingContext2D } | null {
  const target = container || canvas.parentElement;
  if (!target) return null;
  
  const rect = target.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  
  const ctx = setCanvasSize(canvas, width, height, false);
  
  return { width, height, ctx };
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
    gridColor = isDark ? alpha(Colors.gray, 0.15) : alpha(Colors.grayLight, 0.5),
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
  const maxLabelWidth = Math.max(...items.map(i => i.label.length)) * 14;
  const maxValueWidth = Math.max(...items.map(i => i.value.length)) * 10;
  const panelWidth = maxLabelWidth + maxValueWidth + padding * 3;
  const panelHeight = items.length * lineHeight + padding * 2;
  
  ctx.save();
  
  // 面板背景
  ctx.fillStyle = isDark ? alpha(Colors.darkCard, 0.9) : alpha(Colors.white, 0.95);
  ctx.strokeStyle = isDark ? alpha(Colors.coral, 0.3) : alpha(Colors.coral, 0.2);
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

/**
 * Canvas 尺寸与上下文工具
 * 提供标准化的 Canvas 创建、尺寸计算和高DPI处理
 */

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
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);

  // 设置高DPI
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  return {
    canvas,
    ctx,
    width: w,
    height: h,
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

  // 尝试 16:9
  let width = availableWidth;
  let height = width / ASPECT_16_9;

  if (height > availableHeight) {
    // 16:9 太高，尝试 4:3
    height = availableHeight;
    width = height * ASPECT_4_3;

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
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置为单位矩阵
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

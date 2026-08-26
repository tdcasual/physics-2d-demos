/**
 * Canvas 尺寸策略模块
 *
 * 为物理演示场景提供标准化的 canvas 尺寸计算方案，
 * 解决移动端不同场景动画区大小不一致的问题。
 *
 * 核心策略：fill —— 填满容器（所有场景的动画区均使用 sizeCanvasToFill）。
 */

/** 尺寸计算结果 */
export interface CanvasSizingResult {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  /**
   * 响应式缩放因子，基于 canvas 短边与参考尺寸的比例。
   * 用于统一调整绘制元素大小以适配不同屏幕。
   * 范围: [0.3, 1.5]
   */
  responsiveScale: number;
}

/**
 * 计算带下限的响应式尺寸值
 *
 * 将基准值按 responsiveScale 缩放，同时确保不低于最小可读尺寸。
 * 用于字体、边距、标记半径等绘制元素。
 *
 * @param base 基准尺寸（responsiveScale=1 时的值）
 * @param responsiveScale 当前画布响应式缩放因子
 * @param min 最小允许值（默认 8px，适合最小可读字体）
 * @returns Math.max(min, base * responsiveScale)
 *
 * @example
 * const fontSize = scaledSize(10, responsiveScale, 9);  // 最小 9px
 * const margin = scaledSize(20, responsiveScale, 12);   // 最小 12px
 */
export function scaledSize(
  base: number,
  responsiveScale: number,
  min = 8
): number {
  return Math.max(min, base * responsiveScale);
}

/**
 * 计算响应式缩放因子
 *
 * 基于 canvas 短边与参考尺寸的比例，返回一个 clamp 后的 scale 值。
 * 所有场景的绘制元素大小应乘以该因子，以确保移动端不会出现过大的元素。
 *
 * @param canvasWidth  canvas CSS 宽度
 * @param canvasHeight canvas CSS 高度
 * @param referenceSize 参考短边尺寸（默认 400，兼顾桌面与移动端）
 * @returns 缩放因子，范围 [0.3, 1.5]
 *
 * @example
 * const scale = getResponsiveScale(width, height, 400);
 * const ballRadius = 20 * scale;
 */
export function getResponsiveScale(
  canvasWidth: number,
  canvasHeight: number,
  referenceSize = 400
): number {
  const shortEdge = Math.min(canvasWidth, canvasHeight);
  return Math.max(0.3, Math.min(1.5, shortEdge / referenceSize));
}

/**
 * 获取设备像素比（限制上限以避免性能问题）
 */
function getDevicePixelRatio(maxDpr = 2): number {
  return Math.min(
    maxDpr,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
}

/**
 * 填满容器尺寸计算
 *
 * Canvas 完全填满容器，无留白。
 */
function computeFillSize(
  containerWidth: number,
  containerHeight: number
): CanvasSizingResult {
  const width = Math.max(1, Math.floor(containerWidth));
  const height = Math.max(1, Math.floor(containerHeight));
  const dpr = getDevicePixelRatio();

  return {
    width: Math.floor(width * dpr),
    height: Math.floor(height * dpr),
    cssWidth: width,
    cssHeight: height,
    dpr,
    responsiveScale: getResponsiveScale(width, height)
  };
}

/**
 * 应用计算好的尺寸到 canvas
 *
 * 同时更新 CSS 尺寸和内部像素尺寸，并设置正确的 DPR 缩放。
 */
export function applyCanvasSize(
  canvas: HTMLCanvasElement,
  sizing: CanvasSizingResult
): CanvasRenderingContext2D {
  // 设置 CSS 尺寸
  const cssW = `${sizing.cssWidth}px`;
  const cssH = `${sizing.cssHeight}px`;
  if (canvas.style.width !== cssW) canvas.style.width = cssW;
  if (canvas.style.height !== cssH) canvas.style.height = cssH;

  // 暴露响应式缩放因子，供场景绘制代码读取
  if (canvas.dataset) {
    canvas.dataset.responsiveScale = String(sizing.responsiveScale);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // 只在内部像素尺寸真正变化时才赋值，避免 Canvas API 强制清空画布
  const sizeChanged =
    canvas.width !== sizing.width || canvas.height !== sizing.height;
  if (sizeChanged) {
    canvas.width = sizing.width;
    canvas.height = sizing.height;
  }

  // 重置 transform 并应用 DPR 缩放
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(sizing.dpr, sizing.dpr);

  return ctx;
}

function getSizingTarget(
  canvas: HTMLCanvasElement,
  container?: HTMLElement
): HTMLElement | null {
  if (container) return container;
  if (canvas.parentElement) return canvas.parentElement;
  // 降级：如果 canvas 没有父元素，临时附加到 body 测量
  if (typeof document !== 'undefined') {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // 使用 canvas 自身的尺寸作为容器尺寸
      return canvas;
    }
  }
  return null;
}

/**
 * 从容器元素自动计算并应用尺寸（填满策略）
 *
 * 这是所有场景动画区的标准用法：
 * ```ts
 * const ctx = sizeCanvasToFill(canvas);
 * ```
 */
export function sizeCanvasToFill(
  canvas: HTMLCanvasElement,
  container?: HTMLElement
): CanvasRenderingContext2D {
  const target = getSizingTarget(canvas, container);
  if (!target) {
    // 测试环境降级：设置一个默认尺寸
    return applyCanvasSize(canvas, {
      width: 800,
      height: 600,
      cssWidth: 800,
      cssHeight: 600,
      dpr: 1,
      responsiveScale: 1
    });
  }
  if (target === canvas) {
    // 使用 canvas 自身尺寸
    const rect = canvas.getBoundingClientRect();
    const sizing = computeFillSize(rect.width || 800, rect.height || 600);
    return applyCanvasSize(canvas, sizing);
  }
  const rect = target.getBoundingClientRect();
  const sizing = computeFillSize(rect.width, rect.height);
  return applyCanvasSize(canvas, sizing);
}

/* ==========================================================================
 * 以下为原 canvas-sizing-utils.ts 内容（已合并入本模块）
 *
 * 与上方尺寸计算的差异：
 * - 上方 API 面向"布局策略 + responsiveScale"，是场景动画区的标准用法
 * - 下方 API 面向"直接给定 CSS 尺寸"，并额外提供 grid 绘制选项类型
 * 注意：下方 setCanvasSize 使用未封顶的 window.devicePixelRatio（上方
 * getDevicePixelRatio 上限为 2），两者保持各自历史行为，不做统一以免
 * 改变渲染结果。
 * ========================================================================== */

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

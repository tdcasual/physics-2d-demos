/**
 * Canvas 尺寸策略模块
 *
 * 为物理演示场景提供标准化的 canvas 尺寸计算方案，
 * 解决移动端不同场景动画区大小不一致的问题。
 *
 * 核心策略：
 * - fill:   填满容器（适用于 field-lines, electrification 等单画布场景）
 * - fit:    保持宽高比适配容器（适用于 projectile 等需要坐标系的场景）
 * - scroll: 内容高度自适应，允许滚动（适用于 chase-meet 等多画布场景）
 */

/** 尺寸策略类型 */
export type CanvasSizingStrategy = 'fill' | 'fit' | 'scroll';

/** 尺寸计算选项 */
export interface CanvasSizingOptions {
  /** 策略类型 */
  strategy?: CanvasSizingStrategy;
  /** 目标宽高比（fit 策略下使用，默认 16/9） */
  aspectRatio?: number;
  /** 边距（fit 策略下使用，默认 0） */
  margin?: number;
  /** 最大宽度（fit 策略下使用） */
  maxWidth?: number;
  /** 最大高度（fit 策略下使用） */
  maxHeight?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
}

/** 计算结果 */
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
export function getDevicePixelRatio(maxDpr = 2): number {
  return Math.min(
    maxDpr,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
}

/**
 * 填满容器策略
 *
 * Canvas 完全填满容器，无留白。适用于电场线、电磁感应等
 * 需要最大化利用屏幕空间的场景。
 */
export function computeFillSize(
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
 * 适配容器策略
 *
 * 保持指定宽高比，在容器内最大化显示，允许留白。
 * 适用于抛体运动、振动图像等需要标准坐标系的场景。
 */
export function computeFitSize(
  containerWidth: number,
  containerHeight: number,
  options: {
    aspectRatio?: number;
    margin?: number;
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): CanvasSizingResult {
  const {
    aspectRatio = 16 / 9,
    margin = 0,
    maxWidth = Infinity,
    maxHeight = Infinity,
    minWidth = 100,
    minHeight = 80
  } = options;

  const availW = Math.max(0, containerWidth - margin * 2);
  const availH = Math.max(0, containerHeight - margin * 2);

  // 按宽高比计算
  let w = availW;
  let h = w / aspectRatio;

  if (h > availH) {
    h = availH;
    w = h * aspectRatio;
  }

  // 应用约束
  w = Math.max(minWidth, Math.min(maxWidth, w));
  h = Math.max(minHeight, Math.min(maxHeight, h));

  const cssW = Math.floor(w);
  const cssH = Math.floor(h);
  const dpr = getDevicePixelRatio();

  return {
    width: Math.floor(cssW * dpr),
    height: Math.floor(cssH * dpr),
    cssWidth: cssW,
    cssHeight: cssH,
    dpr,
    responsiveScale: getResponsiveScale(cssW, cssH)
  };
}

/**
 * 自适应滚动策略
 *
 * 宽度填满容器，高度由内容决定。适用于 chase-meet 等
 * 需要多个垂直堆叠 canvas 的场景。
 */
export function computeScrollSize(
  containerWidth: number,
  contentHeight: number
): CanvasSizingResult {
  const width = Math.max(1, Math.floor(containerWidth));
  const height = Math.max(1, Math.floor(contentHeight));
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
 * 统一尺寸计算入口
 */
export function computeCanvasSize(
  containerWidth: number,
  containerHeight: number,
  options: CanvasSizingOptions = {}
): CanvasSizingResult {
  const { strategy = 'fill' } = options;

  switch (strategy) {
    case 'fit':
      return computeFitSize(containerWidth, containerHeight, options);
    case 'scroll':
      return computeScrollSize(containerWidth, containerHeight);
    case 'fill':
    default:
      return computeFillSize(containerWidth, containerHeight);
  }
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

/**
 * 从容器元素自动计算并应用尺寸
 *
 * 这是大多数场景的推荐用法：
 * ```ts
 * const ctx = sizeCanvasToContainer(canvas, canvas.parentElement!, { strategy: 'fill' });
 * ```
 */
export function sizeCanvasToContainer(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  options: CanvasSizingOptions = {}
): CanvasRenderingContext2D {
  const rect = container.getBoundingClientRect();
  const sizing = computeCanvasSize(rect.width, rect.height, options);
  return applyCanvasSize(canvas, sizing);
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
 * 便捷函数：填满策略
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
  return sizeCanvasToContainer(canvas, target, { strategy: 'fill' });
}

/**
 * 便捷函数：适配策略
 */
export function sizeCanvasToFit(
  canvas: HTMLCanvasElement,
  aspectRatio: number,
  container?: HTMLElement,
  margin = 0
): CanvasRenderingContext2D {
  const target = getSizingTarget(canvas, container);
  if (!target) {
    const sizing = computeFitSize(800, 600, { aspectRatio, margin });
    return applyCanvasSize(canvas, sizing);
  }
  if (target === canvas) {
    const rect = canvas.getBoundingClientRect();
    const sizing = computeFitSize(rect.width || 800, rect.height || 600, {
      aspectRatio,
      margin
    });
    return applyCanvasSize(canvas, sizing);
  }
  return sizeCanvasToContainer(canvas, target, {
    strategy: 'fit',
    aspectRatio,
    margin
  });
}

/* ==========================================================================
 * 以下为原 canvas-sizing-utils.ts 内容（已合并入本模块）
 *
 * 与上方策略化尺寸计算的差异：
 * - 上方 API 面向"布局策略 + responsiveScale"，是新场景的标准用法
 * - 下方 API 面向"直接给定 CSS 尺寸 / 读取容器矩形"，并额外提供
 *   grid 绘制选项类型与 16:9/4:3 择优尺寸计算
 * 注意：下方函数使用未封顶的 window.devicePixelRatio（上方 getDevicePixelRatio
 * 上限为 2），两者保持各自历史行为，不做统一以免改变渲染结果。
 * ========================================================================== */

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

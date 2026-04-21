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
    dpr
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
    dpr
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
    dpr
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
  canvas.style.width = `${sizing.cssWidth}px`;
  canvas.style.height = `${sizing.cssHeight}px`;

  // 设置内部像素尺寸
  canvas.width = sizing.width;
  canvas.height = sizing.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
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
      dpr: 1
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

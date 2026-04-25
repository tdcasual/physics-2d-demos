/**
 * 高DPI Canvas 工具
 * 计算和应用高DPI缩放，确保Canvas在Retina屏上清晰渲染
 */

/** 高DPI Canvas 尺寸指标 */
export type HiDpiCanvasMetrics = {
  /** CSS 逻辑宽度 */
  cssWidth: number;
  /** CSS 逻辑高度 */
  cssHeight: number;
  /** 设备像素比 */
  pixelRatio: number;
  /** 实际像素宽度（cssWidth * pixelRatio） */
  backingWidth: number;
  /** 实际像素高度（cssHeight * pixelRatio） */
  backingHeight: number;
};

function sanitizeCssSize(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

/**
 * 解析并限制设备像素比
 * @param input - 原始 DPR 值
 * @returns 有效的 DPR（最小为 1）
 */
export function resolveDevicePixelRatio(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 1;
  }
  return input;
}

/**
 * 计算高DPI Canvas 尺寸指标
 * @param args - CSS 尺寸和设备像素比
 * @returns 完整的 Canvas 尺寸指标
 */
export function computeHiDpiCanvasMetrics(args: {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
}): HiDpiCanvasMetrics {
  const cssWidth = sanitizeCssSize(args.cssWidth, 1280);
  const cssHeight = sanitizeCssSize(args.cssHeight, 720);
  const pixelRatio = resolveDevicePixelRatio(args.devicePixelRatio);

  return {
    cssWidth,
    cssHeight,
    pixelRatio,
    backingWidth: Math.max(1, Math.round(cssWidth * pixelRatio)),
    backingHeight: Math.max(1, Math.round(cssHeight * pixelRatio))
  };
}

/**
 * 将高DPI尺寸指标应用到 Canvas
 * @param canvas - Canvas 元素
 * @param context - 2D 渲染上下文
 * @param metrics - 尺寸指标
 * @param responsiveScale - 响应式缩放因子（可选，自动计算）
 */
export function applyHiDpiCanvasMetrics(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  metrics: HiDpiCanvasMetrics,
  responsiveScale?: number
): void {
  canvas.width = metrics.backingWidth;
  canvas.height = metrics.backingHeight;
  const scale =
    responsiveScale ??
    Math.max(
      0.3,
      Math.min(1.5, Math.min(metrics.cssWidth, metrics.cssHeight) / 600)
    );
  canvas.dataset.responsiveScale = String(scale);
  context.setTransform(metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0);
}

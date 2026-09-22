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

/** renderBoost 允许范围：舞台 CSS zoom 清晰化钩子，缺省 1。 */
const RENDER_BOOST_MIN = 0.5;
const RENDER_BOOST_MAX = 4;

function clampRenderBoost(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(RENDER_BOOST_MAX, Math.max(RENDER_BOOST_MIN, value));
}

/**
 * 读取元素的布局尺寸（offsetWidth/offsetHeight）。
 *
 * 布局尺寸免疫祖先 CSS transform（舞台 pan/zoom 的 scale），
 * 而 getBoundingClientRect 会把 scale 算进去。offset 为 0 时回退
 * getBoundingClientRect：happy-dom 单测里 offsetWidth 常为 0，既有
 * 测试靠 mock rect，不能破坏。
 */
export function readElementLayoutSize(el: HTMLElement): {
  width: number;
  height: number;
} {
  let width = el.offsetWidth;
  let height = el.offsetHeight;
  if (width > 0 && height > 0) {
    return { width, height };
  }
  const rect = el.getBoundingClientRect();
  if (width <= 0) width = rect.width;
  if (height <= 0) height = rect.height;
  return { width, height };
}

/**
 * 读取 canvas.dataset.renderBoost（缺省 1，clamp [0.5, 4]）。
 * 未设置或非法值视为 1，保持历史 sizeCanvasToFill 行为。
 */
export function readRenderBoost(canvas: HTMLCanvasElement): number {
  const raw = canvas.dataset?.renderBoost;
  if (raw == null || raw === '') return 1;
  return clampRenderBoost(Number(raw));
}

/**
 * 写入 renderBoost 到 dataset，不改 CSS 尺寸。
 * 场景重绘仍走标准 resize 链（sizeCanvasToFill / applyCanvasSize）。
 */
export function setRenderBoost(canvas: HTMLCanvasElement, boost: number): void {
  canvas.dataset.renderBoost = String(clampRenderBoost(boost));
}

/**
 * Accumulated CSS-transform zoom acting on an element from its ancestors
 * (e.g. the data-workspace stage panzoom viewport). getBoundingClientRect
 * includes ancestor transforms while offsetWidth does not, so the ratio
 * isolates ancestor zoom. The element itself must be untransformed.
 */
export function ancestorZoomScale(el: HTMLElement): number {
  const w = el.offsetWidth;
  if (!(w > 0)) return 1;
  const k = el.getBoundingClientRect().width / w;
  return Number.isFinite(k) && k > 0 ? k : 1;
}

/**
 * 沿 composed 树向上找最近的 [data-stage-zoom]（stage panzoom 写在
 * .stage-viewport 上），缺省 1。parentElement 到顶后若根是 open
 * ShadowRoot 则跳到 host 继续攀；文档根/游离节点返回 1。找到属性但
 * 值非法或 ≤0 时降级 1。只读属性、不测量元素，无强制布局。
 */
export function stageZoomOf(el: Element): number {
  let node: Element | null = el;
  while (node) {
    if (node instanceof HTMLElement) {
      const raw = node.dataset.stageZoom;
      if (raw !== undefined) {
        const k = Number(raw);
        return Number.isFinite(k) && k > 0 ? k : 1;
      }
    }
    let next: Element | null = node.parentElement;
    if (!next) {
      const root = node.getRootNode();
      next = root instanceof ShadowRoot ? root.host : null;
    }
    node = next;
  }
  return 1;
}

/**
 * 屏幕指针 delta → 舞台局部坐标 delta（除以 stage zoom k）。
 * el 必须是拖拽闭包内的稳定节点（slider/systemEl/被拖元素本身），
 * 禁止用 document 级 move 事件的 target——指针可能已移到 chrome 上。
 */
export function localPointerDelta(
  el: Element,
  dx: number,
  dy: number
): { dx: number; dy: number } {
  const k = stageZoomOf(el);
  return { dx: dx / k, dy: dy / k };
}

/**
 * 应用计算好的尺寸到 canvas
 *
 * 同时更新 CSS 尺寸和内部像素尺寸，并设置正确的 DPR 缩放。
 * dataset.renderBoost（缺省 1）放大背衬与 ctx.scale，responsiveScale
 * 仍按 CSS 尺寸计算，场景绘制代码无需改动。
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

  const boost = readRenderBoost(canvas);
  const backingWidth = Math.max(1, Math.round(sizing.width * boost));
  const backingHeight = Math.max(1, Math.round(sizing.height * boost));

  // 只在内部像素尺寸真正变化时才赋值，避免 Canvas API 强制清空画布
  const sizeChanged =
    canvas.width !== backingWidth || canvas.height !== backingHeight;
  if (sizeChanged) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  // 重置 transform 并应用 DPR × boost 缩放
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(sizing.dpr * boost, sizing.dpr * boost);

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
 * 容器尺寸取布局盒（offsetWidth/offsetHeight），免疫祖先 CSS
 * transform；canvas.style.width/height 始终写成该未放大布局值。
 * renderBoost 只放大背衬与 ctx.scale，不改 CSS。
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
  const size = readElementLayoutSize(target);
  if (target === canvas) {
    // 使用 canvas 自身布局尺寸（无父元素时）
    const sizing = computeFillSize(size.width || 800, size.height || 600);
    return applyCanvasSize(canvas, sizing);
  }
  const sizing = computeFillSize(size.width, size.height);
  return applyCanvasSize(canvas, sizing);
}

/* ==========================================================================
 * 以下为原 canvas-sizing-utils.ts 内容（已合并入本模块）
 *
 * 与上方尺寸计算的差异：
 * - 上方 API 面向"布局策略 + responsiveScale"，是场景动画区的标准用法
 * - 下方 API 面向"直接给定 CSS 尺寸"，并额外提供 grid 绘制选项类型
 * 注意：下方 setCanvasSize 的 DPR 默认同样封顶 2（与上方
 * getDevicePixelRatio 一致），可通过 maxDpr 参数调整。
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
 * @param maxDpr DPR 上限（默认 2，与 sizeCanvasToFill 一致；高分屏防像素量爆炸）
 */
export function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  setCssSize: boolean = true,
  maxDpr: number = 2
): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

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

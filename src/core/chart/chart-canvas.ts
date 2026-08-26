/**
 * ChartCanvas - 高DPI自适应图表Canvas基座
 *
 * 特性：
 * 1. 自动监听容器尺寸变化（ResizeObserver），实时更新 backing store
 * 2. 内置 devicePixelRatio 缩放，逻辑坐标与CSS像素1:1对应
 * 3. 提供物理像素级细线（hairline）支持
 * 4. 防止"变形"：确保 canvas.width/height 始终与 CSS 显示尺寸保持 DPR 比例
 */

import { getResponsiveScale, setCanvasSize } from '../canvas-sizing';

export interface ChartCanvasOptions {
  container: HTMLElement;
  /**
   * 是否自动创建 canvas 元素。
   * 如果为 false，则需要在 container 内预先放置 canvas 元素
   */
  autoCreate?: boolean;
  /**
   * 初始 CSS 宽度（仅在 autoCreate 时有效）
   */
  width?: number;
  /**
   * 初始 CSS 高度（仅在 autoCreate 时有效）
   */
  height?: number;
}

export interface ChartCanvasState {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly dpr: number;
  /**
   * 1物理像素对应的线宽，用于绘制清晰细线
   */
  readonly hairlineWidth: number;
}

export type ChartResizeCallback = (state: ChartCanvasState) => void;

export function createChartCanvas(
  options: ChartCanvasOptions,
  onResize?: ChartResizeCallback
): { state: ChartCanvasState; dispose: () => void } {
  const { container, autoCreate = true } = options;

  let canvas: HTMLCanvasElement;
  if (autoCreate) {
    canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
  } else {
    const existing = container.querySelector('canvas');
    if (!existing) {
      throw new Error(
        '[ChartCanvas] No canvas found in container and autoCreate is false'
      );
    }
    canvas = existing as HTMLCanvasElement;
  }

  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('[ChartCanvas] Failed to get 2d context');
  }

  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;

  function updateSize(): void {
    const rect = container.getBoundingClientRect();
    const newWidth = Math.max(1, Math.floor(rect.width));
    const newHeight = Math.max(1, Math.floor(rect.height));

    if (newWidth !== cssWidth || newHeight !== cssHeight) {
      cssWidth = newWidth;
      cssHeight = newHeight;
      setCanvasSize(canvas, cssWidth, cssHeight, false);
      canvas.dataset.responsiveScale = String(
        getResponsiveScale(cssWidth, cssHeight)
      );
      dpr = window.devicePixelRatio || 1;
      onResize?.(getState());
    }
  }

  function getState(): ChartCanvasState {
    return {
      canvas,
      ctx,
      cssWidth,
      cssHeight,
      dpr,
      hairlineWidth: 1 / Math.max(1, dpr)
    };
  }

  // 初始尺寸
  updateSize();

  // ResizeObserver 监听容器变化（比 window.resize 更精准）
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => updateSize());
    ro.observe(container);
  } else {
    window.addEventListener('resize', updateSize);
  }

  function dispose(): void {
    ro?.disconnect();
    if (!ro) {
      window.removeEventListener('resize', updateSize);
    }
    if (autoCreate && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  return { state: getState(), dispose };
}

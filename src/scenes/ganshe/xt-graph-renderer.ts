/**
 * X-t 图表渲染器
 *
 * 独立渲染器，每个观察点一个实例。
 * 支持 ResizeObserver 自动重绘、主题切换。
 */

import type { ObserverData, WaveParams } from './scene.sim';
import { sizeCanvasToFill, scaledSize } from '../../core/canvas-sizing';

export type XtGraphRenderer = {
  render(observer: ObserverData, time: number, params: WaveParams): void;
  resize(): void;
  setTheme(newTheme: 'light' | 'dark'): void;
  dispose(): void;
};

export function createXtGraphRenderer(
  canvas: HTMLCanvasElement,
  options: { theme?: 'light' | 'dark'; title?: string; color?: string } = {}
): XtGraphRenderer {
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: 'light' | 'dark' = options.theme ?? 'light';
  let width = 0;
  let height = 0;
  let responsiveScale = 1;
  const color = options.color ?? '#8b5cf6';
  const title = options.title ?? '观察点振动历史';

  // Cache last render args for auto-repaint after resize
  let lastObserver: ObserverData | null = null;
  let lastTime = 0;
  let lastParams: WaveParams | null = null;

  // 静态层（背景/网格/轴/刻度/标题）离屏缓存：
  // 内容只依赖 (width, height, 设备像素尺寸, responsiveScale, theme, maxAmp, title)，
  // cache-miss 帧直绘主画布后按设备像素 1:1 快照进离屏 canvas，
  // cache-hit 帧直接 blit 回主画布，每帧只重画折线与当前点。
  let staticCanvas: HTMLCanvasElement | null = null;
  let cachedStaticKey: string | null = null;

  function resize(): void {
    const oldWidth = width;
    const oldHeight = height;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;

    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');

    // Auto-repaint if size changed and we have cached data
    if (
      (width !== oldWidth || height !== oldHeight) &&
      lastObserver &&
      lastParams
    ) {
      render(lastObserver, lastTime, lastParams);
    }
  }

  // Use ResizeObserver to refresh canvas size when container layout stabilizes
  const resizeObserver =
    typeof ResizeObserver !== 'undefined' && canvas.parentElement
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width: cw, height: ch } = entry.contentRect;
            if (cw > 1 && ch > 1) {
              resize();
            }
          }
        })
      : null;
  if (resizeObserver && canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement);
  }

  function getColors() {
    const isDark = theme === 'dark';
    return {
      bg: isDark ? '#0f172a' : '#ffffff',
      grid: isDark ? '#1e293b' : '#f3f4f6',
      axis: isDark ? '#94a3b8' : '#374151',
      label: isDark ? '#cbd5e1' : '#6b7280',
      text: isDark ? '#e2e8f0' : '#1f2937'
    };
  }

  /** 图表时间窗口（秒）：曲线在屏幕上保留的时间跨度 */
  const TIME_WINDOW = 30;

  /** 静态层与动态层共用的几何布局 */
  type GraphLayout = {
    plotTop: number;
    plotHeight: number;
    plotBottom: number;
    plotLeft: number;
    plotRight: number;
    plotWidth: number;
    zeroY: number;
    sy: number;
  };

  function computeLayout(maxAmp: number): GraphLayout {
    const marginTop = 20 * responsiveScale;
    const marginBottom = 22 * responsiveScale;
    const marginLeft = 36 * responsiveScale;
    const marginRight = 10 * responsiveScale;
    const plotTop = marginTop;
    const plotHeight = Math.max(40, height - marginTop - marginBottom);
    const plotBottom = plotTop + plotHeight;
    const plotLeft = marginLeft;
    const plotRight = width - marginRight;
    const plotWidth = plotRight - plotLeft;
    const zeroY = plotTop + plotHeight / 2;
    const sy = (plotHeight / 2 - 8) / maxAmp;
    return {
      plotTop,
      plotHeight,
      plotBottom,
      plotLeft,
      plotRight,
      plotWidth,
      zeroY,
      sy
    };
  }

  /**
   * 静态层：背景、标题、网格、坐标轴、刻度与轴标签。
   * 只依赖 (width, height, dpr, responsiveScale, theme, maxAmp, title)，
   * 不依赖 observer/time，可整层缓存。
   */
  function drawStaticLayer(
    c: CanvasRenderingContext2D,
    colors: ReturnType<typeof getColors>,
    layout: GraphLayout,
    maxAmp: number
  ): void {
    const {
      plotTop,
      plotHeight,
      plotBottom,
      plotLeft,
      plotRight,
      plotWidth,
      zeroY,
      sy
    } = layout;
    const w = width;
    const h = height;

    // Background
    c.fillStyle = colors.bg;
    c.fillRect(0, 0, w, h);

    // Header: title + chart type label
    c.fillStyle = colors.label;
    c.font = `bold ${scaledSize(10, responsiveScale, 9)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText(title, plotLeft, scaledSize(14, responsiveScale, 14));
    c.font = `${scaledSize(9, responsiveScale, 8)}px sans-serif`;
    c.fillStyle = colors.text;
    c.fillText(
      'y-t 图',
      plotLeft + c.measureText(title).width + scaledSize(6, responsiveScale, 6),
      scaledSize(14, responsiveScale, 14)
    );

    // Grid (vertical time lines)
    c.strokeStyle = colors.grid;
    c.lineWidth = 1;
    const gridStep = TIME_WINDOW / 10;
    for (let t = 0; t <= TIME_WINDOW; t += gridStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      c.beginPath();
      c.moveTo(x, plotTop);
      c.lineTo(x, plotBottom);
      c.stroke();
    }

    // Zero line (dashed)
    c.strokeStyle = colors.axis;
    c.lineWidth = 1;
    c.setLineDash([4 * responsiveScale, 3 * responsiveScale]);
    c.beginPath();
    c.moveTo(plotLeft, zeroY);
    c.lineTo(plotRight, zeroY);
    c.stroke();
    c.setLineDash([]);

    // Horizontal axis (time axis)
    c.strokeStyle = colors.axis;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(plotLeft, plotBottom);
    c.lineTo(plotRight, plotBottom);
    c.stroke();

    // Vertical axis (displacement axis)
    c.beginPath();
    c.moveTo(plotLeft, plotTop);
    c.lineTo(plotLeft, plotBottom);
    c.stroke();

    // ----- Axis labels and ticks -----
    c.fillStyle = colors.label;
    c.font = `${scaledSize(8, responsiveScale, 8)}px sans-serif`;

    // Horizontal axis ticks & labels
    c.textAlign = 'center';
    c.strokeStyle = colors.axis;
    c.lineWidth = 1;
    const timeMajorStep = 10;
    const timeMinorStep = 5;

    // Minor ticks every 5s
    for (let t = 0; t <= TIME_WINDOW; t += timeMinorStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      c.beginPath();
      c.moveTo(x, plotBottom);
      c.lineTo(x, plotBottom + scaledSize(3, responsiveScale, 3));
      c.stroke();
    }

    // Major labels every 10s
    for (let t = 0; t <= TIME_WINDOW; t += timeMajorStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      c.fillText(`-${t}`, x, plotBottom + scaledSize(12, responsiveScale, 12));
    }

    // Horizontal axis label
    c.fillText(
      't / s',
      plotRight - scaledSize(12, responsiveScale, 12),
      plotBottom + scaledSize(12, responsiveScale, 12)
    );

    // Vertical axis ticks & labels
    c.textAlign = 'right';
    const yTicks = [maxAmp, maxAmp / 2, 0, -maxAmp / 2, -maxAmp];
    yTicks.forEach((val) => {
      const y = zeroY - val * sy;
      if (y < plotTop - 2 || y > plotBottom + 2) return;

      // Tick mark
      c.beginPath();
      c.moveTo(plotLeft, y);
      c.lineTo(plotLeft - scaledSize(3, responsiveScale, 3), y);
      c.stroke();

      // Label
      c.fillText(
        val.toFixed(0),
        plotLeft - scaledSize(5, responsiveScale, 5),
        y + scaledSize(3, responsiveScale, 3)
      );
    });

    // Vertical axis label
    c.save();
    c.translate(scaledSize(10, responsiveScale, 10), plotTop + plotHeight / 2);
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.fillText('y / cm', 0, 0);
    c.restore();

    c.textAlign = 'left';
  }

  /**
   * 动态层：位移折线 + 当前点标记。每帧必须重画，依赖 observer/time。
   * 保持不含 fill()/arc() 之外的静态层绘制调用，以便与静态层叠加后
   * 与旧版逐帧全量绘制逐像素一致。
   */
  function drawDynamicLayer(
    c: CanvasRenderingContext2D,
    observer: ObserverData,
    time: number,
    layout: GraphLayout
  ): void {
    const { plotRight, plotWidth, zeroY, sy } = layout;

    // Displacement curve
    if (observer.history.length > 1) {
      c.strokeStyle = color;
      c.lineWidth = 1.5 * responsiveScale;
      c.beginPath();

      let hasMoved = false;
      for (let i = observer.history.length - 1; i >= 0; i--) {
        const point = observer.history[i];
        const dt = time - point.t;
        if (dt > TIME_WINDOW) break;
        const x = plotRight - (dt / TIME_WINDOW) * plotWidth;
        const y = zeroY - point.y * sy;

        if (!hasMoved) {
          c.moveTo(x, y);
          hasMoved = true;
        } else {
          c.lineTo(x, y);
        }
      }
      c.stroke();
    }

    // Current point (always show, even when paused/history is empty)
    const currY =
      observer.history.length > 0
        ? observer.history[observer.history.length - 1].y
        : observer.interference.ySum;
    const cx = plotRight - 3;
    const cy = zeroY - currY * sy;
    const markerRadius = scaledSize(4, responsiveScale, 3);
    const innerRadius = scaledSize(2.5, responsiveScale, 2);

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx, cy, markerRadius, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = color;
    c.beginPath();
    c.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    c.fill();

    // When history is empty, draw a small vertical indicator line for visibility
    if (observer.history.length === 0) {
      c.strokeStyle = color;
      c.globalAlpha = 0.5;
      c.lineWidth = scaledSize(1, responsiveScale, 1);
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx, zeroY);
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  /** 主画布静态层 → 离屏快照（设备像素 1:1 拷贝） */
  function snapshotStaticLayer(): boolean {
    if (!staticCanvas) staticCanvas = document.createElement('canvas');
    if (staticCanvas.width !== canvas.width) staticCanvas.width = canvas.width;
    if (staticCanvas.height !== canvas.height)
      staticCanvas.height = canvas.height;
    const octx = staticCanvas.getContext('2d');
    if (!octx) return false;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.drawImage(canvas, 0, 0);
    return true;
  }

  /** 离屏静态层 → 主画布（identity transform + 原点对齐，设备像素 1:1，无重采样） */
  function blitStaticLayer(c: CanvasRenderingContext2D): void {
    if (!staticCanvas) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(staticCanvas, 0, 0);
    c.restore();
  }

  function render(
    observer: ObserverData,
    time: number,
    params: WaveParams
  ): void {
    lastObserver = observer;
    lastTime = time;
    lastParams = params;

    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx || width === 0 || height === 0) return;
    }
    const c = ctx;

    const colors = getColors();
    const maxAmp = Math.max(params.amp1 + params.amp2, 10);
    const layout = computeLayout(maxAmp);

    // key 覆盖静态层的全部输入：CSS 尺寸、设备像素尺寸（dpr）、
    // responsiveScale、主题、纵轴量程与标题
    const staticKey = [
      width,
      height,
      canvas.width,
      canvas.height,
      responsiveScale,
      theme,
      maxAmp,
      title
    ].join('|');

    if (staticKey !== cachedStaticKey) {
      // cache-miss：直绘主画布（与不缓存的旧行为逐像素一致），随后快照
      drawStaticLayer(c, colors, layout, maxAmp);
      cachedStaticKey = snapshotStaticLayer() ? staticKey : null;
    } else {
      blitStaticLayer(c);
    }

    drawDynamicLayer(c, observer, time, layout);
  }

  function setTheme(newTheme: 'light' | 'dark'): void {
    theme = newTheme;
  }

  function dispose(): void {
    resizeObserver?.disconnect();
    staticCanvas = null;
    cachedStaticKey = null;
    ctx = null;
  }

  resize();

  return { render, resize, setTheme, dispose };
}

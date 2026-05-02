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
    if ((width !== oldWidth || height !== oldHeight) && lastObserver && lastParams) {
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

  function render(observer: ObserverData, time: number, params: WaveParams): void {
    lastObserver = observer;
    lastTime = time;
    lastParams = params;

    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx || width === 0 || height === 0) return;
    }

    const colors = getColors();
    const h = height;
    const w = width;

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Layout margins
    const marginTop = 20 * responsiveScale;
    const marginBottom = 22 * responsiveScale;
    const marginLeft = 36 * responsiveScale;
    const marginRight = 10 * responsiveScale;
    const plotTop = marginTop;
    const plotHeight = Math.max(40, h - marginTop - marginBottom);
    const plotBottom = plotTop + plotHeight;
    const plotLeft = marginLeft;
    const plotRight = w - marginRight;
    const plotWidth = plotRight - plotLeft;

    // Header: title + chart type label
    ctx.fillStyle = colors.label;
    ctx.font = `bold ${scaledSize(10, responsiveScale, 9)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(title, plotLeft, scaledSize(14, responsiveScale, 14));
    ctx.font = `${scaledSize(9, responsiveScale, 8)}px sans-serif`;
    ctx.fillStyle = colors.text;
    ctx.fillText(
      'y-t 图',
      plotLeft + ctx.measureText(title).width + scaledSize(6, responsiveScale, 6),
      scaledSize(14, responsiveScale, 14)
    );

    const maxAmp = Math.max(params.amp1 + params.amp2, 10);
    const sy = (plotHeight / 2 - 8) / maxAmp;

    // Grid (vertical time lines)
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    const gridStep = TIME_WINDOW / 10;
    for (let t = 0; t <= TIME_WINDOW; t += gridStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, plotTop);
      ctx.lineTo(x, plotBottom);
      ctx.stroke();
    }

    // Zero line (dashed)
    const zeroY = plotTop + plotHeight / 2;
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * responsiveScale, 3 * responsiveScale]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, zeroY);
    ctx.lineTo(plotRight, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal axis (time axis)
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    // Vertical axis (displacement axis)
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotBottom);
    ctx.stroke();

    // Displacement curve
    if (observer.history.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * responsiveScale;
      ctx.beginPath();

      let hasMoved = false;
      for (let i = observer.history.length - 1; i >= 0; i--) {
        const point = observer.history[i];
        const dt = time - point.t;
        if (dt > TIME_WINDOW) break;
        const x = plotRight - (dt / TIME_WINDOW) * plotWidth;
        const y = zeroY - point.y * sy;

        if (!hasMoved) {
          ctx.moveTo(x, y);
          hasMoved = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Current point (always show, even when paused/history is empty)
    const currY = observer.history.length > 0
      ? observer.history[observer.history.length - 1].y
      : observer.interference.ySum;
    const cx = plotRight - 3;
    const cy = zeroY - currY * sy;
    const markerRadius = scaledSize(4, responsiveScale, 3);
    const innerRadius = scaledSize(2.5, responsiveScale, 2);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // When history is empty, draw a small vertical indicator line for visibility
    if (observer.history.length === 0) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = scaledSize(1, responsiveScale, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, zeroY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ----- Axis labels and ticks -----
    ctx.fillStyle = colors.label;
    ctx.font = `${scaledSize(8, responsiveScale, 8)}px sans-serif`;

    // Horizontal axis ticks & labels
    ctx.textAlign = 'center';
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1;
    const timeMajorStep = 10;
    const timeMinorStep = 5;

    // Minor ticks every 5s
    for (let t = 0; t <= TIME_WINDOW; t += timeMinorStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, plotBottom);
      ctx.lineTo(x, plotBottom + scaledSize(3, responsiveScale, 3));
      ctx.stroke();
    }

    // Major labels every 10s
    for (let t = 0; t <= TIME_WINDOW; t += timeMajorStep) {
      const x = plotRight - (t / TIME_WINDOW) * plotWidth;
      ctx.fillText(`-${t}`, x, plotBottom + scaledSize(12, responsiveScale, 12));
    }

    // Horizontal axis label
    ctx.fillText('t / s', plotRight - scaledSize(12, responsiveScale, 12), plotBottom + scaledSize(12, responsiveScale, 12));

    // Vertical axis ticks & labels
    ctx.textAlign = 'right';
    const yTicks = [maxAmp, maxAmp / 2, 0, -maxAmp / 2, -maxAmp];
    const c = ctx; // local ref for lambda null-safety
    yTicks.forEach((val) => {
      const y = zeroY - val * sy;
      if (y < plotTop - 2 || y > plotBottom + 2) return;

      // Tick mark
      c.beginPath();
      c.moveTo(plotLeft, y);
      c.lineTo(plotLeft - scaledSize(3, responsiveScale, 3), y);
      c.stroke();

      // Label
      c.fillText(val.toFixed(0), plotLeft - scaledSize(5, responsiveScale, 5), y + scaledSize(3, responsiveScale, 3));
    });

    // Vertical axis label
    ctx.save();
    ctx.translate(scaledSize(10, responsiveScale, 10), plotTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('y / cm', 0, 0);
    ctx.restore();

    ctx.textAlign = 'left';
  }

  function setTheme(newTheme: 'light' | 'dark'): void {
    theme = newTheme;
  }

  function dispose(): void {
    resizeObserver?.disconnect();
    ctx = null;
  }

  resize();

  return { render, resize, setTheme, dispose };
}

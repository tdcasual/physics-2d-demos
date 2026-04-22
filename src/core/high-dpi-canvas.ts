export type HiDpiCanvasMetrics = {
  cssWidth: number;
  cssHeight: number;
  pixelRatio: number;
  backingWidth: number;
  backingHeight: number;
};

function sanitizeCssSize(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

export function resolveDevicePixelRatio(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 1;
  }
  return input;
}

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

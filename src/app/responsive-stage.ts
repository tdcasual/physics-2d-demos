export type ResponsiveViewport = {
  width: number;
  height: number;
  isNarrow: boolean;
};

function getViewportWidth(): number {
  const vv = window.visualViewport?.width;
  if (typeof vv === 'number' && Number.isFinite(vv) && vv > 0) {
    return vv;
  }
  return window.innerWidth;
}

function getViewportHeight(): number {
  const vv = window.visualViewport?.height;
  if (typeof vv === 'number' && Number.isFinite(vv) && vv > 0) {
    return vv;
  }
  return window.innerHeight;
}

export function getResponsiveViewport(narrowBreakpointPx = 1180): ResponsiveViewport {
  const width = Math.max(1, Math.floor(getViewportWidth()));
  const height = Math.max(1, Math.floor(getViewportHeight()));
  return {
    width,
    height,
    isNarrow: width <= narrowBreakpointPx
  };
}

export function resolveResponsiveStageWidth(
  host: HTMLElement,
  options: {
    minWidthPx?: number;
    horizontalPaddingPx?: number;
    narrowBreakpointPx?: number;
  } = {}
): number {
  const minWidthPx = options.minWidthPx ?? 320;
  const horizontalPaddingPx = options.horizontalPaddingPx ?? 16;
  const viewport = getResponsiveViewport(options.narrowBreakpointPx);
  const hostWidth = Math.floor(host.clientWidth || host.getBoundingClientRect().width || viewport.width);
  return Math.max(minWidthPx, Math.min(hostWidth - horizontalPaddingPx, viewport.width - horizontalPaddingPx));
}

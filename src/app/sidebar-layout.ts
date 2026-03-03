export function clampSidebarWidth(widthPx: number, minPx: number, maxPx: number): number {
  if (!Number.isFinite(widthPx)) return minPx;
  return Math.round(Math.min(maxPx, Math.max(minPx, widthPx)));
}

export function getDefaultSidebarWidth(viewportWidthPx: number, minPx: number, maxPx: number): number {
  return clampSidebarWidth(viewportWidthPx * 0.34, minPx, maxPx);
}

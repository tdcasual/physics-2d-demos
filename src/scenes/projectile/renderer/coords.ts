import type { CoordSystem, WorldPoint, ScreenPoint } from './types';

/**
 * 构建坐标系：根据画布尺寸和物理世界边界计算原点与缩放比例
 */
export function buildCoordSystem(
  width: number,
  height: number,
  responsiveScale: number,
  maxX: number,
  maxY: number
): CoordSystem {
  const marginX = Math.max(40, 60 * responsiveScale);
  const marginY = Math.max(30, 50 * responsiveScale);

  const originX = marginX;
  const originY = height - marginY;

  const availableW = width - originX - marginX;
  const availableH = originY - marginY;

  const scaleX = availableW / Math.max(maxX, 1);
  const scaleY = availableH / Math.max(maxY, 1);
  const scale = Math.min(scaleX, scaleY);

  return { originX, originY, scale };
}

/**
 * 世界坐标 → 屏幕坐标
 */
export function worldToScreen(
  world: WorldPoint,
  coords: CoordSystem
): ScreenPoint {
  return {
    x: coords.originX + world.x * coords.scale,
    y: coords.originY - world.y * coords.scale
  };
}

/**
 * 计算物理世界边界
 */
export function computeWorldBounds(
  state: { x: number; y: number },
  trail: WorldPoint[]
): { maxX: number; maxY: number } {
  return {
    maxX: Math.max(50, ...trail.map((p) => p.x), state.x),
    maxY: Math.max(30, ...trail.map((p) => p.y), state.y)
  };
}

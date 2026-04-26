/**
 * 布局约束检查
 *
 * 供布局选择器和场景容器共享使用，避免逻辑重复。
 */

import type { LayoutMetadata } from './registry';

/**
 * 检查布局是否满足当前视口约束
 */
export function satisfiesConstraints(
  meta: LayoutMetadata,
  viewport: { width: number; height: number },
  orientation: 'portrait' | 'landscape'
): boolean {
  const c = meta.constraints;
  if (!c) return true;

  if (c.minWidth !== undefined && viewport.width < c.minWidth) return false;
  if (c.maxWidth !== undefined && viewport.width > c.maxWidth) return false;
  if (c.minHeight !== undefined && viewport.height < c.minHeight) return false;
  if (c.maxHeight !== undefined && viewport.height > c.maxHeight) return false;
  if (
    c.orientation &&
    c.orientation !== 'any' &&
    c.orientation !== orientation
  ) {
    return false;
  }

  return true;
}

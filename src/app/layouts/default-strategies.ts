/**
 * 默认布局选择策略
 *
 * 提供 3 个内置策略，按优先级排序：
 * 1. 用户偏好（最高优先级）
 * 2. 场景声明的偏好布局（需满足约束）
 * 3. 基于设备类型 + 约束自动匹配
 */

import { layoutSelector } from './selector';
import { layoutRegistry } from './registry';

/**
 * 检查布局是否满足当前视口约束
 */
function satisfiesConstraints(
  meta: import('./registry').LayoutMetadata,
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

/**
 * 注册所有默认选择策略
 */
export function registerDefaultStrategies(): void {
  // 清空旧策略，确保幂等调用不会累积
  layoutSelector.clear();

  // 策略 1：用户偏好（最高优先级）
  layoutSelector.register((ctx) => {
    if (ctx.userPreference) return ctx.userPreference;
    return null;
  });

  // 策略 2：场景声明的偏好布局（如果满足约束且允许自动选择）
  layoutSelector.register((ctx) => {
    if (!ctx.scenePreference) return null;
    const meta = layoutRegistry.getMetadata(ctx.scenePreference);
    if (!meta || meta.autoSelectable === false) return null;
    if (!satisfiesConstraints(meta, ctx.viewport, ctx.orientation)) return null;
    return ctx.scenePreference;
  });

  // 策略 3：基于设备类型 + 约束自动匹配
  layoutSelector.register((ctx) => {
    const candidates = ctx.availableLayouts
      .filter((l) => l.autoSelectable !== false)
      .filter((l) => satisfiesConstraints(l, ctx.viewport, ctx.orientation))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return candidates[0]?.id || null;
  });
}

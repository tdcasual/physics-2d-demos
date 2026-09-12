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
import { satisfiesConstraints } from './layout-constraints';

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

  // 策略 2：场景声明的偏好布局（满足视口约束即可；autoSelectable
  // 只约束策略 3 的自动匹配，避免实验布局抢走其他场景的默认项）
  layoutSelector.register((ctx) => {
    if (!ctx.scenePreference) return null;
    const meta = layoutRegistry.getMetadata(ctx.scenePreference);
    if (!meta) return null;
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

/**
 * 默认布局选择策略
 *
 * 提供 4 个内置策略，按优先级排序：
 * 0. URL 强制布局（?layout=，最高优先级）
 * 1. 用户偏好（满足视口约束时生效——约束内的粘滞）
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

  // 策略 0：URL 强制布局（?layout=）。AGENTS.md 承诺该参数「强制」测试某个
  // 已注册布局——必须高于用户偏好（否则存过偏好的浏览器里强制失效）。
  // 不查视口约束：强制语义；布局矩阵测试自行保证视口合法，dev 在约束外
  // 强制挂载属于显式行为（可能溢出，见 docs/plans/2026-09-25-layout-system-fixes.md）。
  layoutSelector.register((ctx) => {
    if (!ctx.forcedLayout) return null;
    return layoutRegistry.has(ctx.forcedLayout) ? ctx.forcedLayout : null;
  });

  // 策略 1：用户偏好——**约束内的粘滞**。满足偏好布局自身的视口约束才生效；
  // 违反时返回 null 让后续策略接管（窄视口自动回落到可用布局），恢复满足后
  // 偏好重新生效。偏好本身保留不删除。
  layoutSelector.register((ctx) => {
    if (!ctx.userPreference) return null;
    const meta = layoutRegistry.getMetadata(ctx.userPreference);
    if (!meta) return null;
    if (!satisfiesConstraints(meta, ctx.viewport, ctx.orientation)) return null;
    return ctx.userPreference;
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

/**
 * 布局选择器
 *
 * 将布局选择逻辑从 SceneContainerImpl 的硬编码 if-else 中提取出来，
 * 改为可插拔的策略模式。新增布局类别（tablet、presentation 等）时
 * 无需修改容器代码，只需注册新的选择策略。
 */

import type { LayoutMetadata } from './registry';

/** 布局选择上下文 */
export interface LayoutSelectionContext {
  /** 当前视口尺寸 */
  viewport: { width: number; height: number };
  /** 是否为移动端（<768px） */
  isMobile: boolean;
  /** 是否为平板（768px–1024px） */
  isTablet: boolean;
  /** 是否为桌面端（>=1024px） */
  isDesktop: boolean;
  /** 屏幕方向 */
  orientation: 'portrait' | 'landscape';
  /** 用户手动指定的偏好布局 */
  userPreference: string | null;
  /** 场景声明的偏好布局 */
  scenePreference: string | null;
  /** 当前所有可用布局的元数据 */
  availableLayouts: LayoutMetadata[];
}

/** 布局选择策略函数 */
export type LayoutSelectionStrategy = (
  ctx: LayoutSelectionContext
) => string | null;

/**
 * 布局选择器
 *
 * 按注册顺序依次执行策略，第一个返回有效布局 ID 的策略胜出。
 */
class LayoutSelector {
  private strategies: LayoutSelectionStrategy[] = [];

  /**
   * 注册选择策略
   */
  register(strategy: LayoutSelectionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 执行选择
   * @returns 选中的布局 ID
   */
  select(ctx: LayoutSelectionContext): string {
    for (const strategy of this.strategies) {
      const result = strategy(ctx);
      if (result && ctx.availableLayouts.some((l) => l.id === result)) {
        return result;
      }
    }

    // 兜底：返回第一个可用布局，或固定回退到 split-right
    return ctx.availableLayouts[0]?.id || 'split-right';
  }

  /**
   * 清空所有策略（主要用于测试）
   */
  clear(): void {
    this.strategies = [];
  }
}

/** 全局布局选择器实例 */
export const layoutSelector = new LayoutSelector();

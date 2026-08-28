/**
 * 布局母版统一注册
 *
 * 注册所有内置 ILayout 布局（Capability-based 架构）
 *
 * 布局实现按 thunk 惰性注册：元数据同步可用（布局矩阵测试与自动选择依赖），
 * 构造器在首次实例化时才动态 import，避免把未使用的布局实现打进首屏 chunk。
 *
 * @review-date 2026-04-27
 * @version 2.1.0
 */

import { layoutRegistry, registerLazyLayout } from './registry';
import { registerDefaultStrategies } from './default-strategies';

/**
 * 注册所有内置布局母版。
 * 幂等调用：重复调用不会导致重复注册。
 */
export function registerAllLayouts(): void {
  registerDefaultStrategies();

  if (!layoutRegistry.has('split-right')) {
    registerLazyLayout(
      'split-right',
      () =>
        import('./layouts/split-right/split-right').then(
          (m) => m.SplitRightLayout
        ),
      {
        name: '左右分栏',
        description: '控制区在左，动画区在右（Capability-based）',
        tags: ['desktop'],
        supportsMobile: false,
        supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
        constraints: { minWidth: 768, orientation: 'any' },
        priority: 100,
        autoSelectable: true,
        layoutTestProfile: {
          viewports: [
            { width: 1280, height: 720 },
            { width: 768, height: 900 }
          ],
          interactionModel: 'split',
          minStageWidth: 120,
          minStageHeight: 100,
          minGraphWidth: 80,
          minGraphHeight: 40
        }
      }
    );
  }

  if (!layoutRegistry.has('mobile-stack')) {
    registerLazyLayout(
      'mobile-stack',
      () =>
        import('./layouts/mobile-stack/mobile-stack').then(
          (m) => m.MobileStackLayout
        ),
      {
        name: '移动端堆叠',
        description: '适合手机的垂直堆叠布局（Capability-based）',
        tags: ['mobile'],
        supportsMobile: true,
        supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
        constraints: { maxWidth: 768, orientation: 'any' },
        priority: 100,
        autoSelectable: true,
        layoutTestProfile: {
          viewports: [
            { width: 320, height: 568 },
            { width: 375, height: 812 }
          ],
          interactionModel: 'tabs',
          requiresGraphActivation: true,
          minStageWidth: 120,
          minStageHeight: 100,
          minGraphWidth: 120,
          minGraphHeight: 100
        }
      }
    );
  }

  if (!layoutRegistry.has('split-right-graph-bottom')) {
    registerLazyLayout(
      'split-right-graph-bottom',
      () =>
        import('./layouts/split-right-graph-bottom/split-right-graph-bottom').then(
          (m) => m.SplitRightGraphBottomLayout
        ),
      {
        name: '左右分栏+底部图表',
        description: '控制区在左，动画区在右上方，图表网格在右下方',
        tags: ['desktop', 'multi-graph'],
        supportsMobile: false,
        supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
        constraints: { minWidth: 900, orientation: 'any' },
        priority: 90,
        autoSelectable: true,
        layoutTestProfile: {
          viewports: [
            { width: 1280, height: 720 },
            { width: 1024, height: 900 }
          ],
          interactionModel: 'split',
          requiresGraphActivation: false,
          minStageWidth: 120,
          minStageHeight: 100,
          minGraphWidth: 80,
          minGraphHeight: 40
        }
      }
    );
  }
}

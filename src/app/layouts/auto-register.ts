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

import {
  layoutRegistry,
  registerLayoutTestAdapter,
  registerLazyLayout
} from './registry';
import { registerDefaultStrategies } from './default-strategies';

/**
 * 注册所有内置布局母版。
 * 幂等调用：重复调用不会导致重复注册。
 */
export function registerAllLayouts(): void {
  registerDefaultStrategies();
  registerLayoutTestAdapter('collapsible-floats');

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
        graphAdoptTarget: 'section',
        demoCapable: true,
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
        // mobile 的 graph 是 tab 面板内的裸 slot（无 section 层），收养即
        // 收养 slots.graph 本身
        graphAdoptTarget: 'slot',
        // 图 tab 默认不激活即不可见，graphInitiallyHidden 对 mobile 无意义
        honorsGraphInitiallyHidden: false,
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
        graphAdoptTarget: 'section',
        demoCapable: true,
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

  if (!layoutRegistry.has('lab-stage')) {
    registerLazyLayout(
      'lab-stage',
      () =>
        import('./layouts/lab-stage/lab-stage').then((m) => m.LabStageLayout),
      {
        name: '实验台',
        description: '动画在上、控制在下，数据表与图表悬浮',
        tags: ['lab', 'desktop'],
        supportsMobile: true,
        supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
        constraints: { minWidth: 320, orientation: 'any' },
        priority: 40,
        autoSelectable: false,
        graphAdoptTarget: 'section',
        demoCapable: true,
        layoutTestProfile: {
          viewports: [
            { width: 1280, height: 720 },
            { width: 375, height: 812 }
          ],
          interactionModel: 'custom',
          adapter: 'collapsible-floats',
          requiresGraphActivation: true,
          minStageWidth: 120,
          minStageHeight: 100,
          minGraphWidth: 80,
          minGraphHeight: 80
        }
      }
    );
  }
}

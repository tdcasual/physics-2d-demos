/**
 * 布局母版统一注册
 *
 * 将所有布局注册逻辑从 scene-bootstrapper.ts 中提取到此模块，
 * 实现"新增布局只需改一处"的目标。
 */

import { layoutRegistry, registerLayout } from './registry';
import { registerDefaultStrategies } from './default-strategies';
import { SplitRightLayout } from './masters/split-right/split-right';
import { MobileStackLayout } from './masters/mobile-stack/mobile-stack';
import { SplitRightGraphBottomLayout } from './masters/split-right-graph-bottom/split-right-graph-bottom';

/**
 * 注册所有内置布局母版。
 * 幂等调用：重复调用不会导致重复注册。
 */
export function registerAllLayouts(): void {
  // 先注册默认选择策略（幂等：先清空再注册，避免策略累积）
  registerDefaultStrategies();

  if (!layoutRegistry.has('split-right')) {
    registerLayout('split-right', SplitRightLayout, {
      name: '左右分栏',
      description: '控制区在左，动画区在右',
      tags: ['desktop'],
      supportsMobile: false,
      supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
      constraints: { minWidth: 768, orientation: 'any' },
      priority: 100,
      autoSelectable: true
    });
  }

  if (!layoutRegistry.has('mobile-stack')) {
    registerLayout('mobile-stack', MobileStackLayout, {
      name: '移动端堆叠',
      description: '适合手机的垂直堆叠布局',
      tags: ['mobile'],
      supportsMobile: true,
      supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
      constraints: { maxWidth: 768, orientation: 'any' },
      priority: 100,
      autoSelectable: true
    });
  }

  if (!layoutRegistry.has('split-right-graph-bottom')) {
    registerLayout('split-right-graph-bottom', SplitRightGraphBottomLayout, {
      name: '左右分栏+底部图表',
      description: '控制区在左，动画区在右上方，图表网格在右下方（支持多列动态图表）',
      tags: ['desktop', 'multi-graph'],
      supportsMobile: false,
      supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
      constraints: { minWidth: 900, orientation: 'any' },
      priority: 90,
      autoSelectable: true
    });
  }
}

/**
 * 布局母版统一注册
 *
 * 注册所有内置 ILayout 布局（Capability-based 架构）
 *
 * @review-date 2026-04-27
 * @version 2.0.0
 */

import { layoutRegistry, registerLayout } from './registry';
import { registerDefaultStrategies } from './default-strategies';
import type { ILayoutConstructor } from './types';
import { SplitRightLayout } from './layouts/split-right/split-right';
import { MobileStackLayout } from './layouts/mobile-stack/mobile-stack';
import { SplitRightGraphBottomLayout } from './layouts/split-right-graph-bottom/split-right-graph-bottom';

/**
 * 注册所有内置布局母版。
 * 幂等调用：重复调用不会导致重复注册。
 */
export function registerAllLayouts(): void {
  registerDefaultStrategies();

  if (!layoutRegistry.has('split-right')) {
    registerLayout('split-right', SplitRightLayout as ILayoutConstructor, {
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
        minCanvasWidth: 120,
        minCanvasHeight: 100
      }
    });
  }

  if (!layoutRegistry.has('mobile-stack')) {
    registerLayout('mobile-stack', MobileStackLayout as ILayoutConstructor, {
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
        minCanvasWidth: 120,
        minCanvasHeight: 100
      }
    });
  }

  if (!layoutRegistry.has('split-right-graph-bottom')) {
    registerLayout(
      'split-right-graph-bottom',
      SplitRightGraphBottomLayout as ILayoutConstructor,
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
          minCanvasWidth: 120,
          minCanvasHeight: 50
        }
      }
    );
  }
}

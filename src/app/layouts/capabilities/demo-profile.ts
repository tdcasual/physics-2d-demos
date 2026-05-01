/**
 * Demo Profile Capability — 演示模式/标准模式切换
 *
 * 从 DesktopSplitLayout.applyDemoProfile / resetDemoProfile 提取。
 * 根据 SceneDemoProfile 调整布局元素（侧边栏、控制区、图表区、读数面板）。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../core/types';
import type { SceneDemoProfile } from '../../demo-profile';

export interface DemoProfileUpdateData {
  mode: 'normal' | 'presentation';
  profile: SceneDemoProfile | null;
}

export interface DemoProfileConfig {
  /** 侧边栏元素 CSS 选择器 */
  sidebarSelector?: string;
  /** 图表区元素 CSS 选择器 */
  graphSectionSelector?: string;
  /** 控制区元素 CSS 选择器 */
  controlSectionSelector?: string;
}

export function createDemoProfile(
  cfg: DemoProfileConfig = {}
): CapabilityDefinition<DemoProfileConfig, DemoProfileUpdateData> {
  return {
    id: 'demo-profile',

    mount(
      _slots: LayoutSlots,
      config: DemoProfileConfig,
      ctx: CapabilityContext
    ): CapabilityInstance<DemoProfileUpdateData> {
      const merged = { ...cfg, ...config };
      const sidebarSel = merged.sidebarSelector ?? '.layout-left-panel';
      const graphSel = merged.graphSectionSelector ?? '.graph-section, .layout-graph-section';

      let currentProfile: SceneDemoProfile | null = null;
      // Save original display values that other capabilities may have set
      // (e.g. sidebar-toggle), so reset() restores them instead of blindly
      // clearing to ''. If the original was empty, the computed value is used.
      let savedSidebarDisplay: string | null = null;
      let savedGraphDisplay: string | null = null;

      const apply = (profile: SceneDemoProfile) => {
        currentProfile = profile;

        // 侧边栏
        if (profile.controlPanel) {
          const sidebar = ctx.container.querySelector(sidebarSel) as HTMLElement | null;
          if (sidebar) {
            if (savedSidebarDisplay === null) {
              savedSidebarDisplay = sidebar.style.display || window.getComputedStyle(sidebar).display;
            }
            switch (profile.controlPanel) {
              case 'hidden': sidebar.style.display = 'none'; break;
              case 'collapsed':
              case 'minimal': sidebar.classList.add('is-collapsed-demo'); break;
              case 'full': sidebar.classList.remove('is-collapsed-demo'); break;
            }
          }
        }

        // 图表区
        if (profile.graphPanel) {
          const graph = ctx.container.querySelector(graphSel) as HTMLElement | null;
          if (graph) {
            if (savedGraphDisplay === null) {
              savedGraphDisplay = graph.style.display || window.getComputedStyle(graph).display;
            }
            switch (profile.graphPanel) {
              case 'hidden': graph.style.display = 'none'; break;
              case 'collapsed':
                graph.setAttribute('data-collapsed', 'true');
                graph.classList.add('is-collapsed-demo');
                break;
              case 'visible':
                graph.setAttribute('data-collapsed', 'false');
                graph.classList.remove('is-collapsed-demo');
                break;
            }
          }
        }

        // 读数面板 — 直接 DOM 操作，不依赖外部 readoutPanel 引用
        if (profile.readoutPanel) {
          const rp = ctx.container.querySelector('[class*="-readout-panel"]') as HTMLElement | null;
          if (rp) {
            // Derive prefix from the panel's main class (e.g. teaching-readout-panel → teaching)
            const prefix = Array.from(rp.classList)
              .find(c => c.endsWith('-readout-panel'))
              ?.replace('-readout-panel', '');
            switch (profile.readoutPanel) {
              case 'hidden':
                rp.style.display = 'none';
                break;
              case 'overlay':
                rp.style.display = '';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-overlay`);
                  rp.classList.remove(`${prefix}-is-docked-top`, `${prefix}-is-docked-bottom`);
                  rp.classList.add(`${prefix}-readout-enlarged`);
                }
                break;
              case 'docked-top':
                rp.style.display = '';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-docked-top`);
                  rp.classList.remove(`${prefix}-is-overlay`, `${prefix}-is-docked-bottom`);
                }
                break;
              case 'docked-bottom':
                rp.style.display = '';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-docked-bottom`);
                  rp.classList.remove(`${prefix}-is-overlay`, `${prefix}-is-docked-top`);
                }
                break;
            }
          }
        }

        // 触摸优化
        if (profile.interactionHints?.touchTargetMinSize) {
          ctx.container.classList.add('teaching-demo-touch-optimized');
          ctx.container.style.setProperty(
            '--demo-touch-min',
            `${profile.interactionHints.touchTargetMinSize}px`
          );
        }
      };

      const reset = () => {
        currentProfile = null;

        const sidebar = ctx.container.querySelector(sidebarSel) as HTMLElement | null;
        if (sidebar) {
          sidebar.style.display = savedSidebarDisplay ?? '';
          savedSidebarDisplay = null;
          sidebar.classList.remove('is-collapsed-demo');
        }

        const graph = ctx.container.querySelector(graphSel) as HTMLElement | null;
        if (graph) {
          graph.style.display = savedGraphDisplay ?? '';
          savedGraphDisplay = null;
          graph.setAttribute('data-collapsed', 'false');
          graph.classList.remove('is-collapsed-demo');
        }

        const rp = ctx.container.querySelector('[class*="-readout-panel"]') as HTMLElement | null;
        if (rp) {
          const prefix = Array.from(rp.classList)
            .find(c => c.endsWith('-readout-panel'))
            ?.replace('-readout-panel', '');
          rp.style.display = '';
          rp.classList.add('is-collapsed');
          if (prefix) {
            rp.classList.remove(
              `${prefix}-is-overlay`, `${prefix}-is-docked-top`, `${prefix}-is-docked-bottom`,
              `${prefix}-readout-enlarged`
            );
          }
        }

        ctx.container.classList.remove('teaching-demo-touch-optimized');
        ctx.container.style.removeProperty('--demo-touch-min');
      };

      return {
        update(data: DemoProfileUpdateData) {
          if (data.mode === 'presentation' && data.profile) {
            apply(data.profile);
          } else if (data.mode === 'normal') {
            reset();
          }
        },
        dispose() {
          if (currentProfile) reset();
        }
      };
    }
  };
}

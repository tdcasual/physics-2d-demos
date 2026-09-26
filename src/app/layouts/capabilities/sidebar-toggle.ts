/**
 * Sidebar Toggle Capability — 侧边栏折叠/展开
 *
 * 折叠时记录当前 grid-template-columns 以便恢复，
 * 避免因 resize 或用户拖拽导致恢复时使用过时快照。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';
import { requestLayoutResize } from '../request-layout-resize';

export interface SidebarToggleConfig {
  /** 侧边栏元素 CSS 选择器 */
  sidebarSelector?: string;
  /** 分隔条元素 CSS 选择器 */
  resizerSelector?: string;
  /** 侧边栏默认宽度（px） */
  defaultWidth?: number;
  /** 隐藏时按钮文本 */
  showLabel?: string;
  /** 显示时按钮文本 */
  hideLabel?: string;
}

export function createSidebarToggle(
  cfg: SidebarToggleConfig = {}
): CapabilityDefinition<SidebarToggleConfig> {
  return {
    id: 'sidebar-toggle',

    mount(
      _slots: LayoutSlots,
      config: SidebarToggleConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const merged = { ...cfg, ...config };
      const sidebarSel = merged.sidebarSelector ?? '.layout-left-panel';
      const resizerSel =
        merged.resizerSelector ??
        '[role="separator"][aria-orientation="vertical"]';
      const showLabel = merged.showLabel ?? '显示控制面板';
      const hideLabel = merged.hideLabel ?? '隐藏控制面板';

      let btn: HTMLButtonElement | null = null;
      let btnCreated = false;
      let sidebarHidden = false;
      let handler: (() => void) | null = null;
      // Save only the first-column width, not the full template.
      // A full-template snapshot becomes stale if a resize changes the
      // grid while the sidebar is hidden.
      let savedLeftWidth: string | null = null;

      const sidebar = ctx.container.querySelector(
        sidebarSel
      ) as HTMLElement | null;
      const resizerEl = ctx.container.querySelector(
        resizerSel
      ) as HTMLElement | null;

      btn = ctx.container.querySelector(
        '.sidebar-toggle-btn'
      ) as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sidebar-toggle-btn';
        btn.textContent = hideLabel;
        btnCreated = true;
        ctx.container.appendChild(btn);
      }

      // Initial aria state: sidebar visible by default
      btn.setAttribute('aria-expanded', 'true');
      if (sidebar) sidebar.setAttribute('aria-hidden', 'false');

      // Live region for screen reader announcements
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText =
        'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      ctx.container.appendChild(liveRegion);

      handler = () => {
        sidebarHidden = !sidebarHidden;

        // Only manipulate grid on multi-column layouts (desktop/tablet).
        // Mobile layouts use single-column grid or flexbox where hardcoded
        // '0px 8px 1fr' would break the layout.
        const currentCols = ctx.container.style.gridTemplateColumns;
        const isMultiColumn = currentCols.includes(' ');

        if (sidebarHidden) {
          // Save the first track including CSS functions with spaces (e.g. minmax(260px, 40%))
          const match = currentCols.match(/^(.+?)\s+8px\s+1fr$/);
          savedLeftWidth = match ? match[1] : currentCols.split(' ')[0];
          if (isMultiColumn) {
            ctx.container.style.gridTemplateColumns = '0px 8px 1fr';
          }
          // 隐藏态单一事实源：applyResponsiveColumns 读该标记而非嗅探样式串。
          ctx.container.dataset.sidebarHidden = 'true';
          if (sidebar) {
            sidebar.style.display = 'none';
            sidebar.setAttribute('aria-hidden', 'true');
          }
          if (resizerEl) resizerEl.style.display = 'none';
          if (btn) {
            btn.textContent = showLabel;
            btn.setAttribute('aria-expanded', 'false');
          }
          liveRegion.textContent = '控制面板已隐藏';
        } else {
          if (isMultiColumn && savedLeftWidth) {
            // Restore the saved first track into the current grid
            ctx.container.style.gridTemplateColumns = `${savedLeftWidth} 8px 1fr`;
          }
          ctx.container.dataset.sidebarHidden = 'false';
          if (sidebar) {
            sidebar.style.display = '';
            sidebar.setAttribute('aria-hidden', 'false');
          }
          if (resizerEl) resizerEl.style.display = '';
          if (btn) {
            btn.textContent = hideLabel;
            btn.setAttribute('aria-expanded', 'true');
          }
          liveRegion.textContent = '控制面板已显示';
        }

        // Trigger scene resize after layout settles so canvas picks up new container dimensions
        requestLayoutResize();
      };

      btn.addEventListener('click', handler);

      return {
        dispose() {
          if (btn && handler) {
            btn.removeEventListener('click', handler);
          }
          if (btnCreated && btn) btn.remove();
          liveRegion.remove();
          btn = null;
          handler = null;
        }
      };
    }
  };
}

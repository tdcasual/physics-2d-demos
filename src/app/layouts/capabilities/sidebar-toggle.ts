/**
 * Sidebar Toggle Capability — 侧边栏折叠/展开
 *
 * Visibility authority lives on ctx.sidebar. This capability projects
 * grid/ARIA from the owner and writes user preference back to it.
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
      let handler: (() => void) | null = null;
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

      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText =
        'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      ctx.container.appendChild(liveRegion);

      const applyProjection = () => {
        const effectiveHidden = ctx.sidebar.getEffectiveHidden();
        ctx.sidebar.project(ctx.container);
        const currentCols = ctx.container.style.gridTemplateColumns;
        const isMultiColumn = currentCols.includes(' ');

        if (effectiveHidden) {
          const match = currentCols.match(/^(.+?)\s+8px\s+1fr$/);
          if (isMultiColumn && match && !currentCols.startsWith('0px')) {
            savedLeftWidth = match[1];
          }
          if (isMultiColumn) {
            ctx.container.style.gridTemplateColumns = '0px 0px 1fr';
          }
          if (sidebar) {
            sidebar.style.display = 'none';
            sidebar.setAttribute('aria-hidden', 'true');
          }
          if (resizerEl) resizerEl.style.display = 'none';
          if (btn) {
            btn.textContent = showLabel;
            btn.setAttribute('aria-expanded', 'false');
          }
        } else {
          if (isMultiColumn && savedLeftWidth) {
            ctx.container.style.gridTemplateColumns = `${savedLeftWidth} 8px 1fr`;
          }
          if (sidebar) {
            sidebar.style.display = '';
            sidebar.setAttribute('aria-hidden', 'false');
          }
          if (resizerEl) resizerEl.style.display = '';
          if (btn) {
            btn.textContent = hideLabel;
            btn.setAttribute('aria-expanded', 'true');
          }
        }
      };

      applyProjection();

      handler = () => {
        ctx.sidebar.setUserHidden(!ctx.sidebar.getUserHidden());
        applyProjection();
        liveRegion.textContent = ctx.sidebar.getEffectiveHidden()
          ? '控制面板已隐藏'
          : '控制面板已显示';
        requestLayoutResize();
      };

      btn.addEventListener('click', handler);
      const unsub = ctx.sidebar.subscribe(() => applyProjection());

      return {
        update() {
          applyProjection();
        },
        dispose() {
          unsub();
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

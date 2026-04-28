/**
 * Readout Panel Capability — 数据读数面板
 *
 * 自包含实现：拖拽、自适应列数、resize handle、折叠/位置切换。
 * 内联原 ReadoutPanelManager + makeElementDraggable，不再依赖 old masters。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots,
  ReadoutItem
} from '../core/types';

export interface ReadoutPanelConfig {
  position?: 'top-right' | 'inline' | 'overlay' | 'docked-top' | 'docked-bottom';
  collapsed?: boolean;
  label?: string;
  width?: number;
  cssPrefix?: string;
}

// ============================================================================
// Inline helpers (previously in masters/split-right/readout-panel.ts + drag)
// ============================================================================

function makeDraggable(
  element: HTMLElement,
  handle: HTMLElement | null
): () => void {
  if (!handle) return () => {};

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.style.cursor = 'move';

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    // 不拦截交互子元素（按钮、链接等）的点击
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const cs = window.getComputedStyle(element);
    const currentLeft = parseFloat(cs.left) || 0;
    const currentTop = parseFloat(cs.top) || 0;

    if (cs.right !== 'auto') {
      const parentRect = element.offsetParent?.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      if (parentRect) {
        initialLeft = elemRect.left - parentRect.left;
        initialTop = elemRect.top - parentRect.top;
      } else {
        initialLeft = currentLeft;
        initialTop = currentTop;
      }
    } else {
      initialLeft = currentLeft;
      initialTop = currentTop;
    }

    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transition = 'none';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let nextLeft = initialLeft + dx;
    let nextTop = initialTop + dy;
    const parent = element.offsetParent as HTMLElement | null;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      nextLeft = Math.max(0, Math.min(nextLeft, parentRect.width - elemRect.width));
      nextTop = Math.max(0, Math.min(nextTop, parentRect.height - elemRect.height));
    }
    element.style.left = `${nextLeft}px`;
    element.style.top = `${nextTop}px`;
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  };

  const cleanupDragStyles = () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  };

  handle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    handle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    cleanupDragStyles();
  };
}

function initAdaptiveColumns(slot: HTMLElement, panel: HTMLElement, cssPrefix: string): ResizeObserver {
  const p = cssPrefix;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      slot.classList.remove(
        `${p}-readout-slot--1col`,
        `${p}-readout-slot--2col`,
        `${p}-readout-slot--3col`,
        `${p}-readout-slot--auto`
      );
      if (width < 220) {
        slot.classList.add(`${p}-readout-slot--1col`);
        slot.setAttribute('data-columns', '1');
      } else if (width < 320) {
        slot.classList.add(`${p}-readout-slot--auto`);
        slot.setAttribute('data-columns', 'auto');
      } else if (width < 420) {
        slot.classList.add(`${p}-readout-slot--2col`);
        slot.setAttribute('data-columns', '2');
      } else {
        slot.classList.add(`${p}-readout-slot--3col`);
        slot.setAttribute('data-columns', '3');
      }
    }
  });
  observer.observe(panel);
  return observer;
}

function initResizeHandle(panel: HTMLElement, slot: HTMLElement): { handle: HTMLElement; abort: AbortController } {
  const abort = new AbortController();
  const signal = abort.signal;
  let isResizing = false;

  // Track active document-level listeners so dispose-during-drag can clean them up
  let activeMove: ((ev: MouseEvent) => void) | null = null;
  let activeUp: (() => void) | null = null;

  const handle = document.createElement('div');
  handle.className = 'readout-resize-handle';
  handle.setAttribute('tabindex', '-1');
  handle.style.cssText = `
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--color-text-muted, #888) 50%);
    border-radius: 0 0 4px 0;
    opacity: 0.5;
    transition: opacity 0.2s;
  `;

  handle.addEventListener('mouseenter', () => { handle.style.opacity = '1'; }, { signal });
  handle.addEventListener('mouseleave', () => {
    if (!isResizing) handle.style.opacity = '0.5';
  }, { signal });

  // Clean up leaked document listeners on abort (dispose-during-drag)
  signal.addEventListener('abort', () => {
    if (activeMove) document.removeEventListener('mousemove', activeMove);
    if (activeUp) document.removeEventListener('mouseup', activeUp);
    activeMove = null;
    activeUp = null;
  });

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;

    const headerEl = panel.querySelector('[class*="-readout-header"]') as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 50;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newWidth = Math.max(180, Math.min(450, startWidth + dx));
      const newHeight = Math.max(100, Math.min(500, startHeight + dy));
      panel.style.width = `${newWidth}px`;
      slot.style.maxHeight = `${newHeight - headerHeight}px`;
    };

    const onMouseUp = () => {
      isResizing = false;
      handle.style.opacity = '0.5';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      activeMove = null;
      activeUp = null;
    };

    activeMove = onMouseMove;
    activeUp = onMouseUp;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  panel.appendChild(handle);
  return { handle, abort };
}

// ============================================================================
// Capability
// ============================================================================

export function createReadoutPanel(
  cfg: ReadoutPanelConfig = {}
): CapabilityDefinition<ReadoutPanelConfig, ReadoutItem[]> {
  return {
    id: 'readout-panel',

    mount(
      slots: LayoutSlots,
      config: ReadoutPanelConfig,
      ctx: CapabilityContext
    ): CapabilityInstance<ReadoutItem[]> {
      const merged = { ...cfg, ...config };
      const position = merged.position ?? 'top-right';
      const collapsed = merged.collapsed ?? true;
      const label = merged.label ?? '数据读数';
      const cssPrefix = merged.cssPrefix ?? 'teaching';

      // Create DOM
      const panel = document.createElement('div');
      panel.className = `${cssPrefix}-readout-panel ${collapsed ? 'is-collapsed' : ''}`;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', label);

      // 仅设置定位属性（position/right/top/z-index），
      // 尺寸由 CSS class 管理，确保 .is-collapsed 可正确覆盖
      if (position === 'top-right') {
        panel.style.position = 'absolute';
        panel.style.right = '12px';
        panel.style.top = '60px';
        panel.style.zIndex = '100';
      }

      const header = document.createElement('div');
      header.className = `${cssPrefix}-readout-header`;
      const title = document.createElement('span');
      title.className = `${cssPrefix}-readout-title`;
      title.textContent = label;

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = `${cssPrefix}-readout-toggle`;
      toggleBtn.setAttribute('aria-label', collapsed ? '展开' : '折叠');
      toggleBtn.textContent = collapsed ? '展开' : '折叠';
      header.append(title, toggleBtn);

      const slot = document.createElement('ul');
      slot.className = `${cssPrefix}-readout-slot ${cssPrefix}-readout-slot--adaptive`;
      slot.setAttribute('data-columns', 'auto');

      panel.append(header, slot);

      // Mount to DOM
      if (position === 'inline' && slots.readout) {
        slots.readout.appendChild(panel);
      } else if (slots.animation) {
        slots.animation.appendChild(panel);
      } else {
        ctx.container.appendChild(panel);
      }

      // State
      let isCollapsed = collapsed;

      // Initialize features (inlined from ReadoutPanelManager)
      const dragCleanup = makeDraggable(panel, header);
      const resizeObserver = initAdaptiveColumns(slot, panel, cssPrefix);
      const { handle: resizeHandle, abort: resizeAbort } = initResizeHandle(panel, slot);

      // Toggle
      const _updateToggleButton = () => {
        toggleBtn.textContent = isCollapsed ? '展开' : '折叠';
        toggleBtn.setAttribute('aria-label', isCollapsed ? '展开' : '折叠');
      };

      const toggle = () => {
        isCollapsed = !isCollapsed;
        panel.classList.toggle('is-collapsed', isCollapsed);
        _updateToggleButton();
      };

      const onToggle = () => toggle();
      toggleBtn.addEventListener('click', onToggle);

      return {
        update(data: ReadoutItem[]) {
          if (!data?.length) return;
          slot.replaceChildren();
          data.forEach((item) => {
            const li = document.createElement('li');
            li.className = `${cssPrefix}-readout-item ${item.layout === 'half' ? `${cssPrefix}-readout-item--half` : ''}`;
            const lbl = document.createElement('span');
            lbl.className = `${cssPrefix}-readout-label`;
            lbl.textContent = item.label;
            const val = document.createElement('strong');
            val.className = `${cssPrefix}-readout-value`;
            val.textContent = String(item.value);
            li.append(lbl, val);
            slot.appendChild(li);
          });
        },
        dispose() {
          toggleBtn.removeEventListener('click', onToggle);
          dragCleanup();
          resizeObserver.disconnect();
          resizeAbort.abort();
          resizeHandle.remove();
          panel.remove();
        }
      };
    }
  };
}

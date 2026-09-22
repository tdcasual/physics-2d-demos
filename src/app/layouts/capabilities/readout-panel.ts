/**
 * Readout Panel Capability — 数据读数面板
 *
 * 自包含实现：自适应列数、resize handle、折叠/位置切换；
 * 拖拽复用 ui/utils/draggable 的共享 makeDraggable。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots,
  ReadoutItem
} from '../types';
import { makeDraggable } from '../../../ui/utils/draggable';
import { localPointerDelta } from '../../../core/canvas-sizing';
import {
  STAGE_CHROME_ATTR,
  READOUT_SLOT_ATTR
} from '../../../platform/stage-chrome';

export interface ReadoutPanelConfig {
  position?:
    | 'top-right'
    | 'inline'
    | 'overlay'
    | 'docked-top'
    | 'docked-bottom';
  collapsed?: boolean;
  label?: string;
  width?: number;
  cssPrefix?: string;
}

// ============================================================================
// Inline helpers (previously in masters/split-right/readout-panel.ts)
// ============================================================================

function initAdaptiveColumns(
  slot: HTMLElement,
  panel: HTMLElement,
  cssPrefix: string
): ResizeObserver {
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

function initResizeHandle(
  panel: HTMLElement,
  slot: HTMLElement
): { handle: HTMLElement; abort: AbortController } {
  const abort = new AbortController();
  const signal = abort.signal;
  let isResizing = false;

  // Track active document-level listeners so dispose-during-drag can clean them up
  let activeMove: ((ev: MouseEvent) => void) | null = null;
  let activeUp: (() => void) | null = null;
  let activeTouchMove: ((ev: TouchEvent) => void) | null = null;
  let activeTouchEnd: (() => void) | null = null;

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
    background: linear-gradient(135deg, transparent 50%, var(--text-muted, #888) 50%);
    border-radius: 0 0 4px 0;
    opacity: 0.5;
    transition: opacity 0.2s;
  `;

  handle.addEventListener(
    'mouseenter',
    () => {
      handle.style.opacity = '1';
    },
    { signal }
  );
  handle.addEventListener(
    'mouseleave',
    () => {
      if (!isResizing) handle.style.opacity = '0.5';
    },
    { signal }
  );

  // Clean up leaked document listeners on abort (dispose-during-drag)
  signal.addEventListener('abort', () => {
    if (activeMove) document.removeEventListener('mousemove', activeMove);
    if (activeUp) document.removeEventListener('mouseup', activeUp);
    if (activeTouchMove)
      document.removeEventListener('touchmove', activeTouchMove);
    if (activeTouchEnd) {
      document.removeEventListener('touchend', activeTouchEnd);
      document.removeEventListener('touchcancel', activeTouchEnd);
    }
    activeMove = null;
    activeUp = null;
    activeTouchMove = null;
    activeTouchEnd = null;
  });

  function startResize(clientX: number, clientY: number) {
    isResizing = true;
    const startX = clientX;
    const startY = clientY;
    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;

    const headerEl = panel.querySelector(
      '[class*="-readout-header"]'
    ) as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 50;

    return { startX, startY, startWidth, startHeight, headerHeight };
  }

  function applyResize(
    clientX: number,
    clientY: number,
    startX: number,
    startY: number,
    startWidth: number,
    startHeight: number,
    headerHeight: number
  ) {
    const { dx, dy } = localPointerDelta(
      panel,
      clientX - startX,
      clientY - startY
    );
    const newWidth = Math.max(180, Math.min(450, startWidth + dx));
    const newHeight = Math.max(100, Math.min(500, startHeight + dy));
    panel.style.width = `${newWidth}px`;
    slot.style.maxHeight = `${newHeight - headerHeight}px`;
  }

  function endResize() {
    isResizing = false;
    handle.style.opacity = '0.5';
  }

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const s = startResize(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing) return;
      applyResize(
        ev.clientX,
        ev.clientY,
        s.startX,
        s.startY,
        s.startWidth,
        s.startHeight,
        s.headerHeight
      );
    };

    const onMouseUp = () => {
      endResize();
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

  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const s = startResize(touch.clientX, touch.clientY);

    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      applyResize(
        t.clientX,
        t.clientY,
        s.startX,
        s.startY,
        s.startWidth,
        s.startHeight,
        s.headerHeight
      );
    };

    const onTouchEnd = () => {
      endResize();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      activeTouchMove = null;
      activeTouchEnd = null;
    };

    activeTouchMove = onTouchMove;
    activeTouchEnd = onTouchEnd;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
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
      const isInline = position === 'inline';

      // Create DOM
      const panel = document.createElement('div');
      panel.className = `${cssPrefix}-readout-panel readout-panel ${collapsed ? 'is-collapsed' : ''}`;
      // 浮动形态会成为 stage slot 的直接子节点（chrome），创建点即自标；
      // inline 形态挂在 readout slot，该属性无害。
      panel.setAttribute(STAGE_CHROME_ATTR, '');
      if (isInline) panel.classList.add(`${cssPrefix}-readout-panel--inline`);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', label);

      if (position === 'top-right') {
        panel.style.position = 'absolute';
        panel.style.right = '12px';
        panel.style.top = '60px';
        panel.style.zIndex = '100';
      }

      const slot = document.createElement('ul');
      slot.className = `${cssPrefix}-readout-slot readout-slot ${cssPrefix}-readout-slot--adaptive`;
      slot.setAttribute('data-columns', 'auto');
      // 可滚动区域必须可被键盘聚焦（WCAG 2.1.1 / axe scrollable-region-focusable）
      slot.setAttribute('tabindex', '0');
      // 读数挂载点：split/srgb 只打内部 ul（mountDataPanel 认 UL 或
      // readout-slot class，打在 panel 上表会插到 div 外面）；mobile
      // (inline) 打 panel——布局清 slot 会抹掉后挂内容
      if (isInline) panel.setAttribute(READOUT_SLOT_ATTR, '');
      else slot.setAttribute(READOUT_SLOT_ATTR, '');

      let toggleCleanup: (() => void) | null = null;

      // Inline mode: compact title + grid, no toggle
      if (isInline) {
        const inlineTitle = document.createElement('div');
        inlineTitle.className = `${cssPrefix}-readout-inline-title readout-inline-title`;
        inlineTitle.textContent = label;
        panel.append(inlineTitle, slot);
      } else {
        const header = document.createElement('div');
        header.className = `${cssPrefix}-readout-header readout-header`;
        const title = document.createElement('span');
        title.className = `${cssPrefix}-readout-title readout-title`;
        title.textContent = label;

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = `${cssPrefix}-readout-toggle readout-toggle`;
        toggleBtn.setAttribute('aria-label', collapsed ? '展开' : '折叠');
        toggleBtn.textContent = collapsed ? '展开' : '折叠';
        header.append(title, toggleBtn);

        panel.append(header, slot);

        let isCollapsed = collapsed;
        const _updateToggleButton = () => {
          toggleBtn.textContent = isCollapsed ? '展开' : '折叠';
          toggleBtn.setAttribute('aria-label', isCollapsed ? '展开' : '折叠');
        };
        const onToggle = () => {
          isCollapsed = !isCollapsed;
          panel.classList.toggle('is-collapsed', isCollapsed);
          _updateToggleButton();
        };
        toggleBtn.addEventListener('click', onToggle);
        toggleCleanup = () => toggleBtn.removeEventListener('click', onToggle);
      }

      // Mount to DOM
      if (isInline && slots.readout) {
        slots.readout.appendChild(panel);
      } else if (slots.animation) {
        slots.animation.appendChild(panel);
      } else {
        ctx.container.appendChild(panel);
      }

      // Features: only for floating panels
      const dragCleanup = isInline
        ? () => {}
        : makeDraggable(
            panel,
            panel.querySelector<HTMLElement>(`.${cssPrefix}-readout-header`) ??
              undefined,
            { clampToParent: true }
          );
      const resizeObserver = initAdaptiveColumns(slot, panel, cssPrefix);
      const resizeResult = isInline
        ? { handle: null, abort: new AbortController() }
        : initResizeHandle(panel, slot);

      // 对象池：复用 li 节点，避免每帧 destroy/create
      const itemPool: Array<{
        li: HTMLLIElement;
        lbl: HTMLSpanElement;
        val: HTMLElement;
      }> = [];
      let _lastDataKey = '';

      return {
        update(data: ReadoutItem[]) {
          if (!data) return;
          // 脏检查：数据未变化时跳过 DOM 操作
          const dataKey = data.map((d) => `${d.label}=${d.value}`).join('|');
          if (dataKey === _lastDataKey) return;
          _lastDataKey = dataKey;

          // 复用或创建 li 节点
          const needed = data.length;
          const existing = itemPool.length;

          // 移除多余节点
          for (let i = needed; i < existing; i++) {
            itemPool[i].li.remove();
          }
          itemPool.length = needed;

          data.forEach((item, i) => {
            let poolItem = itemPool[i];
            if (!poolItem) {
              const li = document.createElement('li');
              const lbl = document.createElement('span');
              const val = document.createElement('strong');
              lbl.className = `${cssPrefix}-readout-label readout-label`;
              val.className = `${cssPrefix}-readout-value readout-value`;
              li.append(lbl, val);
              slot.appendChild(li);
              poolItem = { li, lbl, val };
              itemPool[i] = poolItem;
            }
            const halfClass = `${cssPrefix}-readout-item--half`;
            const compactClass = `${cssPrefix}-readout-item--compact`;
            poolItem.li.className = `${cssPrefix}-readout-item readout-item ${item.layout === 'half' ? halfClass : ''}`;
            if (isInline) poolItem.li.classList.add(compactClass);
            else poolItem.li.classList.remove(compactClass);
            if (poolItem.lbl.textContent !== item.label) {
              poolItem.lbl.textContent = item.label;
            }
            const v = String(item.value);
            if (poolItem.val.textContent !== v) {
              poolItem.val.textContent = v;
            }
          });
        },
        dispose() {
          toggleCleanup?.();
          dragCleanup();
          resizeObserver.disconnect();
          resizeResult.abort.abort();
          resizeResult.handle?.remove();
          panel.remove();
        }
      };
    }
  };
}

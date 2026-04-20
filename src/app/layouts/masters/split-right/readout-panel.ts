/**
 * ReadoutPanelManager - 数据读数面板管理器
 *
 * 封装读数面板的拖拽、ResizeObserver、自适应列数、resize handle 等功能。
 * 从 SplitRightLayout 拆分出来，降低主类复杂度。
 */

export interface ReadoutPanelOptions {
  panel: HTMLElement;
  header: HTMLElement;
  slot: HTMLElement;
  toggleBtn: HTMLButtonElement | null;
  collapsed: boolean;
}

export class ReadoutPanelManager {
  private panel: HTMLElement;
  private header: HTMLElement;
  private slot: HTMLElement;
  private toggleBtn: HTMLButtonElement | null;
  private collapsed: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private dragCleanup: (() => void) | null = null;
  private resizeHandle: HTMLElement | null = null;
  private isResizing = false;

  constructor(options: ReadoutPanelOptions) {
    this.panel = options.panel;
    this.header = options.header;
    this.slot = options.slot;
    this.toggleBtn = options.toggleBtn;
    this.collapsed = options.collapsed;
  }

  /** 初始化所有高级功能 */
  initFeatures(): void {
    this.initDraggable();
    this.initAdaptiveColumns();
    this.initResizeHandle();
  }

  /** 切换折叠状态 */
  toggle(): void {
    this.collapsed = !this.collapsed;
    this.panel.classList.toggle('is-collapsed', this.collapsed);

    const btn = this.panel.querySelector(
      '.readout-toggle'
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.textContent = this.collapsed ? '展开' : '折叠';
      btn.setAttribute('aria-label', this.collapsed ? '展开' : '折叠');
    }
    this.toggleBtn = btn;
  }

  /** 获取当前折叠状态 */
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  /** 获取面板元素 */
  getPanel(): HTMLElement {
    return this.panel;
  }

  /** 获取 slot 元素 */
  getSlot(): HTMLElement {
    return this.slot;
  }

  /** 清理资源 */
  dispose(): void {
    this.dragCleanup?.();
    this.dragCleanup = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.resizeHandle && this.resizeHandle.parentNode) {
      this.resizeHandle.parentNode.removeChild(this.resizeHandle);
    }
    this.resizeHandle = null;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private initDraggable(): void {
    this.dragCleanup = this.makeElementDraggable(this.panel, this.header);
  }

  private makeElementDraggable(
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

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const computedStyle = window.getComputedStyle(element);
      const currentLeft = parseFloat(computedStyle.left) || 0;
      const currentTop = parseFloat(computedStyle.top) || 0;

      if (computedStyle.right !== 'auto') {
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
        nextLeft = Math.max(
          0,
          Math.min(nextLeft, parentRect.width - elemRect.width)
        );
        nextTop = Math.max(
          0,
          Math.min(nextTop, parentRect.height - elemRect.height)
        );
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

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  private initAdaptiveColumns(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;

        this.slot.classList.remove(
          'readout-slot--1col',
          'readout-slot--2col',
          'readout-slot--3col',
          'readout-slot--auto'
        );

        if (width < 220) {
          this.slot.classList.add('readout-slot--1col');
          this.slot.setAttribute('data-columns', '1');
        } else if (width < 320) {
          this.slot.classList.add('readout-slot--auto');
          this.slot.setAttribute('data-columns', 'auto');
        } else if (width < 420) {
          this.slot.classList.add('readout-slot--2col');
          this.slot.setAttribute('data-columns', '2');
        } else {
          this.slot.classList.add('readout-slot--3col');
          this.slot.setAttribute('data-columns', '3');
        }
      }
    });

    this.resizeObserver.observe(this.panel);
  }

  private initResizeHandle(): void {
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'readout-resize-handle';
    this.resizeHandle.setAttribute('tabindex', '-1');
    this.resizeHandle.style.cssText = `
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

    this.resizeHandle.addEventListener('mouseenter', () => {
      this.resizeHandle!.style.opacity = '1';
    });

    this.resizeHandle.addEventListener('mouseleave', () => {
      if (!this.isResizing) {
        this.resizeHandle!.style.opacity = '0.5';
      }
    });

    this.resizeHandle.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = this.panel.offsetWidth;
      const startHeight = this.panel.offsetHeight;

      const onMouseMove = (e: MouseEvent) => {
        if (!this.isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newWidth = Math.max(180, Math.min(450, startWidth + dx));
        const newHeight = Math.max(100, Math.min(500, startHeight + dy));

        this.panel.style.width = `${newWidth}px`;
        this.slot.style.maxHeight = `${newHeight - 50}px`;
      };

      const onMouseUp = () => {
        this.isResizing = false;
        if (this.resizeHandle) {
          this.resizeHandle.style.opacity = '0.5';
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    this.panel.appendChild(this.resizeHandle);
    this.panel.style.position = 'absolute';
    this.panel.style.resize = 'none';
  }
}

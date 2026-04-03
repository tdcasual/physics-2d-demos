/**
 * SplitRightLayout - 左右分栏布局 (改进版)
 * 
 * 改进点：
 * 1. 布局提供浮动控制条（避免与场景重复创建）
 * 2. 数据读数面板可拖拽
 * 3. 数据读数面板根据宽度自动调整列数
 * 4. 数据读数面板可调节大小
 * 
 * @review-date 2026-04-02
 * @version 1.1.0-improved
 */

import { BaseLayout } from '../base-layout';
import type { LayoutSlots, LayoutConfig, Theme, SlotName, SlotConfig, TransportState, ReadoutItem } from '../../types';
import { createFloatingControls } from '../../../../ui/control-layout';

/** SplitRight 布局配置 */
export interface SplitRightConfig extends LayoutConfig {
  defaultLeftRatio?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  hasGraph?: boolean;
  graphHeight?: number;
  controlColumns?: 'auto' | 1 | 2 | 3;
  readoutCollapsed?: boolean;
  hideHeader?: boolean;
  readoutLabel?: string;
  title?: string;
  subtitle?: string;
}

export class SplitRightLayout extends BaseLayout {
  readonly id = 'split-right';
  readonly name = '左右分栏';
  readonly description = '控制区在左，动画区在右，数据读数面板可拖拽可调节';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation', 'graph', 'readout'];
  
  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private resizer: HTMLElement | null = null;
  private controlSection: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private graphSection: HTMLElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private stageToolbar: HTMLElement | null = null;
  private stageFrame: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private readoutPanel: HTMLElement | null = null;
  private readoutSlot: HTMLElement | null = null;
  private readoutHeader: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  
  private themeButton: HTMLButtonElement | null = null;
  private modeButton: HTMLButtonElement | null = null;
  private sidebarToggle: HTMLButtonElement | null = null;
  private readoutToggle: HTMLButtonElement | null = null;
  
  private leftRatio = 0.38;
  private isDragging = false;
  private readoutCollapsed = true;
  private sidebarHidden = false;
  private isCompactViewport = false;
  private mode: 'normal' | 'presentation' = 'normal';
  
  // 读数面板相关
  private readoutResizeObserver: ResizeObserver | null = null;
  private readoutDragCleanup: (() => void) | null = null;
  private readoutResizeHandle: HTMLElement | null = null;
  private isReadoutResizing = false;
  
  // 浮动控制条
  private floatingControls: HTMLElement | null = null;
  private floatingCallbacks: {
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  } = {};
  
  constructor(container: HTMLElement, config: SplitRightConfig = {}) {
    super(container, config);
    
    const cfg = this.config as SplitRightConfig;
    this.leftRatio = cfg.defaultLeftRatio ?? 0.38;
    this.readoutCollapsed = cfg.readoutCollapsed ?? true;
  }
  
  render(container: HTMLElement): LayoutSlots {
    const cfg = this.config as SplitRightConfig;
    const hasGraph = cfg.hasGraph !== false; // 默认 true
    const hideHeader = cfg.hideHeader ?? false;
    const title = cfg.title ?? '标题';
    const subtitle = cfg.subtitle ?? '';
    const readoutLabel = cfg.readoutLabel ?? '数据读数';
    
    container.classList.add('teaching-demo', 'v2-layout');
    container.setAttribute('data-mode', this.mode);
    container.setAttribute('data-theme', this.currentTheme);
    container.setAttribute('data-has-graph', String(hasGraph));
    container.setAttribute('data-control-columns', String(cfg.controlColumns ?? 'auto'));
    
    if (hideHeader) {
      container.classList.add('is-compact-sidebar');
    }
    
    container.style.cssText = `
      display: grid;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      grid-template-columns: minmax(${cfg.leftMinWidth ?? 260}px, ${this.leftRatio * 100}%) 8px 1fr;
    `;
    
    // 左侧面板
    this.leftPanel = document.createElement('aside');
    this.leftPanel.className = 'teaching-left-panel';
    
    if (!hideHeader) {
      this.header = document.createElement('header');
      this.header.className = 'teaching-header';
      this.header.innerHTML = `
        <h1 class="teaching-title">${title}</h1>
        ${subtitle ? `<p class="teaching-subtitle">${subtitle}</p>` : ''}
      `;
      this.leftPanel.appendChild(this.header);
    }
    
    // 控制区
    this.controlSection = document.createElement('section');
    this.controlSection.className = 'control-section';
    this.controlSection.setAttribute('data-collapsed', 'false');
    this.controlSection.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">控制区</h2>
        <button type="button" class="section-toggle" data-target="control" aria-label="折叠控制区">−</button>
      </div>
    `;
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'control-slot';
    this.controlSection.appendChild(this.controlSlot);
    this.leftPanel.appendChild(this.controlSection);
    
    // 图表区
    if (hasGraph) {
      this.graphSection = document.createElement('section');
      this.graphSection.className = 'graph-section';
      this.graphSection.setAttribute('data-collapsed', 'false');
      this.graphSection.innerHTML = `
        <div class="section-header">
          <h2 class="section-title">图表</h2>
          <button type="button" class="section-toggle" data-target="graph" aria-label="折叠图表区">−</button>
        </div>
      `;
      this.graphSlot = document.createElement('div');
      this.graphSlot.className = 'graph-slot';
      this.graphSection.appendChild(this.graphSlot);
      this.leftPanel.appendChild(this.graphSection);
    }
    
    container.appendChild(this.leftPanel);
    
    // 分隔条
    this.resizer = document.createElement('div');
    this.resizer.className = 'panel-resizer';
    this.resizer.setAttribute('role', 'separator');
    this.resizer.setAttribute('aria-orientation', 'vertical');
    this.resizer.setAttribute('aria-label', '调整面板宽度');
    this.resizer.setAttribute('tabindex', '0');
    container.appendChild(this.resizer);
    
    // 右侧面板
    this.rightPanel = document.createElement('section');
    this.rightPanel.className = 'teaching-right-panel';
    
    // 工具栏
    this.stageToolbar = document.createElement('div');
    this.stageToolbar.className = 'stage-toolbar';
    this.stageToolbar.innerHTML = `
      <button type="button" class="sidebar-toggle">隐藏控制面板</button>
      <div class="toolbar-actions">
        <button type="button" class="mode-toggle" aria-label="切换到演示模式">演示</button>
        <button type="button" class="shell-theme-toggle" aria-label="切换到夜间主题">夜间</button>
      </div>
    `;
    this.rightPanel.appendChild(this.stageToolbar);
    
    // 浮动控制条由 setFloatingControls 方法延迟创建
    
    this.sidebarToggle = this.stageToolbar.querySelector('.sidebar-toggle') as HTMLButtonElement;
    this.modeButton = this.stageToolbar.querySelector('.mode-toggle') as HTMLButtonElement;
    this.themeButton = this.stageToolbar.querySelector('.shell-theme-toggle') as HTMLButtonElement;
    
    // 动画区
    this.stageFrame = document.createElement('div');
    this.stageFrame.className = 'stage-frame';
    this.stageSlot = document.createElement('div');
    this.stageSlot.className = 'stage-slot';
    this.stageCanvas = document.createElement('canvas');
    this.stageCanvas.className = 'stage-canvas';
    this.stageCanvas.setAttribute('aria-label', '动画演示区域');
    this.stageSlot.appendChild(this.stageCanvas);
    this.stageFrame.appendChild(this.stageSlot);
    this.rightPanel.appendChild(this.stageFrame);
    
    // 数据读数面板 - 改进版：可拖拽、可调节大小、自适应列数
    this.readoutPanel = document.createElement('div');
    this.readoutPanel.className = `readout-panel ${this.readoutCollapsed ? 'is-collapsed' : ''}`;
    this.readoutPanel.setAttribute('role', 'region');
    this.readoutPanel.setAttribute('aria-label', readoutLabel);
    // 默认位置和大小
    this.readoutPanel.style.cssText = `
      position: absolute;
      right: 12px;
      top: 60px;
      min-width: 200px;
      width: 280px;
      max-width: 400px;
      z-index: 100;
    `;
    
    this.readoutHeader = document.createElement('div');
    this.readoutHeader.className = 'readout-header';
    this.readoutHeader.innerHTML = `
      <span class="readout-title">${readoutLabel}</span>
      <div class="readout-actions">
        <button type="button" class="readout-resize-toggle" title="调整大小">⤢</button>
        <button type="button" class="readout-toggle" aria-label="${this.readoutCollapsed ? '展开' : '折叠'}">${this.readoutCollapsed ? '展开' : '折叠'}</button>
      </div>
    `;
    
    this.readoutSlot = document.createElement('ul');
    // 使用类名控制显示，避免内联样式覆盖折叠状态
    this.readoutSlot.className = 'readout-slot readout-slot--adaptive';
    // 添加 data-columns 属性用于 CSS 选择器控制列数
    this.readoutSlot.setAttribute('data-columns', 'auto');
    
    this.readoutPanel.appendChild(this.readoutHeader);
    this.readoutPanel.appendChild(this.readoutSlot);
    this.rightPanel.appendChild(this.readoutPanel);
    
    this.readoutToggle = this.readoutHeader.querySelector('.readout-toggle') as HTMLButtonElement;
    
    container.appendChild(this.rightPanel);
    
    // 绑定事件
    this.bindEvents();
    
    // 初始化读数面板功能
    this.initReadoutPanelFeatures();
    
    return {
      header: this.header || undefined,
      control: this.controlSlot,
      animation: this.stageSlot,
      graph: this.graphSlot || undefined,
      readout: this.readoutSlot
    };
  }
  
  private bindEvents(): void {
    // 分隔条拖拽
    if (this.resizer) {
      this.resizer.addEventListener('mousedown', this.handleResizerMouseDown.bind(this));
    }
    
    // 侧边栏折叠
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
    }
    
    // 数据区折叠（主按钮）
    if (this.readoutToggle) {
      this.readoutToggle.addEventListener('click', this.toggleReadout.bind(this));
    }
    
    // 数据区大小调整按钮（⤢）- 点击展开/折叠作为快捷操作
    const resizeToggleBtn = this.readoutPanel?.querySelector('.readout-resize-toggle') as HTMLButtonElement | null;
    if (resizeToggleBtn) {
      resizeToggleBtn.addEventListener('click', this.toggleReadout.bind(this));
    }
    
    // 区域折叠按钮
    this.container.querySelectorAll('.section-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-target');
        if (target === 'control') {
          this.toggleControlSection();
        } else if (target === 'graph') {
          this.toggleGraphSection();
        }
      });
    });
    
    // 主题切换按钮
    if (this.themeButton) {
      this.themeButton.addEventListener('click', () => {
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
        this.container.dispatchEvent(new CustomEvent('layout:themechange', {
          detail: { theme: nextTheme },
          bubbles: true
        }));
      });
    }
    
    // 模式切换按钮
    if (this.modeButton) {
      this.modeButton.addEventListener('click', () => {
        const nextMode = this.mode === 'normal' ? 'presentation' : 'normal';
        this.setMode(nextMode);
        this.container.dispatchEvent(new CustomEvent('layout:modechange', {
          detail: { mode: nextMode },
          bubbles: true
        }));
      });
    }
  }
  
  /**
   * 初始化读数面板的高级功能
   */
  private initReadoutPanelFeatures(): void {
    if (!this.readoutPanel || !this.readoutHeader || !this.readoutSlot) return;
    
    // 1. 使读数面板可拖拽
    this.readoutDragCleanup = this.makeElementDraggable(this.readoutPanel, this.readoutHeader);
    
    // 2. 根据面板宽度自动调整列数
    this.initReadoutAdaptiveColumns();
    
    // 3. 添加大小调节手柄
    this.addReadoutResizeHandle();
  }
  
  /**
   * 使元素可拖拽（修正版 - 正确处理相对定位）
   */
  private makeElementDraggable(element: HTMLElement, handle: HTMLElement | null): (() => void) {
    if (!handle) return () => {};
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    handle.style.cursor = 'move';
    
    const onMouseDown = (e: MouseEvent) => {
      // 只响应左键
      if (e.button !== 0) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // 获取当前计算后的 left/top 值（解析已有值，而非视口位置）
      const computedStyle = window.getComputedStyle(element);
      const currentLeft = parseFloat(computedStyle.left) || 0;
      const currentTop = parseFloat(computedStyle.top) || 0;
      
      // 如果当前是 right/bottom 定位，转换为 left/top
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
      
      // 切换到 left/top 定位
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
      
      // 边界限制：保持在父容器可视范围内
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
    
    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }
  
  /**
   * 根据读数面板宽度自动调整列数
   */
  private initReadoutAdaptiveColumns(): void {
    if (!this.readoutPanel || !this.readoutSlot) return;
    
    this.readoutResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        
        // 移除旧的列数类
        this.readoutSlot!.classList.remove('readout-slot--1col', 'readout-slot--2col', 'readout-slot--3col', 'readout-slot--auto');
        
        // 根据宽度设置列数类
        if (width < 220) {
          this.readoutSlot!.classList.add('readout-slot--1col');
          this.readoutSlot!.setAttribute('data-columns', '1');
        } else if (width < 320) {
          this.readoutSlot!.classList.add('readout-slot--auto');
          this.readoutSlot!.setAttribute('data-columns', 'auto');
        } else if (width < 420) {
          this.readoutSlot!.classList.add('readout-slot--2col');
          this.readoutSlot!.setAttribute('data-columns', '2');
        } else {
          this.readoutSlot!.classList.add('readout-slot--3col');
          this.readoutSlot!.setAttribute('data-columns', '3');
        }
      }
    });
    
    this.readoutResizeObserver.observe(this.readoutPanel);
  }
  
  /**
   * 添加读数面板大小调节手柄
   */
  private addReadoutResizeHandle(): void {
    if (!this.readoutPanel) return;
    
    // 创建调节手柄
    this.readoutResizeHandle = document.createElement('div');
    this.readoutResizeHandle.className = 'readout-resize-handle';
    this.readoutResizeHandle.style.cssText = `
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
    
    this.readoutResizeHandle.addEventListener('mouseenter', () => {
      this.readoutResizeHandle!.style.opacity = '1';
    });
    
    this.readoutResizeHandle.addEventListener('mouseleave', () => {
      if (!this.isReadoutResizing) {
        this.readoutResizeHandle!.style.opacity = '0.5';
      }
    });
    
    this.readoutResizeHandle.addEventListener('mousedown', (e) => {
      this.isReadoutResizing = true;
      e.preventDefault();
      e.stopPropagation();
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = this.readoutPanel!.offsetWidth;
      const startHeight = this.readoutPanel!.offsetHeight;
      
      const onMouseMove = (e: MouseEvent) => {
        if (!this.isReadoutResizing) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const newWidth = Math.max(180, Math.min(450, startWidth + dx));
        const newHeight = Math.max(100, Math.min(500, startHeight + dy));
        
        this.readoutPanel!.style.width = `${newWidth}px`;
        // 高度由内容决定，但最大高度可以调整
        this.readoutSlot!.style.maxHeight = `${newHeight - 50}px`;
      };
      
      const onMouseUp = () => {
        this.isReadoutResizing = false;
        if (this.readoutResizeHandle) {
          this.readoutResizeHandle.style.opacity = '0.5';
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    this.readoutPanel.appendChild(this.readoutResizeHandle);
    
    // 添加样式到面板
    this.readoutPanel.style.position = 'absolute';
    this.readoutPanel.style.resize = 'none'; // 使用自定义调节代替
  }
  
  private handleResizerMouseDown(e: MouseEvent): void {
    if (this.isCompactViewport) return;
    
    this.isDragging = true;
    e.preventDefault();
    this.resizer?.classList.add('is-dragging');
    
    const startX = e.clientX;
    const startWidth = this.leftPanel?.clientWidth || 0;
    const containerWidth = this.container.clientWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;
      
      const cfg = this.config as SplitRightConfig;
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, containerWidth * 0.5);
      
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      this.leftRatio = clampedWidth / containerWidth;
      
      this.container.style.gridTemplateColumns = `${clampedWidth}px 8px 1fr`;
    };
    
    const handleMouseUp = () => {
      this.isDragging = false;
      this.resizer?.classList.remove('is-dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = e.key === 'ArrowLeft' ? -10 : 10;
      const cfg = this.config as SplitRightConfig;
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, containerWidth * 0.5);
      const currentWidth = this.leftPanel?.clientWidth || minWidth;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, currentWidth + step));
      this.leftRatio = newWidth / containerWidth;
      this.container.style.gridTemplateColumns = `${newWidth}px 8px 1fr`;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    this.resizer?.addEventListener('keydown', handleKeyDown, { once: true });
  }
  
  private toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
    
    if (this.sidebarHidden) {
      this.container.style.gridTemplateColumns = '0px 8px 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.display = 'none';
      }
    } else {
      const cfg = this.config as SplitRightConfig;
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = cfg.leftMaxWidth ?? 960;
      const width = Math.max(minWidth, Math.min(maxWidth, this.container.clientWidth * this.leftRatio));
      this.container.style.gridTemplateColumns = `${width}px 8px 1fr`;
      if (this.leftPanel) {
        this.leftPanel.style.display = 'flex';
      }
    }
    
    if (this.sidebarToggle) {
      this.sidebarToggle.textContent = this.sidebarHidden ? '显示控制面板' : '隐藏控制面板';
    }
  }
  
  private toggleReadout(): void {
    this.readoutCollapsed = !this.readoutCollapsed;
    
    if (this.readoutPanel) {
      this.readoutPanel.classList.toggle('is-collapsed', this.readoutCollapsed);
    }
    
    // 重新查询按钮（确保引用有效）
    const toggleBtn = this.readoutPanel?.querySelector('.readout-toggle') as HTMLButtonElement | null;
    if (toggleBtn) {
      toggleBtn.textContent = this.readoutCollapsed ? '展开' : '折叠';
      toggleBtn.setAttribute('aria-label', this.readoutCollapsed ? '展开' : '折叠');
    }
    
    // 同步更新保存的引用
    this.readoutToggle = toggleBtn;
  }
  
  /**
   * 初始化浮动控制条事件
   */
  /**
   * 设置浮动控制条的回调
   */
  setFloatingControls(callbacks: {
    onTogglePlay?: () => void;
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  }): void {
    // 如果已存在，先移除旧的
    if (this.floatingControls) {
      (this.floatingControls as any).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }
    
    // 兼容 onPlayPause 旧命名
    const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
    
    // 使用 createFloatingControls 创建新的
    this.floatingControls = createFloatingControls({
      isPlaying: callbacks.isPlaying,
      onTogglePlay: togglePlay,
      onReset: callbacks.onReset,
      onSpeedChange: callbacks.onSpeedChange,
      getSpeed: callbacks.getSpeed
    });
    
    // 添加到舞台
    if (this.stageSlot) {
      this.stageSlot.appendChild(this.floatingControls);
    }
  }
  
  /**
   * 获取浮动控制条容器
   */
  getFloatingControls(): HTMLElement | null {
    return this.floatingControls;
  }
  
  /**
   * 刷新浮动控制条状态
   */
  refreshFloatingControls(): void {
    // createFloatingControls 内部有定时器自动更新，无需手动调用
  }
  
  private toggleControlSection(): void {
    if (!this.controlSection) return;
    
    const isCollapsed = this.controlSection.getAttribute('data-collapsed') === 'true';
    this.controlSection.setAttribute('data-collapsed', String(!isCollapsed));
    
    const toggle = this.controlSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
  }
  
  private toggleGraphSection(): void {
    if (!this.graphSection) return;
    
    const isCollapsed = this.graphSection.getAttribute('data-collapsed') === 'true';
    this.graphSection.setAttribute('data-collapsed', String(!isCollapsed));
    
    const toggle = this.graphSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
  }
  
  handleResize(width: number, height: number): void {
    const mobileBreakpoint = this.config.mobileBreakpoint || 768;
    const tabletBreakpoint = this.config.tabletBreakpoint || 1024;
    
    this.isCompactViewport = width < mobileBreakpoint;
    
    if (width < mobileBreakpoint) {
      this.container.style.gridTemplateColumns = '1fr';
      this.container.style.gridTemplateRows = 'auto 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '50vh';
        this.leftPanel.style.borderRight = 'none';
        this.leftPanel.style.borderBottom = '1px solid var(--color-border-color)';
      }
      if (this.resizer) {
        this.resizer.style.display = 'none';
      }
    } else if (width < tabletBreakpoint) {
      this.container.style.gridTemplateColumns = '280px 8px 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '';
        this.leftPanel.style.borderRight = '1px solid var(--color-border-color)';
        this.leftPanel.style.borderBottom = 'none';
      }
      if (this.resizer) {
        this.resizer.style.display = 'block';
      }
    } else {
      const cfg = this.config as SplitRightConfig;
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, width * 0.5);
      const leftWidth = Math.max(minWidth, Math.min(maxWidth, width * this.leftRatio));
      this.container.style.gridTemplateColumns = `${leftWidth}px 8px 1fr`;
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '';
        this.leftPanel.style.borderRight = '1px solid var(--color-border-color)';
        this.leftPanel.style.borderBottom = 'none';
      }
      if (this.resizer) {
        this.resizer.style.display = 'block';
      }
    }
  }
  
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.container.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    if (this.themeButton) {
      this.themeButton.textContent = theme === 'dark' ? '白天' : '夜间';
      this.themeButton.setAttribute('aria-label', theme === 'dark' ? '切换到白天主题' : '切换到夜间主题');
    }
  }
  
  setMode(mode: 'normal' | 'presentation'): void {
    this.mode = mode;
    this.container.setAttribute('data-mode', mode);
    
    if (this.modeButton) {
      this.modeButton.textContent = mode === 'presentation' ? '标准' : '演示';
      this.modeButton.setAttribute('aria-label', mode === 'presentation' ? '切换到标准模式' : '切换到演示模式');
    }
  }
  
  getThemeButton(): HTMLButtonElement | null {
    return this.themeButton;
  }
  
  getModeButton(): HTMLButtonElement | null {
    return this.modeButton;
  }
  
  setReadout(items: Array<{ label: string; value: string | number; layout?: 'half' | 'full' }>): void {
    if (!this.readoutSlot) return;
    
    this.readoutSlot.innerHTML = items.map(item => `
      <li class="readout-item ${item.layout === 'half' ? 'readout-item--half' : ''}">
        <span class="readout-label">${item.label}</span>
        <strong class="readout-value">${item.value}</strong>
      </li>
    `).join('');
  }
  
  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }
  
  updateTransportState(state: TransportState): void {
    if (this.floatingControls && (this.floatingControls as any).setState) {
      (this.floatingControls as any).setState(state);
    }
  }
  
  getCanvas(): HTMLCanvasElement | null {
    return this.stageCanvas;
  }
  
  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    const cfg = this.config as SplitRightConfig;
    
    const configs: Partial<Record<SlotName, SlotConfig>> = {
      header: { visible: !cfg.hideHeader },
      control: { visible: true },
      animation: { visible: true },
      graph: { visible: cfg.hasGraph ?? true },
      readout: { visible: true, collapsed: this.readoutCollapsed }
    };
    
    return configs[slot];
  }
  
  /**
   * 卸载时清理资源
   */
  async unmount(): Promise<void> {
    // 清理浮动控制条定时器
    if (this.floatingControls) {
      (this.floatingControls as { dispose?: () => void }).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }
    
    // 清理拖拽
    if (this.readoutDragCleanup) {
      this.readoutDragCleanup();
      this.readoutDragCleanup = null;
    }
    
    // 清理 ResizeObserver
    if (this.readoutResizeObserver) {
      this.readoutResizeObserver.disconnect();
      this.readoutResizeObserver = null;
    }
    
    await super.unmount();
  }
}

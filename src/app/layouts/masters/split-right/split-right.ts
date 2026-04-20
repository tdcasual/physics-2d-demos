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
import type {
  LayoutSlots,
  LayoutConfig,
  Theme,
  SlotName,
  SlotConfig,
  TransportState,
  ReadoutItem
} from '../../types';
import {
  createFloatingControls,
  type FloatingControls
} from '../../../../ui/floating-controls-legacy';
import { ReadoutPanelManager } from './readout-panel';
import { ResizerBehavior } from './resizer-behavior';

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
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

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
  private header: HTMLElement | null = null;

  private themeButton: HTMLButtonElement | null = null;
  private modeButton: HTMLButtonElement | null = null;
  private sidebarToggle: HTMLButtonElement | null = null;

  private leftRatio = 0.38;
  private isDragging = false;
  private sidebarHidden = false;
  private isCompactViewport = false;
  private mode: 'normal' | 'presentation' = 'normal';

  // 读数面板管理器
  private readoutManager: ReadoutPanelManager | null = null;

  // 分隔条拖拽行为
  private resizerBehavior: ResizerBehavior | null = null;

  // 浮动控制条
  private floatingControls: FloatingControls | null = null;
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
  }

  render(container: HTMLElement): LayoutSlots {
    const cfg = this.config as SplitRightConfig;
    const hasGraph = cfg.hasGraph !== false; // 默认 true
    const hideHeader = cfg.hideHeader ?? false;
    const title = cfg.title ?? '标题';
    const subtitle = cfg.subtitle ?? '';
    const readoutLabel = cfg.readoutLabel ?? '数据读数';

    container.classList.add('teaching-demo', 'v2-layout');
    container.dataset.testid = 'split-right-layout';
    container.setAttribute('data-mode', this.mode);
    container.setAttribute('data-theme', this.currentTheme);
    container.setAttribute('data-has-graph', String(hasGraph));
    container.setAttribute(
      'data-control-columns',
      String(cfg.controlColumns ?? 'auto')
    );

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
    this.leftPanel.dataset.testid = 'left-panel';

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

    this.resizerBehavior = new ResizerBehavior(
      container,
      this.resizer,
      this.leftPanel,
      () => this.config as SplitRightConfig,
      (ratio) => {
        this.leftRatio = ratio;
      }
    );

    // 右侧面板
    this.rightPanel = document.createElement('section');
    this.rightPanel.className = 'teaching-right-panel';
    this.rightPanel.dataset.testid = 'right-panel';

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

    this.sidebarToggle = this.stageToolbar.querySelector(
      '.sidebar-toggle'
    ) as HTMLButtonElement;
    this.modeButton = this.stageToolbar.querySelector(
      '.mode-toggle'
    ) as HTMLButtonElement;
    this.themeButton = this.stageToolbar.querySelector(
      '.shell-theme-toggle'
    ) as HTMLButtonElement;

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
    const readoutPanel = document.createElement('div');
    const readoutCollapsed = cfg.readoutCollapsed ?? true;
    readoutPanel.className = `readout-panel ${readoutCollapsed ? 'is-collapsed' : ''}`;
    readoutPanel.setAttribute('role', 'region');
    readoutPanel.setAttribute('aria-label', readoutLabel);
    readoutPanel.style.cssText = `
      position: absolute;
      right: 12px;
      top: 60px;
      min-width: 200px;
      width: 280px;
      max-width: 400px;
      z-index: 100;
    `;

    const readoutHeader = document.createElement('div');
    readoutHeader.className = 'readout-header';
    readoutHeader.innerHTML = `
      <span class="readout-title">${readoutLabel}</span>
      <div class="readout-actions">
        <button type="button" class="readout-resize-toggle" title="调整大小">⤢</button>
        <button type="button" class="readout-toggle" aria-label="${readoutCollapsed ? '展开' : '折叠'}">${readoutCollapsed ? '展开' : '折叠'}</button>
      </div>
    `;

    const readoutSlot = document.createElement('ul');
    readoutSlot.className = 'readout-slot readout-slot--adaptive';
    readoutSlot.setAttribute('data-columns', 'auto');

    readoutPanel.appendChild(readoutHeader);
    readoutPanel.appendChild(readoutSlot);
    this.rightPanel.appendChild(readoutPanel);

    const readoutToggle = readoutHeader.querySelector(
      '.readout-toggle'
    ) as HTMLButtonElement;

    this.readoutManager = new ReadoutPanelManager({
      panel: readoutPanel,
      header: readoutHeader,
      slot: readoutSlot,
      toggleBtn: readoutToggle,
      collapsed: readoutCollapsed
    });

    container.appendChild(this.rightPanel);

    // 绑定事件
    this.bindEvents();

    // 初始化读数面板功能
    this.readoutManager.initFeatures();

    return {
      header: this.header || undefined,
      control: this.controlSlot,
      animation: this.stageSlot,
      graph: this.graphSlot || undefined,
      readout: readoutSlot
    };
  }

  private bindEvents(): void {
    // 分隔条拖拽
    if (this.resizer && this.resizerBehavior) {
      this.resizer.addEventListener('mousedown', (e) => {
        this.resizerBehavior!.onMouseDown(e, this.isCompactViewport);
      });
    }

    // 侧边栏折叠
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener(
        'click',
        this.toggleSidebar.bind(this)
      );
    }

    // 数据区折叠（主按钮）
    if (this.readoutManager) {
      const toggleBtn = this.readoutManager
        .getPanel()
        .querySelector('.readout-toggle') as HTMLButtonElement | null;
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () =>
          this.readoutManager?.toggle()
        );
      }
      const resizeToggleBtn = this.readoutManager
        .getPanel()
        .querySelector('.readout-resize-toggle') as HTMLButtonElement | null;
      if (resizeToggleBtn) {
        resizeToggleBtn.addEventListener('click', () =>
          this.readoutManager?.toggle()
        );
      }
    }

    // 区域折叠按钮
    this.container.querySelectorAll('.section-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute(
          'data-target'
        );
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
        this.container.dispatchEvent(
          new CustomEvent('layout:themechange', {
            detail: { theme: nextTheme },
            bubbles: true
          })
        );
      });
    }

    // 模式切换按钮
    if (this.modeButton) {
      this.modeButton.addEventListener('click', () => {
        const nextMode = this.mode === 'normal' ? 'presentation' : 'normal';
        this.setMode(nextMode);
        this.container.dispatchEvent(
          new CustomEvent('layout:modechange', {
            detail: { mode: nextMode },
            bubbles: true
          })
        );
      });
    }
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
      const width = Math.max(
        minWidth,
        Math.min(maxWidth, this.container.clientWidth * this.leftRatio)
      );
      this.container.style.gridTemplateColumns = `${width}px 8px 1fr`;
      if (this.leftPanel) {
        this.leftPanel.style.display = 'flex';
      }
    }

    if (this.sidebarToggle) {
      this.sidebarToggle.textContent = this.sidebarHidden
        ? '显示控制面板'
        : '隐藏控制面板';
    }
  }

  private toggleReadout(): void {
    this.readoutManager?.toggle();
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
      this.floatingControls.dispose?.();
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

    const isCollapsed =
      this.controlSection.getAttribute('data-collapsed') === 'true';
    this.controlSection.setAttribute('data-collapsed', String(!isCollapsed));

    const toggle = this.controlSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
  }

  private toggleGraphSection(): void {
    if (!this.graphSection) return;

    const isCollapsed =
      this.graphSection.getAttribute('data-collapsed') === 'true';
    this.graphSection.setAttribute('data-collapsed', String(!isCollapsed));

    const toggle = this.graphSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
  }

  handleResize(width: number): void {
    const mobileBreakpoint = this.config.mobileBreakpoint || 768;
    const tabletBreakpoint = this.config.tabletBreakpoint || 1024;

    this.isCompactViewport = width < mobileBreakpoint;

    if (width < mobileBreakpoint) {
      this.container.style.gridTemplateColumns = '1fr';
      this.container.style.gridTemplateRows = 'auto 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '50vh';
        this.leftPanel.style.borderRight = 'none';
        this.leftPanel.style.borderBottom =
          '1px solid var(--color-border-color)';
      }
      if (this.resizer) {
        this.resizer.style.display = 'none';
      }
    } else if (width < tabletBreakpoint) {
      this.container.style.gridTemplateColumns = '280px 8px 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '';
        this.leftPanel.style.borderRight =
          '1px solid var(--color-border-color)';
        this.leftPanel.style.borderBottom = 'none';
      }
      if (this.resizer) {
        this.resizer.style.display = 'block';
      }
    } else {
      const cfg = this.config as SplitRightConfig;
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, width * 0.5);
      const leftWidth = Math.max(
        minWidth,
        Math.min(maxWidth, width * this.leftRatio)
      );
      this.container.style.gridTemplateColumns = `${leftWidth}px 8px 1fr`;
      if (this.leftPanel) {
        this.leftPanel.style.maxHeight = '';
        this.leftPanel.style.borderRight =
          '1px solid var(--color-border-color)';
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
      this.themeButton.setAttribute(
        'aria-label',
        theme === 'dark' ? '切换到白天主题' : '切换到夜间主题'
      );
    }
  }

  setMode(mode: 'normal' | 'presentation'): void {
    this.mode = mode;
    this.container.setAttribute('data-mode', mode);

    if (this.modeButton) {
      this.modeButton.textContent = mode === 'presentation' ? '标准' : '演示';
      this.modeButton.setAttribute(
        'aria-label',
        mode === 'presentation' ? '切换到标准模式' : '切换到演示模式'
      );
    }
  }

  getThemeButton(): HTMLButtonElement | null {
    return this.themeButton;
  }

  getModeButton(): HTMLButtonElement | null {
    return this.modeButton;
  }

  setReadout(
    items: Array<{
      label: string;
      value: string | number;
      layout?: 'half' | 'full';
    }>
  ): void {
    const slot = this.readoutManager?.getSlot();
    if (!slot) return;

    slot.innerHTML = items
      .map(
        (item) => `
      <li class="readout-item ${item.layout === 'half' ? 'readout-item--half' : ''}">
        <span class="readout-label">${item.label}</span>
        <strong class="readout-value">${item.value}</strong>
      </li>
    `
      )
      .join('');
  }

  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }

  updateTransportState(state: TransportState): void {
    if (this.floatingControls?.setState) {
      this.floatingControls.setState(state);
    }
  }

  /**
   * 设置状态栏文本
   */
  setStatus(text: string): void {
    this.updateStatus(text);
  }

  /**
   * 更新状态栏文本（LayoutMaster 接口）
   */
  updateStatus(text: string): void {
    // 在工具栏显示简短状态，或在读数面板第一行显示
    const statusEl = this.container.querySelector('.layout-status');
    if (statusEl) {
      statusEl.textContent = text;
    } else {
      const slot = this.readoutManager?.getSlot();
      if (slot) {
        const existing = slot.querySelector('.readout-status');
        if (existing) {
          existing.querySelector('.readout-value')!.textContent = text;
        } else {
          const li = document.createElement('li');
          li.className = 'readout-item readout-status';
          li.innerHTML = `<span class="readout-label">状态</span><strong class="readout-value">${text}</strong>`;
          slot.insertBefore(li, slot.firstChild);
        }
      }
    }
  }

  /**
   * 设置左侧宽度比例
   */
  setLeftRatio(ratio: number): void {
    const cfg = this.config as SplitRightConfig;
    const minWidth = cfg.leftMinWidth ?? 260;
    const maxWidth = cfg.leftMaxWidth ?? 960;
    const containerWidth = this.container.clientWidth;
    const minRatio = minWidth / containerWidth;
    const maxRatio = Math.min(maxWidth / containerWidth, 0.5);
    this.leftRatio = Math.max(minRatio, Math.min(maxRatio, ratio));

    if (!this.isCompactViewport && this.leftPanel) {
      const leftWidth = Math.max(
        minWidth,
        Math.min(maxWidth, containerWidth * this.leftRatio)
      );
      this.container.style.gridTemplateColumns = `${leftWidth}px 8px 1fr`;
    }
  }

  /**
   * 获取当前左侧宽度比例
   */
  getLeftRatio(): number {
    return this.leftRatio;
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
      readout: {
        visible: true,
        collapsed: this.readoutManager?.isCollapsed ?? true
      }
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

    // 清理读数面板管理器
    this.readoutManager?.dispose();
    this.readoutManager = null;

    await super.unmount();
  }
}

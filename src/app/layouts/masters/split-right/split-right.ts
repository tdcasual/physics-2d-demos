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
import type { SceneDemoProfile } from '../../../demo-profile';

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

  // 事件监听器清理函数（防止 unmount 后泄漏）
  private eventCleanups: (() => void)[] = [];

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
      const h1 = document.createElement('h1');
      h1.className = 'teaching-title';
      h1.textContent = title;
      this.header.appendChild(h1);
      if (subtitle) {
        const p = document.createElement('p');
        p.className = 'teaching-subtitle';
        p.textContent = subtitle;
        this.header.appendChild(p);
      }
      this.leftPanel.appendChild(this.header);
    }

    // 控制区
    this.controlSection = document.createElement('section');
    this.controlSection.className = 'control-section';
    this.controlSection.setAttribute('data-collapsed', 'false');
    const controlHeader = document.createElement('div');
    controlHeader.className = 'section-header';
    const controlH2 = document.createElement('h2');
    controlH2.className = 'section-title';
    controlH2.textContent = '控制区';
    const controlToggle = document.createElement('button');
    controlToggle.type = 'button';
    controlToggle.className = 'section-toggle';
    controlToggle.dataset.target = 'control';
    controlToggle.setAttribute('aria-label', '折叠控制区');
    controlToggle.textContent = '−';
    controlHeader.append(controlH2, controlToggle);
    this.controlSection.appendChild(controlHeader);
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'control-slot';
    this.controlSection.appendChild(this.controlSlot);
    this.leftPanel.appendChild(this.controlSection);

    // 图表区
    if (hasGraph) {
      this.graphSection = document.createElement('section');
      this.graphSection.className = 'graph-section';
      this.graphSection.setAttribute('data-collapsed', 'false');
      const graphHeader = document.createElement('div');
      graphHeader.className = 'section-header';
      const graphH2 = document.createElement('h2');
      graphH2.className = 'section-title';
      graphH2.textContent = '图表';
      const graphToggle = document.createElement('button');
      graphToggle.type = 'button';
      graphToggle.className = 'section-toggle';
      graphToggle.dataset.target = 'graph';
      graphToggle.setAttribute('aria-label', '折叠图表区');
      graphToggle.textContent = '−';
      graphHeader.append(graphH2, graphToggle);
      this.graphSection.appendChild(graphHeader);
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
    this.sidebarToggle = document.createElement('button');
    this.sidebarToggle.type = 'button';
    this.sidebarToggle.className = 'sidebar-toggle';
    this.sidebarToggle.textContent = '隐藏控制面板';
    const toolbarActions = document.createElement('div');
    toolbarActions.className = 'toolbar-actions';
    this.modeButton = document.createElement('button');
    this.modeButton.type = 'button';
    this.modeButton.className = 'mode-toggle';
    this.modeButton.setAttribute('aria-label', '切换到演示模式');
    this.modeButton.textContent = '演示';
    this.themeButton = document.createElement('button');
    this.themeButton.type = 'button';
    this.themeButton.className = 'shell-theme-toggle';
    this.themeButton.setAttribute('aria-label', '切换到夜间主题');
    this.themeButton.textContent = '夜间';
    toolbarActions.append(this.modeButton, this.themeButton);
    this.stageToolbar.append(this.sidebarToggle, toolbarActions);
    this.rightPanel.appendChild(this.stageToolbar);

    // 浮动控制条由 setFloatingControls 方法延迟创建

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
    const readoutTitle = document.createElement('span');
    readoutTitle.className = 'readout-title';
    readoutTitle.textContent = readoutLabel;
    const readoutActions = document.createElement('div');
    readoutActions.className = 'readout-actions';
    const resizeToggle = document.createElement('button');
    resizeToggle.type = 'button';
    resizeToggle.className = 'readout-resize-toggle';
    resizeToggle.title = '调整大小';
    resizeToggle.textContent = '⤢';
    const readoutToggle = document.createElement('button');
    readoutToggle.type = 'button';
    readoutToggle.className = 'readout-toggle';
    readoutToggle.setAttribute(
      'aria-label',
      readoutCollapsed ? '展开' : '折叠'
    );
    readoutToggle.textContent = readoutCollapsed ? '展开' : '折叠';
    readoutActions.append(resizeToggle, readoutToggle);
    readoutHeader.append(readoutTitle, readoutActions);

    const readoutSlot = document.createElement('ul');
    readoutSlot.className = 'readout-slot readout-slot--adaptive';
    readoutSlot.setAttribute('data-columns', 'auto');

    readoutPanel.appendChild(readoutHeader);
    readoutPanel.appendChild(readoutSlot);
    this.rightPanel.appendChild(readoutPanel);

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
    // 先清理旧监听器（防止 render 被多次调用时累积）
    this.eventCleanups.forEach((cleanup) => cleanup());
    this.eventCleanups = [];

    // 分隔条拖拽
    if (this.resizer && this.resizerBehavior) {
      const onMouseDown = (e: MouseEvent) => {
        this.resizerBehavior!.onMouseDown(e, this.isCompactViewport);
      };
      this.resizer.addEventListener('mousedown', onMouseDown);
      this.eventCleanups.push(() =>
        this.resizer?.removeEventListener('mousedown', onMouseDown)
      );
    }

    // 侧边栏折叠
    if (this.sidebarToggle) {
      const onToggleSidebar = this.toggleSidebar.bind(this);
      this.sidebarToggle.addEventListener('click', onToggleSidebar);
      this.eventCleanups.push(() =>
        this.sidebarToggle?.removeEventListener('click', onToggleSidebar)
      );
    }

    // 数据区折叠（主按钮）
    if (this.readoutManager) {
      const toggleBtn = this.readoutManager
        .getPanel()
        .querySelector('.readout-toggle') as HTMLButtonElement | null;
      if (toggleBtn) {
        const onToggle = () => this.readoutManager?.toggle();
        toggleBtn.addEventListener('click', onToggle);
        this.eventCleanups.push(() =>
          toggleBtn.removeEventListener('click', onToggle)
        );
      }
      const resizeToggleBtn = this.readoutManager
        .getPanel()
        .querySelector('.readout-resize-toggle') as HTMLButtonElement | null;
      if (resizeToggleBtn) {
        const onToggle = () => this.readoutManager?.toggle();
        resizeToggleBtn.addEventListener('click', onToggle);
        this.eventCleanups.push(() =>
          resizeToggleBtn.removeEventListener('click', onToggle)
        );
      }
    }

    // 区域折叠按钮
    const sectionToggleHandlers: {
      btn: Element;
      handler: (e: Event) => void;
    }[] = [];
    this.container.querySelectorAll('.section-toggle').forEach((btn) => {
      const handler = (e: Event) => {
        const target = (e.currentTarget as HTMLElement).getAttribute(
          'data-target'
        );
        if (target === 'control') {
          this.toggleControlSection();
        } else if (target === 'graph') {
          this.toggleGraphSection();
        }
      };
      btn.addEventListener('click', handler);
      sectionToggleHandlers.push({ btn, handler });
    });
    this.eventCleanups.push(() => {
      sectionToggleHandlers.forEach(({ btn, handler }) =>
        btn.removeEventListener('click', handler)
      );
    });

    // 主题切换按钮
    if (this.themeButton) {
      const onThemeClick = () => {
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
        this.container.dispatchEvent(
          new CustomEvent('layout:themechange', {
            detail: { theme: nextTheme },
            bubbles: true
          })
        );
      };
      this.themeButton.addEventListener('click', onThemeClick);
      this.eventCleanups.push(() =>
        this.themeButton?.removeEventListener('click', onThemeClick)
      );
    }

    // 模式切换按钮
    if (this.modeButton) {
      const onModeClick = () => {
        const nextMode = this.mode === 'normal' ? 'presentation' : 'normal';
        this.setMode(nextMode);
        this.container.dispatchEvent(
          new CustomEvent('layout:modechange', {
            detail: { mode: nextMode },
            bubbles: true
          })
        );
      };
      this.modeButton.addEventListener('click', onModeClick);
      this.eventCleanups.push(() =>
        this.modeButton?.removeEventListener('click', onModeClick)
      );
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

  /**
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

  // ========================================================================
  // 演示配置
  // ========================================================================

  applyDemoProfile(profile: SceneDemoProfile): void {
    // 1. 控制面板策略
    switch (profile.controlPanel) {
      case 'hidden':
        this.hideSidebar();
        break;
      case 'collapsed':
        this.collapseControlSection();
        break;
      case 'minimal':
        this.collapseGraphSection();
        break;
      case 'full':
        // 标准布局，不做额外调整
        break;
    }

    // 2. 读数面板策略
    switch (profile.readoutPanel) {
      case 'hidden':
        this.readoutManager?.setVisible(false);
        break;
      case 'overlay':
        this.readoutManager?.setPosition('overlay');
        this.readoutManager?.setCollapsed(false);
        this.readoutManager?.enlargeFont();
        break;
      case 'docked-top':
        this.readoutManager?.setPosition('docked-top');
        this.readoutManager?.setCollapsed(false);
        break;
      case 'docked-bottom':
        this.readoutManager?.setPosition('docked-bottom');
        this.readoutManager?.setCollapsed(false);
        break;
    }

    // 3. 图表区策略
    if (profile.graphPanel === 'hidden') {
      this.collapseGraphSection();
      if (this.graphSection) {
        this.graphSection.style.display = 'none';
      }
    } else if (profile.graphPanel === 'collapsed') {
      this.collapseGraphSection();
    }

    // 4. 触摸目标放大
    const minSize = profile.interactionHints?.touchTargetMinSize;
    if (minSize && minSize > 44) {
      this.container.style.setProperty('--demo-touch-min', `${minSize}px`);
      this.container.classList.add('demo-touch-optimized');
    }
  }

  resetDemoProfile(): void {
    this.showSidebar();
    this.expandControlSection();
    this.expandGraphSection();
    if (this.graphSection) {
      this.graphSection.style.display = '';
    }
    this.readoutManager?.resetPosition();
    this.readoutManager?.setCollapsed(true);
    this.readoutManager?.setVisible(true);
    this.readoutManager?.resetFont();
    this.container.classList.remove('demo-touch-optimized');
    this.container.style.removeProperty('--demo-touch-min');
  }

  private showSidebar(): void {
    if (!this.sidebarHidden) return;
    this.sidebarHidden = false;
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
    if (this.sidebarToggle) {
      this.sidebarToggle.textContent = '隐藏控制面板';
    }
  }

  private hideSidebar(): void {
    if (this.sidebarHidden) return;
    this.sidebarHidden = true;
    this.container.style.gridTemplateColumns = '0px 8px 1fr';
    if (this.leftPanel) {
      this.leftPanel.style.display = 'none';
    }
    if (this.sidebarToggle) {
      this.sidebarToggle.textContent = '显示控制面板';
    }
  }

  private expandControlSection(): void {
    if (!this.controlSection) return;
    this.controlSection.setAttribute('data-collapsed', 'false');
    const toggle = this.controlSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = '−';
    }
  }

  private collapseControlSection(): void {
    if (!this.controlSection) return;
    this.controlSection.setAttribute('data-collapsed', 'true');
    const toggle = this.controlSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = '+';
    }
  }

  private expandGraphSection(): void {
    if (!this.graphSection) return;
    this.graphSection.setAttribute('data-collapsed', 'false');
    const toggle = this.graphSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = '−';
    }
  }

  private collapseGraphSection(): void {
    if (!this.graphSection) return;
    this.graphSection.setAttribute('data-collapsed', 'true');
    const toggle = this.graphSection.querySelector('.section-toggle');
    if (toggle) {
      toggle.textContent = '+';
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

    slot.replaceChildren();
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = `readout-item ${item.layout === 'half' ? 'readout-item--half' : ''}`;
      const label = document.createElement('span');
      label.className = 'readout-label';
      label.textContent = item.label;
      const value = document.createElement('strong');
      value.className = 'readout-value';
      value.textContent = String(item.value);
      li.append(label, value);
      slot.appendChild(li);
    });
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
          const labelSpan = document.createElement('span');
          labelSpan.className = 'readout-label';
          labelSpan.textContent = '状态';
          const valueStrong = document.createElement('strong');
          valueStrong.className = 'readout-value';
          valueStrong.textContent = text;
          li.append(labelSpan, valueStrong);
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
    // 清理所有绑定的事件监听器
    this.eventCleanups.forEach((cleanup) => cleanup());
    this.eventCleanups = [];

    // 清理浮动控制条定时器
    if (this.floatingControls) {
      (this.floatingControls as { dispose?: () => void }).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }

    // 清理读数面板管理器
    this.readoutManager?.dispose();
    this.readoutManager = null;

    // 清理 DOM 引用，允许 GC 回收事件监听器
    this.leftPanel = null;
    this.rightPanel = null;
    this.resizer = null;
    this.resizerBehavior = null;
    this.controlSection = null;
    this.controlSlot = null;
    this.graphSection = null;
    this.graphSlot = null;
    this.stageToolbar = null;
    this.stageFrame = null;
    this.stageSlot = null;
    this.stageCanvas = null;
    this.header = null;
    this.themeButton = null;
    this.modeButton = null;
    this.sidebarToggle = null;

    await super.unmount();
  }
}

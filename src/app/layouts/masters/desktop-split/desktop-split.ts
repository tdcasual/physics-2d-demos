/**
 * DesktopSplitLayout - 桌面左右分栏布局公共基类
 *
 * 封装 split-right 和 split-right-graph-bottom 的公共逻辑：
 * - 左侧面板（header + control section）
 * - 垂直分隔条拖拽
 * - 工具栏（sidebarToggle + modeButton + themeButton）
 * - 动画区（stageFrame + stageSlot + stageCanvas）
 * - 浮动读数面板
 * - 主题/模式切换、侧边栏折叠、控制区折叠
 * - 演示配置（applyDemoProfile / resetDemoProfile）
 * - 运输控制、读数数据、状态更新
 *
 * 子类只需实现：
 * - id / name / description
 * - cssPrefix（或覆盖 getClassName）
 * - renderRightPanel() / 或覆盖 buildRightPanel()
 * - getGraphSection()
 * - getExtraSlotConfig()
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
import { ReadoutPanelManager } from '../split-right/readout-panel';
import { ResizerBehavior } from '../split-right/resizer-behavior';
import type { SceneDemoProfile } from '../../../demo-profile';

/** 桌面分栏布局配置 */
export interface DesktopSplitConfig extends LayoutConfig {
  defaultLeftRatio?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  readoutCollapsed?: boolean;
  hideHeader?: boolean;
  readoutLabel?: string;
  title?: string;
  subtitle?: string;
}

export abstract class DesktopSplitLayout extends BaseLayout {
  // 抽象属性（子类必须实现）
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  /** CSS 类名前缀，子类可覆盖 */
  protected abstract cssPrefix: string;

  /** 根容器额外类名 */
  protected get rootClassNames(): string[] {
    return [];
  }

  /** 根容器额外属性 */
  protected get rootAttributes(): Record<string, string> {
    return {};
  }

  // DOM 元素引用
  protected leftPanel: HTMLElement | null = null;
  protected rightPanel: HTMLElement | null = null;
  protected resizer: HTMLElement | null = null;
  protected controlSection: HTMLElement | null = null;
  protected controlSlot: HTMLElement | null = null;
  protected stageToolbar: HTMLElement | null = null;
  protected stageFrame: HTMLElement | null = null;
  protected stageSlot: HTMLElement | null = null;
  protected stageCanvas: HTMLCanvasElement | null = null;
  protected header: HTMLElement | null = null;
  protected themeButton: HTMLButtonElement | null = null;
  protected modeButton: HTMLButtonElement | null = null;
  protected sidebarToggle: HTMLButtonElement | null = null;

  // 读数面板
  protected readoutManager: ReadoutPanelManager | null = null;
  protected readoutSlot: HTMLElement | null = null;

  // 状态
  protected leftRatio = 0.35;
  protected sidebarHidden = false;
  protected isCompactViewport = false;
  protected mode: 'normal' | 'presentation' = 'normal';

  // 子模块
  protected resizerBehavior: ResizerBehavior | null = null;
  protected floatingControls: FloatingControls | null = null;

  // 事件清理
  protected eventCleanups: (() => void)[] = [];

  constructor(container: HTMLElement, config: DesktopSplitConfig = {}) {
    super(container, config);
    const cfg = this.config as DesktopSplitConfig;
    this.leftRatio = cfg.defaultLeftRatio ?? 0.35;
  }

  // ========================================================================
  // 类名生成（子类可覆盖以处理特殊映射）
  // ========================================================================

  protected getClassName(base: string): string {
    return `${this.cssPrefix}-${base}`;
  }

  // ========================================================================
  // 渲染主流程
  // ========================================================================

  render(container: HTMLElement): LayoutSlots {
    this.setupContainer(container);
    this.buildLeftPanel();
    this.buildVerticalResizer();
    this.buildRightPanel();
    this.bindCommonEvents();
    this.readoutManager?.initFeatures();

    return {
      header: this.header || undefined,
      control: this.controlSlot!,
      animation: this.stageSlot!,
      graph: this.resolveGraphSlot(),
      readout: this.readoutSlot!
    };
  }

  // ========================================================================
  // 容器设置
  // ========================================================================

  protected setupContainer(container: HTMLElement): void {
    container.classList.add('layout-master', ...this.rootClassNames);
    container.dataset.testid = `${this.id}-layout`;
    container.setAttribute('data-mode', this.mode);
    container.setAttribute('data-theme', this.currentTheme);

    // 应用额外属性
    for (const [key, value] of Object.entries(this.rootAttributes)) {
      container.setAttribute(key, value);
    }

    const cfg = this.config as DesktopSplitConfig;
    if (cfg.hideHeader) {
      container.classList.add('is-compact-sidebar');
    }

    container.style.cssText = `
      display: grid;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      grid-template-columns: minmax(${cfg.leftMinWidth ?? 260}px, ${this.leftRatio * 100}%) 8px 1fr;
    `;
  }

  // ========================================================================
  // 左侧面板
  // ========================================================================

  protected buildLeftPanel(): void {
    const cfg = this.config as DesktopSplitConfig;
    const hideHeader = cfg.hideHeader ?? false;

    this.leftPanel = document.createElement('aside');
    this.leftPanel.className = this.getClassName('left-panel');
    this.leftPanel.dataset.testid = 'left-panel';

    if (!hideHeader) {
      this.header = document.createElement('header');
      this.header.className = this.getClassName('header');
      const h1 = document.createElement('h1');
      h1.className = this.getClassName('title');
      h1.textContent = cfg.title ?? '标题';
      this.header.appendChild(h1);
      if (cfg.subtitle) {
        const p = document.createElement('p');
        p.className = this.getClassName('subtitle');
        p.textContent = cfg.subtitle;
        this.header.appendChild(p);
      }
      this.leftPanel.appendChild(this.header);
    }

    // 控制区
    this.controlSection = document.createElement('section');
    this.controlSection.className = this.getClassName('control-section');
    this.controlSection.setAttribute('data-collapsed', 'false');
    const controlHeader = document.createElement('div');
    controlHeader.className = this.getClassName('section-header');
    const controlH2 = document.createElement('h2');
    controlH2.className = this.getClassName('section-title');
    controlH2.textContent = '控制区';
    const controlToggle = document.createElement('button');
    controlToggle.type = 'button';
    controlToggle.className = this.getClassName('section-toggle');
    controlToggle.dataset.target = 'control';
    controlToggle.setAttribute('aria-label', '折叠控制区');
    controlToggle.textContent = '−';
    controlHeader.append(controlH2, controlToggle);
    this.controlSection.appendChild(controlHeader);
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = this.getClassName('control-slot');
    this.controlSection.appendChild(this.controlSlot);
    this.leftPanel.appendChild(this.controlSection);

    // 子类可在此添加额外内容（如图表区）
    this.onBuildLeftPanelExtra?.(this.leftPanel);

    this.container.appendChild(this.leftPanel);
  }

  /** 子类覆盖以在左侧面板添加额外内容 */
  protected onBuildLeftPanelExtra?(leftPanel: HTMLElement): void;

  // ========================================================================
  // 垂直分隔条
  // ========================================================================

  protected buildVerticalResizer(): void {
    this.resizer = document.createElement('div');
    this.resizer.className = this.getClassName('resizer-v');
    this.resizer.setAttribute('role', 'separator');
    this.resizer.setAttribute('aria-orientation', 'vertical');
    this.resizer.setAttribute('aria-label', '调整左侧面板宽度');
    this.resizer.setAttribute('tabindex', '0');
    this.container.appendChild(this.resizer);

    this.resizerBehavior = new ResizerBehavior(
      this.container,
      this.resizer,
      this.leftPanel,
      () => this.config as DesktopSplitConfig,
      (ratio) => {
        this.leftRatio = ratio;
      }
    );
  }

  // ========================================================================
  // 右侧面板（子类可覆盖）
  // ========================================================================

  protected buildRightPanel(): void {
    this.rightPanel = document.createElement('section');
    this.rightPanel.className = this.getClassName('right-panel');
    this.rightPanel.dataset.testid = 'right-panel';

    this.buildToolbar();
    this.buildStage();

    // 子类可在此添加额外内容（如水平分隔条 + 图表区）
    this.onBuildRightPanelExtra?.(this.rightPanel);

    this.buildReadoutPanel();

    this.container.appendChild(this.rightPanel);
  }

  /** 子类覆盖以在右侧面板添加额外内容 */
  protected onBuildRightPanelExtra?(rightPanel: HTMLElement): void;

  // ========================================================================
  // 工具栏
  // ========================================================================

  protected buildToolbar(): void {
    this.stageToolbar = document.createElement('div');
    this.stageToolbar.className = this.getClassName('stage-toolbar');
    this.sidebarToggle = document.createElement('button');
    this.sidebarToggle.type = 'button';
    this.sidebarToggle.className = this.getClassName('sidebar-toggle');
    this.sidebarToggle.textContent = '隐藏控制面板';
    const toolbarActions = document.createElement('div');
    toolbarActions.className = this.getClassName('toolbar-actions');
    this.modeButton = document.createElement('button');
    this.modeButton.type = 'button';
    this.modeButton.className = this.getClassName('mode-toggle');
    this.modeButton.setAttribute('aria-label', '切换到演示模式');
    this.modeButton.textContent = '演示';
    this.themeButton = document.createElement('button');
    this.themeButton.type = 'button';
    this.themeButton.className = this.getClassName('theme-toggle');
    this.themeButton.setAttribute('aria-label', '切换到夜间主题');
    this.themeButton.textContent = '夜间';
    toolbarActions.append(this.modeButton, this.themeButton);
    this.stageToolbar.append(this.sidebarToggle, toolbarActions);
    this.rightPanel!.appendChild(this.stageToolbar);
  }

  // ========================================================================
  // 动画区
  // ========================================================================

  protected buildStage(): void {
    this.stageFrame = document.createElement('div');
    this.stageFrame.className = this.getClassName('stage-frame');
    this.stageSlot = document.createElement('div');
    this.stageSlot.className = this.getClassName('stage-slot');
    this.stageCanvas = document.createElement('canvas');
    this.stageCanvas.className = this.getClassName('stage-canvas');
    this.stageCanvas.setAttribute('aria-label', '动画演示区域');
    this.stageSlot.appendChild(this.stageCanvas);
    this.stageFrame.appendChild(this.stageSlot);
    this.rightPanel!.appendChild(this.stageFrame);
  }

  // ========================================================================
  // 读数面板
  // ========================================================================

  protected buildReadoutPanel(): void {
    const cfg = this.config as DesktopSplitConfig;
    const readoutLabel = cfg.readoutLabel ?? '数据读数';
    const readoutCollapsed = cfg.readoutCollapsed ?? true;

    const readoutPanel = document.createElement('div');
    readoutPanel.className = `${this.getClassName('readout-panel')} ${readoutCollapsed ? 'teaching-is-collapsed' : ''}`;
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
    readoutHeader.className = this.getClassName('readout-header');
    const readoutTitle = document.createElement('span');
    readoutTitle.className = this.getClassName('readout-title');
    readoutTitle.textContent = readoutLabel;
    const readoutActions = document.createElement('div');
    readoutActions.className = this.getClassName('readout-actions');
    const resizeToggle = document.createElement('button');
    resizeToggle.type = 'button';
    resizeToggle.className = this.getClassName('readout-resize-toggle');
    resizeToggle.title = '调整大小';
    resizeToggle.textContent = '⤢';
    const readoutToggle = document.createElement('button');
    readoutToggle.type = 'button';
    readoutToggle.className = this.getClassName('readout-toggle');
    readoutToggle.setAttribute('aria-label', readoutCollapsed ? '展开' : '折叠');
    readoutToggle.textContent = readoutCollapsed ? '展开' : '折叠';
    readoutActions.append(resizeToggle, readoutToggle);
    readoutHeader.append(readoutTitle, readoutActions);

    this.readoutSlot = document.createElement('ul');
    this.readoutSlot.className = `${this.getClassName('readout-slot')} teaching-readout-slot--adaptive`;
    this.readoutSlot.setAttribute('data-columns', 'auto');

    readoutPanel.appendChild(readoutHeader);
    readoutPanel.appendChild(this.readoutSlot);
    this.rightPanel!.appendChild(readoutPanel);

    this.readoutManager = new ReadoutPanelManager({
      panel: readoutPanel,
      header: readoutHeader,
      slot: this.readoutSlot,
      toggleBtn: readoutToggle,
      collapsed: readoutCollapsed
    });
  }

  // ========================================================================
  // 事件绑定
  // ========================================================================

  protected bindCommonEvents(): void {
    this.eventCleanups.forEach((cleanup) => cleanup());
    this.eventCleanups = [];

    // 垂直分隔条拖拽
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

    // 读数面板折叠
    if (this.readoutManager) {
      const toggleSelector = `.${this.getClassName('readout-toggle')}`;
      const toggleBtn = this.readoutManager
        .getPanel()
        .querySelector(toggleSelector) as HTMLButtonElement | null;
      if (toggleBtn) {
        const onToggle = () => this.readoutManager?.toggle();
        toggleBtn.addEventListener('click', onToggle);
        this.eventCleanups.push(() =>
          toggleBtn.removeEventListener('click', onToggle)
        );
      }
      const resizeSelector = `.${this.getClassName('readout-resize-toggle')}`;
      const resizeToggleBtn = this.readoutManager
        .getPanel()
        .querySelector(resizeSelector) as HTMLButtonElement | null;
      if (resizeToggleBtn) {
        const onToggle = () => this.readoutManager?.toggle();
        resizeToggleBtn.addEventListener('click', onToggle);
        this.eventCleanups.push(() =>
          resizeToggleBtn.removeEventListener('click', onToggle)
        );
      }
    }

    // 区域折叠按钮
    const sectionToggleHandlers: { btn: Element; handler: (e: Event) => void }[] = [];
    const toggleSelector = `.${this.getClassName('section-toggle')}`;
    this.container.querySelectorAll(toggleSelector).forEach((btn) => {
      const handler = (e: Event) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-target');
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

    // 主题切换
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

    // 模式切换
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

  // ========================================================================
  // 侧边栏折叠
  // ========================================================================

  protected toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;

    if (this.sidebarHidden) {
      this.container.style.gridTemplateColumns = '0px 8px 1fr';
      if (this.leftPanel) {
        this.leftPanel.style.display = 'none';
      }
    } else {
      const cfg = this.config as DesktopSplitConfig;
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

  protected showSidebar(): void {
    if (!this.sidebarHidden) return;
    this.sidebarHidden = false;
    const cfg = this.config as DesktopSplitConfig;
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

  protected hideSidebar(): void {
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

  // ========================================================================
  // 控制区折叠
  // ========================================================================

  protected toggleControlSection(): void {
    if (!this.controlSection) return;
    const isCollapsed = this.controlSection.getAttribute('data-collapsed') === 'true';
    this.controlSection.setAttribute('data-collapsed', String(!isCollapsed));
    const toggle = this.controlSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
  }

  protected expandControlSection(): void {
    if (!this.controlSection) return;
    this.controlSection.setAttribute('data-collapsed', 'false');
    const toggle = this.controlSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = '−';
    }
  }

  protected collapseControlSection(): void {
    if (!this.controlSection) return;
    this.controlSection.setAttribute('data-collapsed', 'true');
    const toggle = this.controlSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = '+';
    }
  }

  // ========================================================================
  // 图表区折叠（子类可覆盖）
  // ========================================================================

  protected toggleGraphSection(): void {
    const graphSection = this.getGraphSection();
    if (!graphSection) return;
    const isCollapsed = graphSection.getAttribute('data-collapsed') === 'true';
    graphSection.setAttribute('data-collapsed', String(!isCollapsed));
    const toggle = graphSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = isCollapsed ? '−' : '+';
    }
    this.onGraphSectionToggled?.(!isCollapsed);
  }

  protected expandGraphSection(): void {
    const graphSection = this.getGraphSection();
    if (!graphSection) return;
    graphSection.setAttribute('data-collapsed', 'false');
    const toggle = graphSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = '−';
    }
    this.onGraphSectionToggled?.(false);
  }

  protected collapseGraphSection(): void {
    const graphSection = this.getGraphSection();
    if (!graphSection) return;
    graphSection.setAttribute('data-collapsed', 'true');
    const toggle = graphSection.querySelector(`.${this.getClassName('section-toggle')}`);
    if (toggle) {
      toggle.textContent = '+';
    }
    this.onGraphSectionToggled?.(true);
  }

  /** 子类覆盖以响应图表区折叠状态变化 */
  protected onGraphSectionToggled?(collapsed: boolean): void;

  // ========================================================================
  // 主题与模式
  // ========================================================================

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
  // 浮动控制条
  // ========================================================================

  setFloatingControls(callbacks: {
    onTogglePlay?: () => void;
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  }): void {
    if (this.floatingControls) {
      this.floatingControls.dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }

    const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
    this.floatingControls = createFloatingControls({
      isPlaying: callbacks.isPlaying,
      onTogglePlay: togglePlay,
      onReset: callbacks.onReset,
      onSpeedChange: callbacks.onSpeedChange,
      getSpeed: callbacks.getSpeed
    });

    if (this.stageSlot) {
      this.stageSlot.appendChild(this.floatingControls);
    }
  }

  // ========================================================================
  // 尺寸响应
  // ========================================================================

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
      const cfg = this.config as DesktopSplitConfig;
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

    this.onHandleResizeExtra?.(width);
  }

  /** 子类覆盖以添加额外的 resize 处理 */
  protected onHandleResizeExtra?(width: number): void;

  // ========================================================================
  // 读数数据
  // ========================================================================

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

  // ========================================================================
  // 运输控制
  // ========================================================================

  updateTransportState(state: TransportState): void {
    if (this.floatingControls?.setState) {
      this.floatingControls.setState(state);
    }
  }

  // ========================================================================
  // 状态栏
  // ========================================================================

  updateStatus(text: string): void {
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

  // ========================================================================
  // 演示配置
  // ========================================================================

  applyDemoProfile(profile: SceneDemoProfile): void {
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
        break;
    }

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

    if (profile.graphPanel === 'hidden') {
      this.collapseGraphSection();
      const graphSection = this.getGraphSection();
      if (graphSection) {
        graphSection.style.display = 'none';
      }
    } else if (profile.graphPanel === 'collapsed') {
      this.collapseGraphSection();
    }

    const minSize = profile.interactionHints?.touchTargetMinSize;
    if (minSize && minSize > 44) {
      this.container.style.setProperty('--demo-touch-min', `${minSize}px`);
      this.container.classList.add('teaching-demo-touch-optimized');
    }
  }

  resetDemoProfile(): void {
    this.showSidebar();
    this.expandControlSection();
    this.expandGraphSection();
    const graphSection = this.getGraphSection();
    if (graphSection) {
      graphSection.style.display = '';
    }
    this.readoutManager?.resetPosition();
    this.readoutManager?.setCollapsed(true);
    this.readoutManager?.setVisible(true);
    this.readoutManager?.resetFont();
    this.container.classList.remove('teaching-demo-touch-optimized');
    this.container.style.removeProperty('--demo-touch-min');
  }

  // ========================================================================
  // 公共 API
  // ========================================================================

  getThemeButton(): HTMLButtonElement | null {
    return this.themeButton;
  }

  getModeButton(): HTMLButtonElement | null {
    return this.modeButton;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.stageCanvas;
  }

  setLeftRatio(ratio: number): void {
    const cfg = this.config as DesktopSplitConfig;
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

  getLeftRatio(): number {
    return this.leftRatio;
  }

  // ========================================================================
  // 抽象方法（子类必须实现）
  // ========================================================================

  /** 返回图表区元素（用于演示配置和折叠控制） */
  abstract getGraphSection(): HTMLElement | null;

  /** 返回子类特有的 slot 配置 */
  abstract getExtraSlotConfig(): Partial<Record<SlotName, SlotConfig>>;

  /** 返回 graph slot 元素 */
  protected resolveGraphSlot(): HTMLElement | undefined {
    return undefined;
  }

  // ========================================================================
  // SlotConfig
  // ========================================================================

  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    const cfg = this.config as DesktopSplitConfig;
    const configs: Partial<Record<SlotName, SlotConfig>> = {
      header: { visible: !cfg.hideHeader },
      control: { visible: true },
      animation: { visible: true },
      readout: {
        visible: true,
        collapsed: this.readoutManager?.isCollapsed ?? true
      },
      ...this.getExtraSlotConfig()
    };
    return configs[slot];
  }

  // ========================================================================
  // 卸载
  // ========================================================================

  async unmount(): Promise<void> {
    this.eventCleanups.forEach((cleanup) => cleanup());
    this.eventCleanups = [];

    if (this.floatingControls) {
      (this.floatingControls as { dispose?: () => void }).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }

    this.readoutManager?.dispose();
    this.readoutManager = null;

    this.onBeforeUnmount?.();

    this.leftPanel = null;
    this.rightPanel = null;
    this.resizer = null;
    this.resizerBehavior = null;
    this.controlSection = null;
    this.controlSlot = null;
    this.stageToolbar = null;
    this.stageFrame = null;
    this.stageSlot = null;
    this.stageCanvas = null;
    this.header = null;
    this.themeButton = null;
    this.modeButton = null;
    this.sidebarToggle = null;
    this.readoutSlot = null;

    await super.unmount();
  }

  /** 子类覆盖以执行自定义清理 */
  protected onBeforeUnmount?(): void;
}

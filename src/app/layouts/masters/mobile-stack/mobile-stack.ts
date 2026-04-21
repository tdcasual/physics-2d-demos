/**
 * MobileStackLayout - 移动端垂直堆叠布局（高级版 v0.4.0）
 *
 * 核心特性：
 * 1. 性能优化 - 虚拟滚动、节流处理、requestAnimationFrame
 * 2. 手势交互 - 滑动手势、捏合缩放、边缘滑动
 * 3. 智能主题 - 系统主题跟随、动态切换、 CSS 变量热更新
 * 4. 自适应布局 - 横竖屏切换、分屏模式、折叠屏适配
 * 5. 开发者友好 - 调试面板、性能监控、错误边界
 *
 * @version 0.4.0
 */

import { BaseLayout } from '../base-layout';
import type {
  LayoutSlots,
  SlotName,
  SlotConfig,
  ReadoutItem
} from '../../types';
import { ThrottleDebounce } from './utils/throttle-debounce';
import { GestureRecognizer } from './utils/gesture-recognizer';
import { ThemeManager } from './utils/theme-manager';
import { PerformanceMonitor } from './utils/performance-monitor';
import { DEFAULT_CONFIG, type MobileStackConfig } from './mobile-stack-config';
export { type MobileStackConfig } from './mobile-stack-config';
import { GraphSectionManager } from './mobile-graph-section';
import { ReadoutBarManager } from './mobile-readout-bar';
import { TransportBarManager } from './mobile-transport-bar';
import { DebugPanelManager } from './mobile-debug-panel';

import './mobile-stack.css';

export class MobileStackLayout extends BaseLayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的垂直堆叠布局（高级版）';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  // DOM 元素
  private scrollContainer: HTMLElement | null = null;
  private controlsBar: HTMLElement | null = null;
  private animationSection: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private controlSection: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;

  // 子模块
  private graphManager: GraphSectionManager | null = null;
  private readoutManager: ReadoutBarManager | null = null;
  private transportManager: TransportBarManager | null = null;
  private debugManager: DebugPanelManager | null = null;

  // 状态
  private eventCleanups: (() => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;

  // 高级功能实例
  private gestureRecognizer: GestureRecognizer | null = null;
  private themeManager: ThemeManager | null = null;
  private perfMonitor: PerformanceMonitor | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    super(container, config);
    const cfg = this.config as MobileStackConfig;

    if (cfg.persistState && cfg.stateKey) {
      this.loadState();
    }
  }

  private getConfig(): Required<MobileStackConfig> {
    return { ...DEFAULT_CONFIG, ...(this.config as MobileStackConfig) };
  }

  private safely<T>(
    fn: () => T,
    context: string,
    defaultValue?: T
  ): T | undefined {
    try {
      return fn();
    } catch (e) {
      console.error(`[MobileStackLayout] Error in ${context}:`, e);
      return defaultValue;
    }
  }

  private addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!element) return;
    element.addEventListener(type, listener as EventListener, options);
    this.eventCleanups.push(() => {
      element.removeEventListener(type, listener as EventListener, options);
    });
  }

  // ========================================================================
  // 渲染
  // ========================================================================

  render(container: HTMLElement): LayoutSlots {
    const cfg = this.getConfig();

    const slots = this.safely<LayoutSlots>(() => {
      container.classList.add('mobile-stack-layout');
      container.setAttribute('data-theme', this.currentTheme);

      const followSystem =
        cfg.themeFollowSystem && !this.config.__managedByContainer;
      this.themeManager = new ThemeManager(container, followSystem, (theme) => {
        this.currentTheme = theme;
      });

      this.scrollContainer = document.createElement('div');
      this.scrollContainer.className = 'mobile-scroll-container';
      if (cfg.performance.enableVirtualScroll) {
        this.scrollContainer.style.contain = 'strict';
      }

      // 1. 控制条
      if (cfg.stickyControls) {
        this.transportManager = new TransportBarManager(this.scrollContainer);
        this.controlsBar = this.transportManager['bar'] ?? null;
      }

      // 2. 动画区
      this.animationSection = document.createElement('div');
      this.animationSection.className = 'mobile-animation-section';
      const testEl = document.createElement('div');
      testEl.style.height = '1dvh';
      const vhUnit = testEl.style.height === '1dvh' ? 'dvh' : 'vh';
      // 如果场景自行管理内容高度（如 chase-meet），允许 auto 模式
      const layoutCfg = this.config as MobileStackConfig & {
        hasGraph?: boolean;
      };
      if (layoutCfg.hasGraph === false) {
        this.animationSection.classList.add('auto-height');
        this.animationSection.style.height = 'auto';
        this.animationSection.style.minHeight = `${cfg.animationMinHeight}px`;
      } else {
        this.animationSection.style.height = `${cfg.animationHeightVh}${vhUnit}`;
      }

      this.stageSlot = document.createElement('div');
      this.stageSlot.className = 'mobile-stage-slot';

      this.stageCanvas = document.createElement('canvas');
      this.stageCanvas.className = 'mobile-stage-canvas';
      this.stageSlot.appendChild(this.stageCanvas);
      this.animationSection.appendChild(this.stageSlot);
      this.scrollContainer.appendChild(this.animationSection);

      // 3. 图表区（仅在 hasGraph !== false 时创建）
      const hasGraph = layoutCfg.hasGraph !== false;
      if (hasGraph) {
        const graphExpanded =
          (this.config as MobileStackConfig).graphExpanded ??
          DEFAULT_CONFIG.graphExpanded;
        this.graphManager = new GraphSectionManager(
          this.scrollContainer,
          cfg.sectionTitles.graph || '📈 数据图表',
          graphExpanded,
          (expanded) => {
            this.saveState();
            this.container?.dispatchEvent(
              new CustomEvent('graphToggle', {
                detail: { expanded }
              })
            );
          }
        );
      }

      // 4. 控制区
      this.renderControlSection(cfg);

      container.appendChild(this.scrollContainer);

      this.initAdvancedFeatures(cfg);

      if (cfg.enablePerfMonitor) {
        this.perfMonitor = new PerformanceMonitor((metrics) => {
          this.debugManager?.update(
            metrics,
            this.themeManager?.getTheme() || 'light'
          );
        });
      }

      if (cfg.enableDebugPanel) {
        this.debugManager = new DebugPanelManager(container);
      }

      if (!this.controlSlot || !this.readoutManager) {
        throw new Error('[MobileStackLayout] control section not rendered');
      }
      return {
        header: undefined,
        control: this.controlSlot,
        animation: this.stageSlot,
        graph: this.graphManager?.slot,
        readout: this.readoutManager.bar
      };
    }, 'render');

    if (!slots) {
      throw new Error('[MobileStackLayout] render failed');
    }
    return slots;
  }

  private renderControlSection(cfg: Required<MobileStackConfig>): void {
    this.controlSection = document.createElement('div');
    this.controlSection.className = 'mobile-control-section';
    this.controlSection.setAttribute('role', 'region');
    this.controlSection.setAttribute(
      'aria-label',
      cfg.sectionTitles.control || '控制区域'
    );

    const controlHeader = document.createElement('div');
    controlHeader.className = 'mobile-control-header';
    controlHeader.textContent = cfg.sectionTitles.control || '⚙️ 控制区';
    this.controlSection.appendChild(controlHeader);

    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'mobile-control-slot';
    this.controlSection.appendChild(this.controlSlot);

    this.readoutManager = new ReadoutBarManager(
      this.controlSection,
      cfg.sectionTitles.readout || '数据读数'
    );

    this.scrollContainer!.appendChild(this.controlSection);
  }

  // ========================================================================
  // 高级功能初始化
  // ========================================================================

  private initAdvancedFeatures(cfg: Required<MobileStackConfig>): void {
    if (cfg.gestures.enabled && this.animationSection) {
      this.gestureRecognizer = new GestureRecognizer(this.animationSection, {
        onSwipeUp: cfg.gestures.swipeToToggleGraph
          ? () => this.graphManager?.toggleExpanded()
          : undefined,
        onDoubleTap: cfg.gestures.doubleTapToReset
          ? () =>
              this.transportManager?.render(cfg.controls, { onReset: () => {} })
          : undefined,
        onLongPress: cfg.gestures.longPressForMenu ? () => {} : undefined
      });
    }

    if (cfg.performance.lazyLoadSections) {
      this.initLazyLoadObserver();
    }

    this.setupResizeObserver(cfg);
  }

  private initLazyLoadObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { root: this.scrollContainer, threshold: 0.1 }
    );

    [this.graphManager?.section, this.controlSection].forEach((el) => {
      if (el) this.intersectionObserver!.observe(el);
    });
  }

  private setupResizeObserver(cfg: Required<MobileStackConfig>): void {
    if (!this.container || typeof ResizeObserver === 'undefined') return;

    const handleResize = ThrottleDebounce.debounce(
      (width: number, height: number) => {
        this.handleResize(width, height, cfg);
      },
      cfg.performance.resizeDebounceMs ?? 100
    );

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        handleResize(width, height);
      }
    });

    this.resizeObserver.observe(this.container);
  }

  // ========================================================================
  // 公共 API
  // ========================================================================

  setFloatingControls(callbacks: {
    onTogglePlay?: () => void;
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  }): void {
    const cfg = this.getConfig();
    this.safely(() => {
      this.transportManager?.render(cfg.controls, callbacks);
    }, 'setFloatingControls');
  }

  updateTransportState(state: { isPlaying?: boolean; speed?: number }): void {
    this.safely(() => {
      if (state.isPlaying !== undefined) {
        this.transportManager?.updatePlayState(state.isPlaying);
      }
    }, 'updateTransportState');
  }

  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }

  setReadout(items: Array<{ label: string; value: string | number }>): void {
    const cfg = this.getConfig();
    this.safely(() => {
      this.readoutManager?.setItems(items, cfg.maxReadoutItems);
    }, 'setReadout');
  }

  // ========================================================================
  // 工具方法
  // ========================================================================

  getCanvas(): HTMLCanvasElement | null {
    return this.stageCanvas;
  }

  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    const hasGraph = this.graphManager !== null;
    const configs: Partial<Record<SlotName, SlotConfig>> = {
      header: { visible: false },
      control: { visible: true },
      animation: { visible: true },
      graph: {
        visible: hasGraph ? (this.graphManager?.isExpanded() ?? false) : false
      },
      readout: { visible: true }
    };
    return configs[slot];
  }

  handleResize(
    width: number,
    height: number,
    cfg?: Required<MobileStackConfig>
  ): void {
    const config = cfg || this.getConfig();

    this.safely(() => {
      // 仅在 animation section 不是 auto-height 时调整高度
      if (
        this.animationSection &&
        !this.animationSection.classList.contains('auto-height')
      ) {
        const newHeight = Math.max(
          config.animationMinHeight,
          Math.min(
            config.animationMaxHeight,
            height * (config.animationHeightVh / 100)
          )
        );
        this.animationSection.style.height = `${newHeight}px`;
      }

      const isLandscape = width > height;
      this.container?.classList.toggle('is-landscape', isLandscape);
    }, 'handleResize');
  }

  // ========================================================================
  // 状态管理
  // ========================================================================

  private saveState(): void {
    const cfg = this.getConfig();
    if (!cfg.persistState || !cfg.stateKey) return;

    this.safely(() => {
      const state = {
        graphExpanded: this.graphManager?.isExpanded() ?? false,
        theme: this.themeManager?.getTheme(),
        timestamp: Date.now()
      };
      localStorage.setItem(cfg.stateKey, JSON.stringify(state));
    }, 'saveState');
  }

  private loadState(): void {
    const cfg = this.getConfig();
    if (!cfg.persistState || !cfg.stateKey) return;

    this.safely(() => {
      const saved = localStorage.getItem(cfg.stateKey);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.graphExpanded !== undefined) {
          (this.config as MobileStackConfig).graphExpanded =
            state.graphExpanded;
        }
      }
    }, 'loadState');
  }

  // ========================================================================
  // 销毁
  // ========================================================================

  async unmount(): Promise<void> {
    await this.safely(async () => {
      this.gestureRecognizer?.destroy();
      this.gestureRecognizer = null;

      this.themeManager?.destroy();
      this.themeManager = null;

      this.perfMonitor?.destroy();
      this.perfMonitor = null;

      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;

      this.resizeObserver?.disconnect();
      this.resizeObserver = null;

      this.graphManager?.destroy();
      this.graphManager = null;

      this.readoutManager?.destroy();
      this.readoutManager = null;

      this.transportManager?.destroy();
      this.transportManager = null;

      this.debugManager?.destroy();
      this.debugManager = null;

      this.eventCleanups.forEach((cleanup) => cleanup());
      this.eventCleanups = [];

      this.scrollContainer = null;
      this.controlsBar = null;
      this.animationSection = null;
      this.stageSlot = null;
      this.stageCanvas = null;
      this.controlSection = null;
      this.controlSlot = null;
    }, 'unmount');

    await super.unmount();
  }
}

export type { GestureRecognizer, ThemeManager, PerformanceMonitor };

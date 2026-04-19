/**
 * MobileStackLayout - 移动端垂直堆叠布局（高级版 v0.3.0）
 * 
 * 核心特性：
 * 1. 性能优化 - 虚拟滚动、节流处理、requestAnimationFrame
 * 2. 手势交互 - 滑动手势、捏合缩放、边缘滑动
 * 3. 智能主题 - 系统主题跟随、动态切换、 CSS 变量热更新
 * 4. 自适应布局 - 横竖屏切换、分屏模式、折叠屏适配
 * 5. 开发者友好 - 调试面板、性能监控、错误边界
 * 
 * @version 0.3.0
 */

import { BaseLayout } from '../base-layout';
import type { LayoutSlots, LayoutConfig, Theme, SlotName, SlotConfig, TransportState, ReadoutItem } from '../../types';
import { ThrottleDebounce } from './utils/throttle-debounce';
import { GestureRecognizer } from './utils/gesture-recognizer';
import { ThemeManager } from './utils/theme-manager';
import { PerformanceMonitor, type LayoutMetrics } from './utils/performance-monitor';

import './mobile-stack.css';

// ============================================================================
// SVG 图标（替代 emoji，保证跨平台一致性）
// ============================================================================

const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
  fullscreenExit: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
};

// ============================================================================
// 类型定义
// ============================================================================

export interface SectionTitles {
  graph?: string;
  control?: string;
  readout?: string;
}

export interface ControlButtonConfig {
  showPlayPause?: boolean;
  showReset?: boolean;
  showSpeed?: boolean;
  showFullscreen?: boolean;  // 新增：全屏按钮
  speedMin?: number;
  speedMax?: number;
  speedStep?: number;
}

export interface GestureConfig {
  enabled?: boolean;
  swipeToToggleGraph?: boolean;      // 滑动切换图表
  edgeSwipeToGoBack?: boolean;       // 边缘滑动返回
  doubleTapToReset?: boolean;        // 双击重置
  longPressForMenu?: boolean;        // 长按菜单
  excludeCanvas?: boolean;           // 手势是否排除 Canvas 区域（默认 true，避免与场景拖拽冲突）
}

export interface PerformanceConfig {
  enableVirtualScroll?: boolean;     // 虚拟滚动
  scrollThrottleMs?: number;         // 滚动节流
  resizeDebounceMs?: number;         // resize防抖
  useRAF?: boolean;                  // 使用 requestAnimationFrame
  lazyLoadSections?: boolean;        // 懒加载区域
}

export interface MobileStackConfig extends LayoutConfig {
  // 基础配置
  animationHeightVh?: number;
  animationMinHeight?: number;
  animationMaxHeight?: number;
  graphExpanded?: boolean;
  graphHeight?: number;
  stickyControls?: boolean;
  sectionTitles?: SectionTitles;
  controls?: ControlButtonConfig;
  maxReadoutItems?: number;
  persistState?: boolean;
  stateKey?: string;
  
  // 高级配置
  gestures?: GestureConfig;
  performance?: PerformanceConfig;
  themeFollowSystem?: boolean;       // 跟随系统主题
  themeTransitionDuration?: number;  // 主题过渡动画时长
  
  // 开发者配置
  enableDebugPanel?: boolean;        // 调试面板
  enablePerfMonitor?: boolean;       // 性能监控
}

// ============================================================================
// 主类
// ============================================================================

const DEFAULT_CONFIG: Required<MobileStackConfig> = {
  // 基础配置
  animationHeightVh: 50,
  animationMinHeight: 250,
  animationMaxHeight: 500,
  graphExpanded: false,
  graphHeight: 200,
  stickyControls: true,
  sectionTitles: { graph: '📈 数据图表', control: '⚙️ 控制区', readout: '' },
  controls: { showPlayPause: true, showReset: true, showSpeed: true, showFullscreen: false, speedMin: 0.05, speedMax: 3, speedStep: 0.05 },
  maxReadoutItems: 6,
  persistState: false,
  stateKey: 'mobile-stack-state',
  
  // 高级配置
  gestures: { enabled: true, swipeToToggleGraph: true, edgeSwipeToGoBack: false, doubleTapToReset: true, longPressForMenu: false, excludeCanvas: true },
  performance: { enableVirtualScroll: false, scrollThrottleMs: 16, resizeDebounceMs: 100, useRAF: true, lazyLoadSections: false },
  themeFollowSystem: true,
  themeTransitionDuration: 300,
  
  // 开发者配置（开发环境自动启用）
  enableDebugPanel: false,
  enablePerfMonitor: false,
  
  // LayoutConfig 基类字段
  theme: 'light',
  slots: {},
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
  __managedByContainer: false
};

export class MobileStackLayout extends BaseLayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的垂直堆叠布局（高级版）';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation', 'graph', 'readout'];
  
  // DOM 元素
  private scrollContainer: HTMLElement | null = null;
  private controlsBar: HTMLElement | null = null;
  private animationSection: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private graphSection: HTMLElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private graphToggle: HTMLElement | null = null;
  private controlSection: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private readoutBar: HTMLElement | null = null;
  private debugPanel: HTMLElement | null = null;
  
  // 控制按钮引用
  private playBtn: HTMLButtonElement | null = null;
  private speedValueEl: HTMLElement | null = null;
  private fullscreenBtn: HTMLButtonElement | null = null;
  
  // 状态
  private graphExpanded = false;
  private isFullscreen = false;
  private eventCleanups: (() => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;
  
  // 运输控制回调（用于手势等直接触发场景操作）
  private transportCallbacks: {
    onReset?: () => void;
  } = {};
  
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
    } else {
      this.graphExpanded = cfg.graphExpanded ?? DEFAULT_CONFIG.graphExpanded;
    }
  }
  
  private getConfig(): Required<MobileStackConfig> {
    return { ...DEFAULT_CONFIG, ...(this.config as MobileStackConfig) };
  }
  
  private safely<T>(fn: () => T, context: string, defaultValue?: T): T | undefined {
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
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
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
      
          // 初始化主题管理器（仅在独立使用时启用系统跟随，SceneContainer 管理时禁用）
      const followSystem = cfg.themeFollowSystem && !this.config.__managedByContainer;
      this.themeManager = new ThemeManager(container, followSystem, (theme) => {
        this.currentTheme = theme;
      });
      
      // 主滚动容器
      this.scrollContainer = document.createElement('div');
      this.scrollContainer.className = 'mobile-scroll-container';
      
      // 虚拟滚动优化
      if (cfg.performance.enableVirtualScroll) {
        this.scrollContainer.style.contain = 'strict';
      }
      
      // 1. 控制条
      if (cfg.stickyControls) {
        this.controlsBar = document.createElement('div');
        this.controlsBar.className = 'mobile-controls-bar';
        this.scrollContainer.appendChild(this.controlsBar);
      }
      
      // 2. 动画区
      this.animationSection = document.createElement('div');
      this.animationSection.className = 'mobile-animation-section';
      const vhUnit = typeof CSS !== 'undefined' && CSS.supports?.('height', '1dvh') ? 'dvh' : 'vh';
      this.animationSection.style.height = `${cfg.animationHeightVh}${vhUnit}`;
      
      this.stageSlot = document.createElement('div');
      this.stageSlot.className = 'mobile-stage-slot';
      
      this.stageCanvas = document.createElement('canvas');
      this.stageCanvas.className = 'mobile-stage-canvas';
      this.stageSlot.appendChild(this.stageCanvas);
      this.animationSection.appendChild(this.stageSlot);
      this.scrollContainer.appendChild(this.animationSection);
      
      // 3. 图表区
      this.renderGraphSection(cfg);
      
      // 4. 控制区
      this.renderControlSection(cfg);
      
      container.appendChild(this.scrollContainer);
      
      // 初始化高级功能
      this.initAdvancedFeatures(cfg);
      
      // 设置性能监控
      if (cfg.enablePerfMonitor) {
        this.initPerfMonitor();
      }
      
      // 设置调试面板
      if (cfg.enableDebugPanel) {
        this.initDebugPanel();
      }
      
      return {
        header: undefined,
        control: this.controlSlot!,
        animation: this.stageSlot,
        graph: this.graphSlot!,
        readout: this.readoutBar!
      };
    }, 'render');
    if (!slots) {
      throw new Error('[MobileStackLayout] render failed');
    }
    return slots;
  }
  
  private renderGraphSection(cfg: Required<MobileStackConfig>): void {
    this.graphSection = document.createElement('div');
    this.graphSection.className = 'mobile-graph-section';
    if (this.graphExpanded) {
      this.graphSection.classList.add('is-expanded');
    }
    this.graphSection.setAttribute('role', 'region');
    this.graphSection.setAttribute('aria-label', cfg.sectionTitles.graph || '图表区域');
    
    this.graphToggle = document.createElement('div');
    this.graphToggle.className = 'mobile-section-toggle';
    this.graphToggle.setAttribute('role', 'button');
    this.graphToggle.setAttribute('aria-expanded', String(this.graphExpanded));
    this.graphToggle.setAttribute('aria-controls', 'mobile-graph-content');
    this.graphToggle.setAttribute('tabindex', '0');
    this.graphToggle.innerHTML = `
      <span class="toggle-title">${cfg.sectionTitles.graph || '📈 数据图表'}</span>
      <span class="toggle-icon" aria-hidden="true">${this.graphExpanded ? '▼' : '▶'}</span>
    `;
    
    this.addEventListener(this.graphToggle, 'click', () => this.toggleGraph());
    this.addEventListener(this.graphToggle, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleGraph();
      }
    });
    
    this.graphSection.appendChild(this.graphToggle);
    
    this.graphSlot = document.createElement('div');
    this.graphSlot.className = 'mobile-graph-slot';
    this.graphSlot.id = 'mobile-graph-content';
    this.graphSlot.setAttribute('role', 'region');
    this.graphSection.appendChild(this.graphSlot);
    this.scrollContainer!.appendChild(this.graphSection);
  }
  
  private renderControlSection(cfg: Required<MobileStackConfig>): void {
    this.controlSection = document.createElement('div');
    this.controlSection.className = 'mobile-control-section';
    this.controlSection.setAttribute('role', 'region');
    this.controlSection.setAttribute('aria-label', cfg.sectionTitles.control || '控制区域');
    
    const controlHeader = document.createElement('div');
    controlHeader.className = 'mobile-control-header';
    controlHeader.textContent = cfg.sectionTitles.control || '⚙️ 控制区';
    this.controlSection.appendChild(controlHeader);
    
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'mobile-control-slot';
    this.controlSection.appendChild(this.controlSlot);
    
    this.readoutBar = document.createElement('div');
    this.readoutBar.className = 'mobile-readout-bar';
    this.readoutBar.setAttribute('role', 'region');
    this.readoutBar.setAttribute('aria-label', cfg.sectionTitles.readout || '数据读数');
    this.controlSection.appendChild(this.readoutBar);
    
    this.scrollContainer!.appendChild(this.controlSection);
  }
  
  // ========================================================================
  // 高级功能初始化
  // ========================================================================
  
  private initAdvancedFeatures(cfg: Required<MobileStackConfig>): void {
    // 手势识别
    if (cfg.gestures.enabled && this.animationSection) {
      this.gestureRecognizer = new GestureRecognizer(
        this.animationSection,
        {
          onSwipeUp: cfg.gestures.swipeToToggleGraph ? () => this.toggleGraph() : undefined,
          onDoubleTap: cfg.gestures.doubleTapToReset ? () => this.handleDoubleTap() : undefined,
          onLongPress: cfg.gestures.longPressForMenu ? () => this.handleLongPress() : undefined
        }
      );
    }
    
    // 懒加载观察
    if (cfg.performance.lazyLoadSections) {
      this.initLazyLoadObserver();
    }
    
    // Resize 观察
    this.setupResizeObserver(cfg);
    
    // 全屏变化监听
    this.addEventListener(document as any, 'fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      if (this.fullscreenBtn) {
        this.fullscreenBtn.innerHTML = this.isFullscreen ? ICONS.fullscreenExit : ICONS.fullscreen;
        this.fullscreenBtn.setAttribute('aria-label', this.isFullscreen ? '退出全屏' : '全屏');
      }
    });
  }
  
  private initLazyLoadObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { root: this.scrollContainer, threshold: 0.1 }
    );
    
    [this.graphSection, this.controlSection].forEach(el => {
      if (el) this.intersectionObserver!.observe(el);
    });
  }
  
  private setupResizeObserver(cfg: Required<MobileStackConfig>): void {
    if (!this.container || typeof ResizeObserver === 'undefined') return;
    
    const handleResize = ThrottleDebounce.debounce((width: number, height: number) => {
      this.handleResize(width, height, cfg);
    }, cfg.performance.resizeDebounceMs ?? 100);
    
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        handleResize(width, height);
      }
    });
    
    this.resizeObserver.observe(this.container);
  }
  
  private initPerfMonitor(): void {
    this.perfMonitor = new PerformanceMonitor((metrics) => {
      this.updateDebugPanel(metrics);
    });
  }
  
  private initDebugPanel(): void {
    this.debugPanel = document.createElement('div');
    this.debugPanel.className = 'mobile-debug-panel';
    this.debugPanel.innerHTML = `
      <div class="debug-header">Debug</div>
      <div class="debug-content">
        <div>FPS: <span class="debug-fps">--</span></div>
        <div>Memory: <span class="debug-memory">--</span>MB</div>
        <div>Theme: <span class="debug-theme">--</span></div>
      </div>
    `;
    this.container.appendChild(this.debugPanel);
  }
  
  private updateDebugPanel(metrics: LayoutMetrics): void {
    if (!this.debugPanel) return;
    
    const fpsEl = this.debugPanel.querySelector('.debug-fps');
    const memEl = this.debugPanel.querySelector('.debug-memory');
    const themeEl = this.debugPanel.querySelector('.debug-theme');
    
    if (fpsEl) fpsEl.textContent = String(metrics.fps);
    if (memEl) memEl.textContent = (metrics.memory / 1024 / 1024).toFixed(1);
    if (themeEl) themeEl.textContent = this.themeManager?.getTheme() || 'light';
  }
  
  // ========================================================================
  // 交互处理
  // ========================================================================
  
  private toggleGraph(): void {
    this.safely(() => {
      this.graphExpanded = !this.graphExpanded;
      
      if (this.graphSection) {
        this.graphSection.classList.toggle('is-expanded', this.graphExpanded);
      }
      
      if (this.graphToggle) {
        this.graphToggle.setAttribute('aria-expanded', String(this.graphExpanded));
        const icon = this.graphToggle.querySelector('.toggle-icon');
        if (icon) icon.textContent = this.graphExpanded ? '▼' : '▶';
      }
      
      this.saveState();
      
      // 触发自定义事件
      this.container?.dispatchEvent(new CustomEvent('graphToggle', {
        detail: { expanded: this.graphExpanded }
      }));
    }, 'toggleGraph');
  }
  
  private handleDoubleTap(): void {
    // 双击直接调用重置回调（不再通过 CustomEvent 转发）
    this.transportCallbacks.onReset?.();
  }
  
  private handleLongPress(): void {
    // 长按菜单：当前无对应 Scene 接口，留空
  }
  
  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.container?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  
  // ========================================================================
  // 控制按钮
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
    
    // 保存运输控制回调，供手势等直接触发
    this.transportCallbacks.onReset = callbacks.onReset;
    
    this.safely(() => {
      if (!this.controlsBar) return;
      
      this.controlsBar.innerHTML = '';
      
      const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
      const isPlaying = callbacks.isPlaying?.() ?? false;
      const speed = callbacks.getSpeed?.() ?? 1;
      const controlCfg = cfg.controls;
      
      // 播放/暂停
      if (controlCfg.showPlayPause) {
        this.playBtn = this.createControlButton({
          className: 'play-pause',
          html: isPlaying ? ICONS.pause : ICONS.play,
          ariaLabel: isPlaying ? '暂停动画' : '播放动画',
          onClick: () => {
            this.safely(() => {
              togglePlay?.();
              const nowPlaying = callbacks.isPlaying?.() ?? false;
              if (this.playBtn) {
                this.playBtn.innerHTML = nowPlaying ? ICONS.pause : ICONS.play;
                this.playBtn.setAttribute('aria-label', nowPlaying ? '暂停动画' : '播放动画');
              }
            }, 'playBtn click');
          }
        });
        this.controlsBar.appendChild(this.playBtn);
      }
      
      // 重置
      if (controlCfg.showReset) {
        this.controlsBar.appendChild(this.createControlButton({
          className: 'reset',
          html: ICONS.reset,
          ariaLabel: '重置动画',
          onClick: () => this.safely(() => callbacks.onReset?.(), 'resetBtn click')
        }));
      }
      
      // 速度控制
      if (controlCfg.showSpeed) {
        this.controlsBar.appendChild(this.createSpeedControl(speed, callbacks));
      }
      
      // 全屏
      if (controlCfg.showFullscreen) {
        this.fullscreenBtn = this.createControlButton({
          className: 'fullscreen',
          html: ICONS.fullscreen,
          ariaLabel: '全屏',
          onClick: () => this.toggleFullscreen()
        });
        this.controlsBar.appendChild(this.fullscreenBtn);
      }
    }, 'setFloatingControls');
  }
  
  private createControlButton(options: {
    className: string;
    html: string;
    ariaLabel: string;
    onClick: () => void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `mobile-control-btn ${options.className}`;
    btn.innerHTML = options.html;
    btn.setAttribute('aria-label', options.ariaLabel);
    this.addEventListener(btn, 'click', options.onClick);
    return btn;
  }
  
  private createSpeedControl(
    speed: number,
    callbacks: { onSpeedChange?: (speed: number) => void }
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mobile-speed-control';
    
    const label = document.createElement('span');
    label.className = 'speed-label';
    label.textContent = '速度';
    container.appendChild(label);
    
    const cfg = this.getConfig();
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'speed-slider';
    slider.min = String(cfg.controls.speedMin);
    slider.max = String(cfg.controls.speedMax);
    slider.step = String(cfg.controls.speedStep);
    slider.value = String(speed);
    slider.setAttribute('aria-label', '播放速度');
    slider.setAttribute('aria-valuemin', String(cfg.controls.speedMin));
    slider.setAttribute('aria-valuemax', String(cfg.controls.speedMax));
    slider.setAttribute('aria-valuenow', String(speed));
    
    this.addEventListener(slider, 'input', (e) => {
      this.safely(() => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        callbacks.onSpeedChange?.(val);
        slider.setAttribute('aria-valuenow', String(val));
        if (this.speedValueEl) {
          this.speedValueEl.textContent = `${val.toFixed(2)}×`;
        }
      }, 'speedSlider input');
    });
    
    container.appendChild(slider);
    
    this.speedValueEl = document.createElement('span');
    this.speedValueEl.className = 'speed-value';
    this.speedValueEl.textContent = `${speed.toFixed(2)}×`;
    container.appendChild(this.speedValueEl);
    
    return container;
  }
  
  // ========================================================================
  // 更新方法
  // ========================================================================
  
  updateTransportState(state: { isPlaying?: boolean; speed?: number }): void {
    this.safely(() => {
      if (state.isPlaying !== undefined && this.playBtn) {
        this.playBtn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
        this.playBtn.setAttribute('aria-label', state.isPlaying ? '暂停动画' : '播放动画');
      }
    }, 'updateTransportState');
  }
  
  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }
  
  setReadout(items: Array<{ label: string; value: string | number }>): void {
    const cfg = this.getConfig();
    
    this.safely(() => {
      if (!this.readoutBar) return;
      
      this.readoutBar.innerHTML = items.slice(0, cfg.maxReadoutItems).map(item => `
        <div class="mobile-readout-item">
          <span class="readout-label">${item.label}</span>
          <span class="readout-value">${item.value}</span>
        </div>
      `).join('');
    }, 'setReadout');
  }
  
  // ========================================================================
  // 工具方法
  // ========================================================================
  
  getCanvas(): HTMLCanvasElement | null {
    return this.stageCanvas;
  }
  
  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    const configs: Partial<Record<SlotName, SlotConfig>> = {
      header: { visible: false },
      control: { visible: true },
      animation: { visible: true },
      graph: { visible: this.graphExpanded },
      readout: { visible: true }
    };
    return configs[slot];
  }
  
  handleResize(width: number, height: number, cfg?: Required<MobileStackConfig>): void {
    const config = cfg || this.getConfig();
    
    this.safely(() => {
      if (this.animationSection) {
        const newHeight = Math.max(
          config.animationMinHeight,
          Math.min(config.animationMaxHeight, height * (config.animationHeightVh / 100))
        );
        this.animationSection.style.height = `${newHeight}px`;
      }
      
      // 横屏模式优化
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
        graphExpanded: this.graphExpanded,
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
        this.graphExpanded = state.graphExpanded ?? DEFAULT_CONFIG.graphExpanded;
      }
    }, 'loadState');
  }
  
  // ========================================================================
  // 销毁
  // ========================================================================
  
  async unmount(): Promise<void> {
    await this.safely(async () => {
      // 清理手势识别器
      this.gestureRecognizer?.destroy();
      this.gestureRecognizer = null;
      
      // 清理主题管理器
      this.themeManager?.destroy();
      this.themeManager = null;
      
      // 清理性能监控
      this.perfMonitor?.destroy();
      this.perfMonitor = null;
      
      // 清理 IntersectionObserver
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;
      
      // 清理 ResizeObserver
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      
      // 清理事件监听器
      this.eventCleanups.forEach(cleanup => cleanup());
      this.eventCleanups = [];
      
      // 清理 DOM 引用
      this.scrollContainer = null;
      this.controlsBar = null;
      this.animationSection = null;
      this.stageSlot = null;
      this.stageCanvas = null;
      this.graphSection = null;
      this.graphSlot = null;
      this.graphToggle = null;
      this.controlSection = null;
      this.controlSlot = null;
      this.readoutBar = null;
      this.playBtn = null;
      this.speedValueEl = null;
      this.fullscreenBtn = null;
      this.debugPanel = null;
    }, 'unmount');
    
    await super.unmount();
  }
}

// 导出类型
export type { GestureRecognizer, ThemeManager, PerformanceMonitor };

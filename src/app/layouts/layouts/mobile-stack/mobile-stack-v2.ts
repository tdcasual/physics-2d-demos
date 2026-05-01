/**
 * MobileStackLayout v2 — 纯 ILayout 实现，移动端垂直堆叠布局
 *
 * 只定义 DOM 结构 + Capability 声明，所有功能由 Capability 提供。
 * 剥离了手势、懒加载、性能监控等内建功能。
 *
 * @review-date 2026-04-26
 * @version 2.0.0
 */

import type {
  ILayout,
  CapabilityDeclaration,
  LayoutSlots,
  LayoutConfig,
  Theme,
  SlotName
} from '../../core/types';

export interface MobileStackConfig extends LayoutConfig {
  animationHeightVh?: number;
  animationMinHeight?: number;
  animationMaxHeight?: number;
  hasGraph?: boolean;
  graphExpanded?: boolean;
}

export class MobileStackLayoutV2 implements ILayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的垂直堆叠布局';
  readonly supportedSlots: SlotName[] = [
    'header', 'control', 'animation', 'graph', 'readout'
  ];

  readonly capabilities: CapabilityDeclaration[] = [
    { id: 'transport-bar', config: { mountSlot: 'animation' } },
    { id: 'readout-panel', config: { position: 'inline', collapsed: false, cssPrefix: 'mobile' } },
    { id: 'theme-toggle' },
    { id: 'mode-toggle' },
    { id: 'demo-profile' }
  ];

  private slots: Partial<LayoutSlots> = {};
  private cfg: MobileStackConfig;
  private currentTheme: Theme = 'light';
  private _container: HTMLElement;

  // DOM refs
  private scrollContainer: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private readoutSlot: HTMLElement | null = null;

  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    this.cfg = config;
    this._container = container;
  }

  // ========================================================================
  // ILayout core
  // ========================================================================

  async mount(): Promise<LayoutSlots> {
    // Guard against double-mount
    if (Object.keys(this.slots).length > 0) return this.slots as LayoutSlots;

    const cfg = this.cfg;
    const container = this._container;

    container.classList.add('mobile-stack-layout', 'layout-master');
    container.dataset.testid = 'mobile-stack-layout';
    container.dataset.theme = this.currentTheme;
    container.dataset.mode = 'normal';

    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'mobile-scroll-container';

    // Animation section
    const animationSection = document.createElement('div');
    animationSection.className = 'mobile-animation-section';

    // Use dvh for modern browsers (auto-adjusts for mobile keyboard),
    // fallback to vh. Note: CSS vh alone won't respond to keyboard
    // changes; handleResize covers container-level resizes.
    const testEl = document.createElement('div');
    testEl.style.cssText = 'position:absolute;visibility:hidden;height:1dvh';
    container.appendChild(testEl);
    const vhUnit = testEl.offsetHeight > 0 ? 'dvh' : 'vh';
    testEl.remove();

    const animMinH = Number.isFinite(cfg.animationMinHeight) ? cfg.animationMinHeight! : 300;
    const animVh = Number.isFinite(cfg.animationHeightVh) ? cfg.animationHeightVh! : 60;

    if (cfg.hasGraph === false) {
      animationSection.classList.add('auto-height');
      animationSection.style.height = 'auto';
      animationSection.style.minHeight = `${animMinH}px`;
    } else {
      animationSection.style.height = `${animVh}${vhUnit}`;
      animationSection.style.minHeight = `${animMinH}px`;
    }

    this.stageSlot = document.createElement('div');
    this.stageSlot.className = 'mobile-stage-slot';
    this.stageCanvas = (cfg as Record<string, unknown>).preservedCanvas as HTMLCanvasElement | null
      ?? document.createElement('canvas');
    this.stageCanvas.className = 'mobile-stage-canvas stage-canvas';
    this.stageSlot.appendChild(this.stageCanvas);
    animationSection.appendChild(this.stageSlot);
    this.scrollContainer.appendChild(animationSection);

    // Graph section (optional)
    if (cfg.hasGraph !== false) {
      const graphSection = document.createElement('section');
      graphSection.className = 'mobile-graph-section graph-section';
      graphSection.setAttribute('data-collapsed', String(!(cfg.graphExpanded ?? false)));
      const graphH2 = document.createElement('h2');
      graphH2.className = 'mobile-section-title';
      graphH2.textContent = '📈 数据图表';
      graphSection.appendChild(graphH2);
      this.graphSlot = document.createElement('div');
      this.graphSlot.className = 'mobile-graph-slot';
      graphSection.appendChild(this.graphSlot);
      this.scrollContainer.appendChild(graphSection);
      this.slots.graph = this.graphSlot;
    }

    // Control section
    const controlSection = document.createElement('div');
    controlSection.className = 'mobile-control-section control-section';
    controlSection.setAttribute('role', 'region');
    controlSection.setAttribute('aria-label', '控制区域');

    const controlHeader = document.createElement('div');
    controlHeader.className = 'mobile-control-header';
    controlHeader.textContent = '⚙️ 控制区';
    controlSection.appendChild(controlHeader);

    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'mobile-control-slot';
    controlSection.appendChild(this.controlSlot);

    // Readout inline
    this.readoutSlot = document.createElement('div');
    this.readoutSlot.className = 'mobile-readout-slot';
    controlSection.appendChild(this.readoutSlot);

    this.scrollContainer.appendChild(controlSection);
    container.appendChild(this.scrollContainer);

    this.slots.control = this.controlSlot;
    this.slots.animation = this.stageSlot;
    this.slots.readout = this.readoutSlot;

    return this.slots as LayoutSlots;
  }

  async unmount(): Promise<void> {
    this._container.classList.remove('mobile-stack-layout', 'layout-master', 'is-landscape');
    delete this._container.dataset.testid;
    delete this._container.dataset.theme;
    delete this._container.dataset.mode;
    try {
      this._container.replaceChildren();
    } catch { /* container may be detached */ }
    this.slots = {};
    this.scrollContainer = null;
    this.controlSlot = null;
    this.stageSlot = null;
    this.stageCanvas = null;
    this.graphSlot = null;
    this.readoutSlot = null;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this._container.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  handleResize(width: number, height: number): void {
    const cfg = this.cfg;
    const animationSection = this.stageSlot?.parentElement;
    if (animationSection && !animationSection.classList.contains('auto-height')) {
      const minH = Number.isFinite(cfg.animationMinHeight) ? cfg.animationMinHeight! : 300;
      const maxH = Number.isFinite(cfg.animationMaxHeight) ? cfg.animationMaxHeight! : 800;
      const vhPct = Number.isFinite(cfg.animationHeightVh) ? cfg.animationHeightVh! : 60;
      const newHeight = Math.max(minH, Math.min(maxH, height * (vhPct / 100)));
      animationSection.style.height = `${newHeight}px`;
    }

    this._container.classList.toggle('is-landscape', width > height);
  }

  getSlots(): Partial<LayoutSlots> {
    return this.slots;
  }

  getLayoutState(): Record<string, unknown> {
    return {};
  }

  restoreLayoutState(_state: Record<string, unknown>): void {
    // graphExpanded handled by capability
  }

  _updateConfig(config?: MobileStackConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }
}

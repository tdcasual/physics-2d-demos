/**
 * MobileStackLayout v2 — 纯 ILayout 实现，移动端 Tab 切换布局
 *
 * 只定义 DOM 结构 + Capability 声明，所有功能由 Capability 提供。
 * 顶部动画区始终可见，下方 Tab 栏切换图表/控制/数据三个面板。
 *
 * @review-date 2026-05-02
 * @version 2.1.0
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
}

export class MobileStackLayoutV2 implements ILayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的 Tab 切换布局';
  readonly supportedSlots: SlotName[] = [
    'header', 'control', 'animation', 'graph', 'readout'
  ];

  readonly capabilities: CapabilityDeclaration[];

  private slots: Partial<LayoutSlots> = {};
  private cfg: MobileStackConfig;
  private currentTheme: Theme = 'light';
  private _container: HTMLElement;

  private static readonly DEFAULTS = {
    animMinHeight: 220,
    animVh: 35,
    animMaxHeight: 400
  };

  // DOM refs
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private readoutSlot: HTMLElement | null = null;
  private tabBar: HTMLElement | null = null;

  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    this.cfg = config;
    this._container = container;

    const readoutLabel = (config as Record<string, unknown>).readoutLabel as string | undefined;
    this.capabilities = [
      { id: 'transport-bar', config: { mountSlot: 'animation' } },
      { id: 'readout-panel', config: { position: 'inline', collapsed: false, cssPrefix: 'mobile', label: readoutLabel ?? '数据读数' } },
      { id: 'theme-toggle' },
      { id: 'mode-toggle' },
      { id: 'demo-profile' }
    ];
  }

  // ========================================================================
  // ILayout core
  // ========================================================================

  async mount(): Promise<LayoutSlots> {
    if (Object.keys(this.slots).length > 0) return this.slots as LayoutSlots;

    const cfg = this.cfg;
    const container = this._container;

    container.classList.add('mobile-stack-layout', 'layout-master');
    container.dataset.testid = 'mobile-stack-layout';
    container.dataset.theme = this.currentTheme;
    container.dataset.mode = 'normal';

    // ---- Animation section (always visible at top) ----

    const testEl = document.createElement('div');
    testEl.style.cssText = 'position:absolute;visibility:hidden;height:1dvh';
    container.appendChild(testEl);
    const vhUnit = testEl.offsetHeight > 0 ? 'dvh' : 'vh';
    testEl.remove();

    const D = MobileStackLayoutV2.DEFAULTS;
    const animMinH = Number.isFinite(cfg.animationMinHeight) ? cfg.animationMinHeight! : D.animMinHeight;
    const animVh = Number.isFinite(cfg.animationHeightVh) ? cfg.animationHeightVh! : D.animVh;

    const animationSection = document.createElement('div');
    animationSection.className = 'mobile-animation-section';
    animationSection.style.height = `${animVh}${vhUnit}`;
    animationSection.style.minHeight = `${animMinH}px`;

    this.stageSlot = document.createElement('div');
    this.stageSlot.className = 'mobile-stage-slot';
    this.stageCanvas = (cfg as Record<string, unknown>).preservedCanvas as HTMLCanvasElement | null
      ?? document.createElement('canvas');
    this.stageCanvas.className = 'mobile-stage-canvas stage-canvas';
    this.stageSlot.appendChild(this.stageCanvas);
    animationSection.appendChild(this.stageSlot);
    container.appendChild(animationSection);

    // ---- Tab system ----

    interface TabDef { id: string; label: string; slotKey: keyof LayoutSlots; }
    const tabs: TabDef[] = [];
    if (cfg.hasGraph !== false) {
      tabs.push({ id: 'graph', label: '📈 图表', slotKey: 'graph' });
    }
    tabs.push(
      { id: 'control', label: '⚙️ 控制', slotKey: 'control' },
      { id: 'readout', label: '📊 数据', slotKey: 'readout' }
    );

    // Tab bar
    this.tabBar = document.createElement('nav');
    this.tabBar.className = 'mobile-tab-bar';
    this.tabBar.setAttribute('role', 'tablist');

    // Tab content area
    const tabContent = document.createElement('div');
    tabContent.className = 'mobile-tab-content';

    const panels = new Map<string, HTMLElement>();
    const allIds = tabs.map(t => t.id);

    for (const tab of tabs) {
      // Tab button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', `mobile-panel-${tab.id}`);
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => this._switchTab(tab.id, allIds, panels));
      this.tabBar.appendChild(btn);

      // Tab panel
      const panel = document.createElement('div');
      panel.className = 'mobile-tab-panel';
      panel.id = `mobile-panel-${tab.id}`;
      panel.setAttribute('role', 'tabpanel');

      const slot = document.createElement('div');
      slot.className = `mobile-${tab.id}-slot`;
      panel.appendChild(slot);
      tabContent.appendChild(panel);

      panels.set(tab.id, panel);

      // Store slot references
      if (tab.slotKey === 'graph') this.graphSlot = slot;
      else if (tab.slotKey === 'control') this.controlSlot = slot;
      else if (tab.slotKey === 'readout') this.readoutSlot = slot;
    }

    // Activate default tab
    this._switchTab('control', allIds, panels);

    container.appendChild(this.tabBar);
    container.appendChild(tabContent);

    this.slots.control = this.controlSlot!;
    this.slots.animation = this.stageSlot;
    this.slots.readout = this.readoutSlot!;
    if (this.graphSlot) this.slots.graph = this.graphSlot;

    return this.slots as LayoutSlots;
  }

  private _switchTab(
    tabId: string,
    allIds: string[],
    panels: Map<string, HTMLElement>
  ): void {
    if (!this.tabBar) return;
    for (const id of allIds) {
      const btn = this.tabBar.querySelector(`[data-tab="${id}"]`);
      const panel = panels.get(id);
      const active = id === tabId;
      if (btn) {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
      }
      if (panel) {
        panel.classList.toggle('active', active);
      }
    }
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
    this.stageSlot = null;
    this.stageCanvas = null;
    this.graphSlot = null;
    this.controlSlot = null;
    this.readoutSlot = null;
    this.tabBar = null;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this._container.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  handleResize(width: number, height: number): void {
    const D = MobileStackLayoutV2.DEFAULTS;
    const cfg = this.cfg;
    const animationSection = this.stageSlot?.parentElement;
    if (animationSection) {
      const minH = Number.isFinite(cfg.animationMinHeight) ? cfg.animationMinHeight! : D.animMinHeight;
      const maxH = Number.isFinite(cfg.animationMaxHeight) ? cfg.animationMaxHeight! : D.animMaxHeight;
      const vhPct = Number.isFinite(cfg.animationHeightVh) ? cfg.animationHeightVh! : D.animVh;
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
    // state restored via tab activation if needed
  }

  _updateConfig(config?: MobileStackConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }
}

/**
 * MobileStackLayout — 移动端 Tab 切换布局
 *
 * 只定义 DOM 结构 + Capability 声明，所有功能由 Capability 提供。
 * 顶部动画区始终可见，下方 Tab 栏切换图表/控制/数据三个面板。
 */

import type {
  ILayout,
  CapabilityDeclaration,
  LayoutSlots,
  LayoutConfig,
  LayoutTransition,
  Theme,
  SlotName
} from '../../types';
import { enterLayout, exitLayout } from '../../_shared/layout-transition';

export interface MobileStackConfig extends LayoutConfig {
  animationHeightVh?: number;
  animationMinHeight?: number;
  animationMaxHeight?: number;
  hasGraph?: boolean;
  readoutLabel?: string;
}

export class MobileStackLayout implements ILayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的 Tab 切换布局';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
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

  // Tab state
  private _activeTabId: string = 'control';
  private _abortCtl = new AbortController();
  private _tabAllIds: string[] = [];
  private _tabPanels = new Map<string, HTMLElement>();

  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    this.cfg = config;
    this._container = container;

    this.capabilities = [
      ...(config.hideTransport
        ? []
        : [{ id: 'transport-bar' as const, config: {} }]),
      {
        id: 'readout-panel',
        config: {
          position: 'inline',
          collapsed: false,
          cssPrefix: 'mobile',
          label: config.readoutLabel ?? '数据读数'
        }
      },
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
    container.style.height = '100dvh';

    // ---- Control bar skeleton (transport + toggles) ----
    // Transport controls are created by transport-bar capability.
    // Toggle buttons are created by theme-toggle/mode-toggle capabilities.

    const controlBar = document.createElement('div');
    controlBar.className = 'mobile-control-bar';

    const togglesGroup = document.createElement('div');
    togglesGroup.className = 'mobile-transport-toggles';

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className =
      'theme-toggle-btn shell-theme-toggle mobile-toggle-btn';
    themeBtn.setAttribute('aria-label', '切换到夜间主题');
    themeBtn.textContent = '☾';

    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.className = 'mode-toggle-btn mode-toggle mobile-toggle-btn';
    modeBtn.setAttribute('aria-label', '切换到演示模式');
    modeBtn.textContent = '演示';

    togglesGroup.append(themeBtn, modeBtn);
    controlBar.appendChild(togglesGroup);
    container.appendChild(controlBar);

    // Inject controlBar reference for transport-bar compact mode
    const transportCap = this.capabilities.find(
      (c) => c.id === 'transport-bar'
    );
    if (transportCap) {
      transportCap.config = {
        ...(transportCap.config ?? {}),
        container: controlBar
      };
    }

    // ---- Animation section (always visible at top) ----

    const vhUnit =
      typeof CSS !== 'undefined' && CSS.supports?.('height', '1dvh')
        ? 'dvh'
        : 'vh';

    const D = MobileStackLayout.DEFAULTS;
    const animMinH = Number.isFinite(cfg.animationMinHeight)
      ? cfg.animationMinHeight!
      : D.animMinHeight;
    const animVh = Number.isFinite(cfg.animationHeightVh)
      ? cfg.animationHeightVh!
      : D.animVh;

    const animationSection = document.createElement('div');
    animationSection.className = 'mobile-animation-section';
    animationSection.style.height = `${animVh}${vhUnit}`;
    animationSection.style.minHeight = `${animMinH}px`;

    this.stageSlot = document.createElement('div');
    this.stageSlot.className = 'mobile-stage-slot';
    this.stageCanvas = cfg.preservedCanvas ?? document.createElement('canvas');
    this.stageCanvas.className = 'mobile-stage-canvas stage-canvas';
    this.stageCanvas.setAttribute(
      'aria-label',
      cfg.title ? `动画演示区域：${cfg.title}` : '动画演示区域'
    );
    this.stageSlot.appendChild(this.stageCanvas);
    animationSection.appendChild(this.stageSlot);
    container.appendChild(animationSection);

    // ---- Tab system ----

    interface TabDef {
      id: string;
      label: string;
      slotKey: keyof LayoutSlots;
    }
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
    this.tabBar.setAttribute('aria-label', '面板切换');
    this.tabBar.addEventListener('keydown', (e) => this._onTabKeydown(e), {
      signal: this._abortCtl.signal
    });

    // Tab content area
    const tabContent = document.createElement('div');
    tabContent.className = 'mobile-tab-content';

    this._tabPanels.clear();
    this._tabAllIds = tabs.map((t) => t.id);

    for (const tab of tabs) {
      // Tab button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-tab';
      btn.id = `mobile-tab-${tab.id}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', `mobile-panel-${tab.id}`);
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => this._switchTab(tab.id), {
        signal: this._abortCtl.signal
      });
      this.tabBar.appendChild(btn);

      // Tab panel
      const panel = document.createElement('div');
      panel.className = 'mobile-tab-panel';
      panel.id = `mobile-panel-${tab.id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `mobile-tab-${tab.id}`);
      // 面板内容可滚动，需可聚焦以供键盘滚动（axe scrollable-region-focusable）
      panel.tabIndex = 0;

      const slot = document.createElement('div');
      slot.className =
        tab.id === 'control'
          ? `mobile-${tab.id}-slot control-slot`
          : `mobile-${tab.id}-slot`;
      panel.appendChild(slot);
      tabContent.appendChild(panel);

      this._tabPanels.set(tab.id, panel);

      // Store slot references
      if (tab.slotKey === 'graph') this.graphSlot = slot;
      else if (tab.slotKey === 'control') this.controlSlot = slot;
      else if (tab.slotKey === 'readout') this.readoutSlot = slot;
    }

    // Activate saved or default tab
    const defaultTab = this._tabAllIds.includes(this._activeTabId)
      ? this._activeTabId
      : 'control';
    this._switchTab(defaultTab);

    container.appendChild(this.tabBar);
    container.appendChild(tabContent);

    this.slots.control = this.controlSlot!;
    this.slots.animation = this.stageSlot;
    this.slots.readout = this.readoutSlot!;
    if (this.graphSlot) this.slots.graph = this.graphSlot;

    return this.slots as LayoutSlots;
  }

  private _switchTab(tabId: string): void {
    if (!this.tabBar) return;
    this._activeTabId = tabId;
    for (const id of this._tabAllIds) {
      const btn = this.tabBar.querySelector<HTMLElement>(`[data-tab="${id}"]`);
      const panel = this._tabPanels.get(id);
      const active = id === tabId;
      if (btn) {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
        // roving tabindex: only the active tab stays in the tab order
        btn.tabIndex = active ? 0 : -1;
      }
      if (panel) {
        panel.classList.toggle('active', active);
      }
    }
  }

  /** WAI-ARIA tabs keyboard support: ←/→/Home/End 移动焦点并自动激活 */
  private _onTabKeydown(event: KeyboardEvent): void {
    const ids = this._tabAllIds;
    if (ids.length === 0) return;
    const currentIndex = Math.max(ids.indexOf(this._activeTabId), 0);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % ids.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = ids.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextId = ids[nextIndex];
    this._switchTab(nextId);
    this.tabBar?.querySelector<HTMLElement>(`[data-tab="${nextId}"]`)?.focus();
  }

  async unmount(): Promise<void> {
    this._abortCtl.abort();
    this._abortCtl = new AbortController();
    this._container.classList.remove(
      'mobile-stack-layout',
      'layout-master',
      'is-landscape'
    );
    delete this._container.dataset.testid;
    delete this._container.dataset.theme;
    delete this._container.dataset.mode;
    try {
      this._container.replaceChildren();
    } catch {
      /* container may be detached */
    }
    this.slots = {};
    this.stageSlot = null;
    this.stageCanvas = null;
    this.graphSlot = null;
    this.controlSlot = null;
    this.readoutSlot = null;
    this.tabBar = null;
    this._tabPanels.clear();
    this._tabAllIds = [];
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this._container.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  handleResize(width: number, height: number): void {
    const D = MobileStackLayout.DEFAULTS;
    const cfg = this.cfg;
    const animationSection = this.stageSlot?.parentElement;
    if (animationSection) {
      const minH = Number.isFinite(cfg.animationMinHeight)
        ? cfg.animationMinHeight!
        : D.animMinHeight;
      const maxH = Number.isFinite(cfg.animationMaxHeight)
        ? cfg.animationMaxHeight!
        : D.animMaxHeight;
      const vhPct = Number.isFinite(cfg.animationHeightVh)
        ? cfg.animationHeightVh!
        : D.animVh;
      const newHeight = Math.max(minH, Math.min(maxH, height * (vhPct / 100)));
      animationSection.style.height = `${newHeight}px`;
    }
    this._container.classList.toggle('is-landscape', width > height);
  }

  enter(transition: LayoutTransition): Promise<void> {
    return enterLayout(this._container, transition);
  }

  exit(transition: LayoutTransition): Promise<void> {
    return exitLayout(this._container, transition);
  }

  getSlots(): Partial<LayoutSlots> {
    return this.slots;
  }

  getLayoutState(): Record<string, unknown> {
    return { activeTab: this._activeTabId };
  }

  restoreLayoutState(state: Record<string, unknown>): void {
    if (
      typeof state.activeTab === 'string' &&
      this._tabAllIds.includes(state.activeTab)
    ) {
      this._switchTab(state.activeTab);
    }
  }

  _updateConfig(config?: MobileStackConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }
}

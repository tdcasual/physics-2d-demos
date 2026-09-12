/**
 * LabStageLayout — 实验台：动画在上、控制在下，
 * 实验数据与图表为可拖拽悬浮面板（最小化后原地保留标题条）。
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
import { shouldEnableDebugOverlay } from '../../capabilities/debug-overlay';
import { makeDraggable, makeResizable } from '../../../../ui/utils/draggable';

export interface LabStageConfig extends LayoutConfig {
  graphCollapsed?: boolean;
  dataCollapsed?: boolean;
  readoutLabel?: string;
  graphLabel?: string;
  controlColumns?: string | number;
}

export class LabStageLayout implements ILayout {
  readonly id = 'lab-stage';
  readonly name = '实验台';
  readonly description = '动画在上、控制在下，数据表与图表悬浮';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  readonly capabilities: CapabilityDeclaration[];

  private slots: Partial<LayoutSlots> = {};
  private cfg: LabStageConfig;
  private currentTheme: Theme = 'light';
  private _container: HTMLElement;
  private graphPanel: HTMLElement | null = null;
  private dataPanel: HTMLElement | null = null;
  private dragCleanups: Array<() => void> = [];
  private abort = new AbortController();
  private savedFloatOpen: { data: boolean; graph: boolean } | null = null;

  constructor(container: HTMLElement, config: LabStageConfig = {}) {
    this.cfg = config;
    this._container = container;
    this.capabilities = [
      ...(config.hideTransport
        ? []
        : [
            {
              id: 'transport-bar' as const,
              config: { mountSlot: 'animation' as const }
            }
          ]),
      { id: 'theme-toggle' },
      { id: 'mode-toggle' },
      { id: 'layout-switch' },
      {
        id: 'demo-profile',
        config: { sidebarSelector: '.lab-control-section' }
      },
      ...(shouldEnableDebugOverlay() ? [{ id: 'debug-overlay' as const }] : [])
    ];
  }

  async mount(): Promise<LayoutSlots> {
    if (Object.keys(this.slots).length > 0) return this.slots as LayoutSlots;

    const container = this._container;
    container.classList.add(
      'lab-stage-layout',
      'layout-master',
      'teaching-demo'
    );
    container.dataset.testid = 'lab-stage-layout';
    container.dataset.theme = this.currentTheme;
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100dvh';
    container.style.minHeight = '0';
    container.style.overflow = 'hidden';

    const main = document.createElement('div');
    main.className = 'lab-stage-main';

    const stageWrap = document.createElement('div');
    stageWrap.className = 'lab-stage-anim';
    const toolbar = this.buildToolbar();
    stageWrap.appendChild(toolbar);
    const animation = document.createElement('div');
    animation.className = 'lab-stage-slot animation-slot';
    const canvas = this.cfg.preservedCanvas ?? document.createElement('canvas');
    canvas.className = 'lab-stage-canvas stage-canvas';
    canvas.setAttribute(
      'aria-label',
      this.cfg.title ? `动画演示区域：${this.cfg.title}` : '动画演示区域'
    );
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    animation.appendChild(canvas);
    stageWrap.appendChild(animation);

    const controlSection = document.createElement('section');
    controlSection.className =
      'lab-control-section control-section layout-left-panel';
    const controlHeader = document.createElement('div');
    controlHeader.className = 'lab-section-header';
    const controlTitle = document.createElement('h2');
    controlTitle.className = 'lab-section-title section-title';
    controlTitle.textContent = '控制区';
    controlHeader.appendChild(controlTitle);
    controlSection.appendChild(controlHeader);
    const control = document.createElement('div');
    control.className = 'lab-control-slot control-slot';
    control.dataset.controlColumns = String(this.cfg.controlColumns ?? 'auto');
    controlSection.appendChild(control);

    main.append(stageWrap, controlSection);
    container.appendChild(main);

    const dataCollapsed = this.cfg.dataCollapsed === true;
    const graphCollapsed = this.cfg.graphCollapsed !== false;

    const data = this.buildFloat({
      id: 'data',
      title: this.cfg.readoutLabel ?? '实验数据',
      collapsed: dataCollapsed,
      extraClass: 'lab-float-data',
      slotClass: 'lab-data-slot',
      slotAttrs: { 'data-lab-data-slot': 'true' }
    });
    const graph = this.buildFloat({
      id: 'graph',
      title: this.cfg.graphLabel ?? '数据图表',
      collapsed: graphCollapsed,
      extraClass: 'lab-float-graph',
      slotClass: 'lab-graph-slot graph-slot graph-grid'
    });

    container.append(data.panel, graph.panel);

    this.dataPanel = data.panel;
    this.graphPanel = graph.panel;

    const notifyResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    this.dragCleanups.push(
      makeDraggable(data.panel, data.header, { clampToParent: true }),
      makeDraggable(graph.panel, graph.header, { clampToParent: true }),
      makeResizable(data.panel, {
        minWidth: 260,
        minHeight: 140,
        onResize: notifyResize
      }),
      makeResizable(graph.panel, {
        minWidth: 280,
        minHeight: 160,
        onResize: notifyResize
      })
    );

    const readout = document.createElement('div');
    readout.className = 'lab-readout-slot readout-slot';
    data.slot.insertAdjacentElement('afterend', readout);

    this.slots = {
      animation,
      control,
      readout,
      graph: graph.slot
    };

    container.addEventListener(
      'layout:modechange',
      (event: Event) => {
        const mode = (event as CustomEvent<{ mode?: string }>).detail?.mode;
        if (mode === 'presentation') this.applyPresentationFloats();
        else if (mode === 'normal') this.restorePresentationFloats();
      },
      { signal: this.abort.signal }
    );
    if (container.getAttribute('data-mode') === 'presentation') {
      this.applyPresentationFloats();
    }

    return this.slots as LayoutSlots;
  }

  private applyPresentationFloats(): void {
    if (!this.savedFloatOpen) {
      this.savedFloatOpen = {
        data: !this.dataPanel?.classList.contains('is-collapsed'),
        graph: !this.graphPanel?.classList.contains('is-collapsed')
      };
    }
    this.setPanelOpen('data', false);
    this.setPanelOpen('graph', false);
  }

  private restorePresentationFloats(): void {
    if (!this.savedFloatOpen) return;
    this.setPanelOpen('data', this.savedFloatOpen.data);
    this.setPanelOpen('graph', this.savedFloatOpen.graph);
    this.savedFloatOpen = null;
  }

  private buildToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'lab-stage-toolbar stage-toolbar';
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'shell-theme-toggle theme-toggle-btn';
    themeBtn.setAttribute('aria-label', '切换到夜间主题');
    themeBtn.textContent = '夜间';
    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.className = 'lab-mode-toggle mode-toggle mode-toggle-btn';
    modeBtn.setAttribute('aria-label', '切换到演示模式');
    modeBtn.textContent = '演示';
    const layoutBtn = document.createElement('button');
    layoutBtn.type = 'button';
    layoutBtn.className = 'layout-switch-btn';
    layoutBtn.setAttribute('aria-label', '切换布局');
    layoutBtn.textContent = '布局';
    toolbar.append(themeBtn, modeBtn, layoutBtn);
    return toolbar;
  }

  private buildFloat(opts: {
    id: string;
    title: string;
    collapsed: boolean;
    extraClass: string;
    slotClass: string;
    slotAttrs?: Record<string, string>;
  }): {
    panel: HTMLElement;
    header: HTMLElement;
    slot: HTMLElement;
  } {
    const panel = document.createElement('section');
    panel.className = `lab-float ${opts.extraClass}`;
    panel.id = `lab-panel-${opts.id}`;
    panel.setAttribute('aria-label', opts.title);

    const header = document.createElement('div');
    header.className = 'lab-float-header';
    const title = document.createElement('h2');
    title.className = 'lab-float-title';
    title.textContent = opts.title;
    const fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'lab-float-fold';
    fold.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();
        const collapsed = panel.classList.contains('is-collapsed');
        this.setPanelOpen(opts.id, collapsed);
      },
      { signal: this.abort.signal }
    );
    header.append(title, fold);

    const body = document.createElement('div');
    body.className = 'lab-float-body mobile-tab-panel';
    body.id = `lab-panel-body-${opts.id}`;
    fold.setAttribute('aria-controls', body.id);
    const slot = document.createElement('div');
    slot.className = opts.slotClass;
    if (opts.slotAttrs) {
      for (const [k, v] of Object.entries(opts.slotAttrs)) {
        slot.setAttribute(k, v);
      }
    }
    body.appendChild(slot);
    panel.append(header, body);

    this.applyOpen(panel, body, !opts.collapsed);
    return { panel, header, slot };
  }

  private applyOpen(
    panel: HTMLElement,
    body: HTMLElement,
    open: boolean
  ): void {
    panel.classList.toggle('is-collapsed', !open);
    body.classList.toggle('active', open);
    const title = panel.querySelector('.lab-float-title')?.textContent ?? '';
    const fold = panel.querySelector('.lab-float-fold');
    if (fold instanceof HTMLButtonElement) {
      fold.textContent = open ? '−' : '+';
      fold.setAttribute('aria-label', open ? `最小化${title}` : `展开${title}`);
      fold.setAttribute('aria-expanded', String(open));
    }
  }

  private setPanelOpen(id: string, open: boolean): void {
    const panel = id === 'graph' ? this.graphPanel : this.dataPanel;
    if (!panel) return;
    const body = panel.querySelector('.lab-float-body');
    if (!(body instanceof HTMLElement)) return;
    this.applyOpen(panel, body, open);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  async unmount(): Promise<void> {
    this.abort.abort();
    this.abort = new AbortController();
    this.dragCleanups.forEach((fn) => fn());
    this.dragCleanups = [];
    this._container.classList.remove(
      'lab-stage-layout',
      'layout-master',
      'teaching-demo'
    );
    this.savedFloatOpen = null;
    delete this._container.dataset.testid;
    delete this._container.dataset.theme;
    try {
      this._container.replaceChildren();
    } catch {
      /* detached */
    }
    this.slots = {};
    this.graphPanel = null;
    this.dataPanel = null;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this._container.dataset.theme = theme;
  }

  handleResize(_width: number, _height: number): void {
    /* floats stay overlay; main column is flex */
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

  _updateConfig(config?: LabStageConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }
}

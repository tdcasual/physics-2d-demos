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
import { buildBaseCapabilities } from '../../capabilities/base-declarations';
import { layoutReuseKey } from '../../layout-reuse-key';
import { makeDraggable, makeResizable } from '../../../../ui/utils/draggable';
import { buildStageToolbar } from '../../../../ui/stage-toolbar';
import { requestLayoutResize } from '../../request-layout-resize';
import {
  GRAPH_BODY_ATTR,
  GRAPH_SECTION_ATTR,
  LAB_DATA_SLOT_ATTR,
  READOUT_SLOT_ATTR,
  STAGE_FRAME_ATTR
} from '../../../../platform/stage-chrome';
import { READOUT_OVERLAY_ATTR } from '../../../../platform/stage-readout';

export interface LabStageConfig extends LayoutConfig {
  graphCollapsed?: boolean;
  dataCollapsed?: boolean;
  /** Visible data float; default true. false keeps the slot, hides the panel. */
  floatData?: boolean;
  /** Visible graph float; default true. false keeps the slot, hides the panel. */
  floatGraph?: boolean;
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
    this.capabilities = LabStageLayout.capabilityDecls(config);
  }

  private static capabilityDecls(
    config: LabStageConfig
  ): CapabilityDeclaration[] {
    return buildBaseCapabilities(config, {
      transportConfig: { mountSlot: 'animation' as const },
      afterDataWorkspace: [
        {
          // inline 读数面板（与 mobile-stack 同型），挂 slots.readout
          // ——场景不再需要自挂 readout 能力（projectile-components 已删）。
          id: 'readout-panel',
          config: {
            position: 'inline',
            collapsed: false,
            cssPrefix: 'mobile',
            label: ''
          }
        }
      ],
      beforeDemoProfile: [{ id: 'layout-switch' }],
      demoProfileConfig: { sidebarSelector: '.lab-control-section' }
    });
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
    // lab 的读数遮挡物是浮窗（浮层遮挡语义同 split；场景留白契约为 true）
    container.setAttribute(READOUT_OVERLAY_ATTR, 'true');
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
    stageWrap.setAttribute(STAGE_FRAME_ATTR, '');
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

    const floatData = this.cfg.floatData !== false;
    // floatGraph 缺省跟随 graphInitiallyHidden（实验阶段不需要图表的场景
    // 不必同时写两个开关）；显式 floatGraph 优先。collapsed 不参与推导
    // （lab 默认折叠 ≠ hidden）。
    const floatGraph =
      this.cfg.floatGraph ?? (this.cfg.graphInitiallyHidden ? false : true);
    const dataCollapsed = this.cfg.dataCollapsed === true;
    const graphCollapsed = this.cfg.graphCollapsed !== false;

    const data = this.buildFloat({
      id: 'data',
      title: this.cfg.readoutLabel ?? '实验数据',
      collapsed: dataCollapsed,
      extraClass: 'lab-float-data',
      slotClass: 'lab-data-slot',
      slotAttrs: { [LAB_DATA_SLOT_ATTR]: 'true' }
    });
    const graph = this.buildFloat({
      id: 'graph',
      title: this.cfg.graphLabel ?? '数据图表',
      collapsed: graphCollapsed,
      extraClass: 'lab-float-graph',
      slotClass: 'lab-graph-slot graph-slot graph-grid'
    });
    // 图区收养目标 = 整个浮窗 panel；内容体锚点 = 现成的 .lab-float-body
    graph.panel.setAttribute(GRAPH_SECTION_ATTR, '');
    graph.body.setAttribute(GRAPH_BODY_ATTR, '');

    this.setFloatVisible(data.panel, floatData);
    this.setFloatVisible(graph.panel, floatGraph);
    if (!floatGraph) {
      // 图表默认隐藏的标记（graphInitiallyHidden 同一语义）：slot 保留作
      // 工作区收养锚点；布局矩阵据此跳过"图表可见"断言
      container.dataset.graphInitiallyHidden = 'true';
    }

    container.append(data.panel, graph.panel);

    this.dataPanel = data.panel;
    this.graphPanel = graph.panel;

    const notifyResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    if (floatData) {
      this.dragCleanups.push(
        makeDraggable(data.panel, data.header, { clampToParent: true }),
        makeResizable(data.panel, {
          minWidth: 260,
          minHeight: 140,
          onResize: notifyResize
        })
      );
    }
    if (floatGraph) {
      this.dragCleanups.push(
        makeDraggable(graph.panel, graph.header, { clampToParent: true }),
        makeResizable(graph.panel, {
          minWidth: 280,
          minHeight: 160,
          onResize: notifyResize
        })
      );
    }

    const readout = document.createElement('div');
    readout.className = 'lab-readout-slot readout-slot';
    readout.setAttribute(READOUT_SLOT_ATTR, '');
    // 读数插槽在数据插槽**之前**：场景数据面板 append 进 data slot 后，
    // 视觉位序为「读数在上、数据表在下」——与 projectile-components 场景
    // 旧版手动重排的最终位序一致（该重排已随读数能力声明化删除）。
    data.slot.insertAdjacentElement('beforebegin', readout);

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
    return buildStageToolbar({
      className: 'lab-stage-toolbar stage-toolbar',
      buttons: [
        {
          key: 'theme',
          className: 'shell-theme-toggle theme-toggle-btn',
          ariaLabel: '切换到夜间主题',
          text: '夜间'
        },
        {
          key: 'mode',
          className: 'lab-mode-toggle mode-toggle mode-toggle-btn',
          ariaLabel: '切换到演示模式',
          text: '演示'
        },
        {
          key: 'layout',
          className: 'layout-switch-btn',
          ariaLabel: '切换布局',
          text: '布局'
        }
      ]
    }).toolbar;
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
    body: HTMLElement;
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
    return { panel, header, body, slot };
  }

  private setFloatVisible(panel: HTMLElement, visible: boolean): void {
    if (visible) {
      panel.hidden = false;
      panel.removeAttribute('hidden');
      return;
    }
    panel.hidden = true;
    panel.setAttribute('hidden', '');
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
    requestLayoutResize();
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
    delete this._container.dataset.graphInitiallyHidden;
    this._container.removeAttribute(READOUT_OVERLAY_ATTR);
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

  /**
   * 实例池复用时的配置更新：浅合并，新配置缺失的键保留旧值。
   * 依赖「单页单场景、同页配置恒定」假设；preservedCanvas 由容器每次
   * 显式传键（含 null）覆盖，不依赖合并。改键语义需同步此假设。
   */
  _updateConfig(config?: LabStageConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }

  getReuseKey(config?: LayoutConfig): string {
    const cfg = (config ?? this.cfg) as LabStageConfig;
    return layoutReuseKey(this.id, {
      ...cfg,
      capabilities: LabStageLayout.capabilityDecls(cfg)
    });
  }
}

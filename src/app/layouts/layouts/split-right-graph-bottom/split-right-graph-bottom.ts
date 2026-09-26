/**
 * SplitRightGraphBottomLayout — 左右分栏 + 底部图表布局
 * （控制区在左，动画区在右上方，图表网格在右下方）
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
import {
  type CssPrefix,
  buildGraphSection,
  buildResizer,
  applySplitTheme,
  getSplitLayoutState,
  restoreSplitLayoutState,
  applyResponsiveColumns
} from '../../_shared/split-helpers';
import { buildSplitLayoutDOM } from '../../_shared/split-layout-base';
import { enterLayout, exitLayout } from '../../_shared/layout-transition';
import { buildBaseCapabilities } from '../../capabilities/base-declarations';
import { READOUT_OVERLAY_ATTR } from '../../../../platform/stage-readout';

export interface SplitRightGraphBottomConfig extends LayoutConfig {
  defaultLeftRatio?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  hideHeader?: boolean;
  title?: string;
  subtitle?: string;
  graphHeight?: number;
  graphMinHeight?: number;
  graphMaxHeight?: number;
  graphColumns?: number;
  readoutLabel?: string;
}

const PREFIX: CssPrefix = 'srgb';

export class SplitRightGraphBottomLayout implements ILayout {
  readonly id = 'split-right-graph-bottom';
  readonly name = '左右分栏+底部图表';
  readonly description = '控制区在左，动画区在右上方，图表网格在右下方';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  readonly capabilities: CapabilityDeclaration[];

  private slots: Partial<LayoutSlots> = {};
  private cfg: SplitRightGraphBottomConfig;
  private leftRatio: number;
  private graphHeight: number;
  private currentTheme: Theme = 'light';
  private _container: HTMLElement;
  private graphSection: HTMLElement | null = null;
  private resizerH: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    config: SplitRightGraphBottomConfig = {}
  ) {
    this.cfg = config;
    this.leftRatio = config.defaultLeftRatio ?? 0.35;
    this.graphHeight = config.graphHeight ?? 220;
    this._container = container;

    this.capabilities = buildBaseCapabilities(config, {
      transportConfig: { mountSlot: 'animation' as const },
      afterDataWorkspace: [
        {
          id: 'readout-panel',
          config: {
            position: 'top-right',
            collapsed: true,
            cssPrefix: PREFIX,
            label: config.readoutLabel ?? '数据读数'
          }
        }
      ],
      beforeDemoProfile: [
        { id: 'layout-switch' },
        { id: 'sidebar-toggle' },
        {
          id: 'resizer',
          config: {
            direction: 'vertical',
            targetSelector: '.srgb-left-panel',
            selector: '.srgb-resizer-v',
            onResize: (r: number) => {
              this.leftRatio = r;
            }
          }
        },
        {
          id: 'resizer',
          config: {
            direction: 'horizontal',
            targetSelector: '.srgb-graph-section',
            selector: '.srgb-resizer-h',
            minSize: 120,
            maxSize: 480,
            onResize: (r: number) => {
              this.graphHeight = Math.round(
                r * (this._container.clientHeight || window.innerHeight || 800)
              );
            }
          }
        }
      ]
    });
  }

  async mount(): Promise<LayoutSlots> {
    // Guard against double-mount
    if (Object.keys(this.slots).length > 0) return this.slots as LayoutSlots;

    const container = this._container;
    const cfg = this.cfg;
    const graphMinHeight = cfg.graphMinHeight ?? 120;
    const graphMaxHeight = cfg.graphMaxHeight ?? 480;
    const graphColumns = cfg.graphColumns ?? 3;

    const { slots, rightPanel } = buildSplitLayoutDOM({
      container,
      cfg,
      prefix: PREFIX,
      leftRatio: this.leftRatio,
      currentTheme: this.currentTheme,
      containerClass: 'layout-srgb-graph-bottom layout-master',
      testId: 'split-right-graph-bottom-layout',
      leftPanelClass: 'srgb-left-panel layout-left-panel',
      rightPanelClass: 'srgb-right-panel',
      resizerVClass: 'srgb-resizer-v',
      hasGraphInLeft: false,
      rightPanelStyle:
        'display: flex; flex-direction: column; overflow: hidden;',
      existingCanvas: cfg.preservedCanvas ?? undefined
    });

    // Stage flex stays in the stylesheet. Inline flex:1 beats the chart-mode
    // 4.5rem strip and collapses this frame once the canvas is hidden.
    container.dataset.graphCollapsed = 'false';

    // Horizontal resizer between animation and graph
    this.resizerH = buildResizer(
      'srgb-resizer-h',
      'horizontal',
      '调整图表区高度'
    );
    rightPanel.appendChild(this.resizerH);

    // Graph section below horizontal resizer
    const graph = buildGraphSection(PREFIX, '数据图表');
    this.graphSection = graph.section;
    this.graphSection.style.height = `${this.graphHeight}px`;
    this.graphSection.style.minHeight = `${graphMinHeight}px`;
    this.graphSection.style.maxHeight = `${graphMaxHeight}px`;

    // 追加而非覆盖：保留 buildGraphSection 的通用 graph-slot 类，
    // 图像分析工具条等按该类定位图表插槽。
    graph.slot.classList.add('srgb-graph-grid');
    graph.slot.setAttribute('data-columns', String(graphColumns));
    rightPanel.appendChild(this.graphSection);

    if (cfg.graphInitiallyHidden) {
      this.graphSection.hidden = true;
      this.resizerH.hidden = true;
      container.dataset.graphInitiallyHidden = 'true';
    }

    this.slots = { ...slots, graph: graph.slot };
    return this.slots as LayoutSlots;
  }

  async unmount(): Promise<void> {
    this._container.classList.remove(
      'layout-srgb-graph-bottom',
      'layout-master'
    );
    delete this._container.dataset.testid;
    delete this._container.dataset.theme;
    delete this._container.dataset.mode;
    delete this._container.dataset.graphCollapsed;
    delete this._container.dataset.graphInitiallyHidden;
    this._container.removeAttribute(READOUT_OVERLAY_ATTR);
    try {
      this._container.replaceChildren();
    } catch {
      /* container may be detached */
    }
    this.slots = {};
    this.graphSection = null;
    this.resizerH = null;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    applySplitTheme(this._container, theme);
  }

  handleResize(width: number, _height: number): void {
    applyResponsiveColumns(this._container, width, this.cfg, this.leftRatio);

    if (width < (this.cfg.mobileBreakpoint ?? 768)) {
      if (this.resizerH && !this.cfg.graphInitiallyHidden)
        this.resizerH.style.display = 'none';
      if (this.graphSection) this.graphSection.style.maxHeight = '35vh';
    } else {
      if (this.resizerH && !this.cfg.graphInitiallyHidden)
        this.resizerH.style.display = 'block';
      if (this.graphSection) {
        this.graphSection.style.maxHeight = this.cfg.graphMaxHeight
          ? `${this.cfg.graphMaxHeight}px`
          : '';
      }
    }
  }

  getSlots(): Partial<LayoutSlots> {
    return this.slots;
  }

  enter(transition: LayoutTransition): Promise<void> {
    return enterLayout(this._container, transition);
  }

  exit(transition: LayoutTransition): Promise<void> {
    return exitLayout(this._container, transition);
  }

  getLayoutState(): Record<string, unknown> {
    return getSplitLayoutState(this.leftRatio, {
      graphHeight: this.graphSection?.clientHeight || this.graphHeight
    });
  }

  /**
   * 实例池复用时的配置更新：浅合并，新配置缺失的键保留旧值。
   * 依赖「单页单场景、同页配置恒定」假设；preservedCanvas 由容器每次
   * 显式传键（含 null）覆盖，不依赖合并。改键语义需同步此假设。
   */
  _updateConfig(config?: SplitRightGraphBottomConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }

  restoreLayoutState(state: Record<string, unknown>): void {
    restoreSplitLayoutState(
      state,
      (r) => {
        this.leftRatio = r;
      },
      (s) => {
        if (typeof s.graphHeight === 'number') {
          this.graphHeight = s.graphHeight;
          if (this.graphSection) {
            this.graphSection.style.height = `${this.graphHeight}px`;
          }
        }
      }
    );
  }
}

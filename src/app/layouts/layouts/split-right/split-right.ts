/**
 * SplitRightLayout — 左右分栏布局（控制区在左，动画区在右）
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
  applySplitTheme,
  getSplitLayoutState,
  restoreSplitLayoutState,
  applyResponsiveColumns
} from '../../_shared/split-helpers';
import { buildSplitLayoutDOM } from '../../_shared/split-layout-base';
import { enterLayout, exitLayout } from '../../_shared/layout-transition';
import { buildBaseCapabilities } from '../../capabilities/base-declarations';
import { layoutReuseKey } from '../../layout-reuse-key';
import { READOUT_OVERLAY_ATTR } from '../../../../platform/stage-readout';

export interface SplitRightConfig extends LayoutConfig {
  defaultLeftRatio?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  hideHeader?: boolean;
  title?: string;
  subtitle?: string;
  hasGraph?: boolean;
  readoutLabel?: string;
  readoutCollapsed?: boolean;
}

const PREFIX: CssPrefix = 'teaching';

export class SplitRightLayout implements ILayout {
  readonly id = 'split-right';
  readonly name = '左右分栏';
  readonly description = '控制区在左，动画区在右';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  readonly capabilities: CapabilityDeclaration[];

  private slots: Partial<LayoutSlots> = {};
  private cfg: SplitRightConfig;
  private leftRatio: number;
  private currentTheme: Theme = 'light';
  private _container: HTMLElement;

  constructor(container: HTMLElement, config: SplitRightConfig = {}) {
    this.cfg = config;
    this.leftRatio = config.defaultLeftRatio ?? 0.38;
    this._container = container;
    this.capabilities = SplitRightLayout.capabilityDecls(config, (r) => {
      this.leftRatio = r;
    });
  }

  private static capabilityDecls(
    config: SplitRightConfig,
    onResize?: (ratio: number) => void
  ): CapabilityDeclaration[] {
    return buildBaseCapabilities(config, {
      transportConfig: { mountSlot: 'animation' as const },
      afterDataWorkspace: [
        {
          id: 'readout-panel',
          config: {
            position: 'top-right',
            collapsed: config.readoutCollapsed ?? true,
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
            targetSelector: '.teaching-left-panel',
            selector: '.teaching-panel-resizer',
            onResize: onResize ?? (() => undefined)
          }
        }
      ]
    });
  }

  async mount(): Promise<LayoutSlots> {
    // Guard against double-mount
    if (Object.keys(this.slots).length > 0) return this.slots as LayoutSlots;

    const { slots } = buildSplitLayoutDOM({
      container: this._container,
      cfg: this.cfg,
      prefix: PREFIX,
      leftRatio: this.leftRatio,
      currentTheme: this.currentTheme,
      containerClass: 'teaching-demo split-right-shell layout-master',
      testId: 'split-right-layout',
      leftPanelClass: 'teaching-left-panel layout-left-panel',
      rightPanelClass: 'teaching-right-panel',
      resizerVClass: 'teaching-panel-resizer',
      hasGraphInLeft: this.cfg.hasGraph !== false,
      existingCanvas: this.cfg.preservedCanvas ?? undefined
    });

    this._container.dataset.hasGraph = String(this.cfg.hasGraph !== false);
    if (this.cfg.graphInitiallyHidden) {
      const section = slots.graph?.closest('.graph-section');
      if (section instanceof HTMLElement) section.hidden = true;
      this._container.dataset.graphInitiallyHidden = 'true';
    }
    this.slots = slots;
    return this.slots as LayoutSlots;
  }

  async unmount(): Promise<void> {
    this._container.classList.remove(
      'teaching-demo',
      'split-right-shell',
      'layout-master'
    );
    delete this._container.dataset.testid;
    delete this._container.dataset.theme;
    delete this._container.dataset.mode;
    delete this._container.dataset.hasGraph;
    delete this._container.dataset.graphInitiallyHidden;
    this._container.removeAttribute(READOUT_OVERLAY_ATTR);
    try {
      this._container.replaceChildren();
    } catch {
      /* container may be detached */
    }
    this.slots = {};
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    applySplitTheme(this._container, theme);
  }

  handleResize(width: number, _height: number): void {
    applyResponsiveColumns(this._container, width, this.cfg, this.leftRatio);
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
    return getSplitLayoutState(this.leftRatio);
  }

  restoreLayoutState(state: Record<string, unknown>): void {
    restoreSplitLayoutState(state, (r) => {
      this.leftRatio = r;
    });
  }

  /**
   * 实例池复用时的配置更新：浅合并，新配置缺失的键保留旧值。
   * 依赖「单页单场景、同页配置恒定」假设；preservedCanvas 由容器每次
   * 显式传键（含 null）覆盖，不依赖合并。改键语义需同步此假设。
   */
  _updateConfig(config?: SplitRightConfig): void {
    if (config) this.cfg = { ...this.cfg, ...config };
  }

  getReuseKey(config?: LayoutConfig): string {
    const cfg = (config ?? this.cfg) as SplitRightConfig;
    return layoutReuseKey(this.id, {
      ...cfg,
      capabilities: SplitRightLayout.capabilityDecls(cfg)
    });
  }
}

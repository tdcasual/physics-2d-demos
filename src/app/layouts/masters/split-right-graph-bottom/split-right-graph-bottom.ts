/**
 * SplitRightGraphBottomLayout - 左右分栏 + 底部图表网格布局
 *
 * 结构：左侧 = control，右侧上方 = animation，右侧下方 = graph grid
 * 继承 DesktopSplitLayout 基类，只保留右侧底部图表的差异逻辑。
 *
 * @review-date 2026-04-18
 * @version 2.0.0-refactored
 */

import './split-right-graph-bottom.css';

import { DesktopSplitLayout, type DesktopSplitConfig } from '../desktop-split/desktop-split';
import type {
  SlotName,
  SlotConfig
} from '../../types';
import type { SceneDemoProfile } from '../../../demo-profile';

/** SplitRightGraphBottom 布局配置 */
export interface SplitRightGraphBottomConfig extends DesktopSplitConfig {
  graphHeight?: number;
  graphMinHeight?: number;
  graphMaxHeight?: number;
  graphColumns?: number;
}

export class SplitRightGraphBottomLayout extends DesktopSplitLayout {
  readonly id = 'split-right-graph-bottom';
  readonly name = '左右分栏+底部图表';
  readonly description = '控制区在左，动画区在右上方，图表网格在右下方（支持多列）';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  protected cssPrefix = 'srgb';
  protected leftRatio = 0.35;

  // 特有 DOM 引用
  private resizerH: HTMLElement | null = null;
  private graphSection: HTMLElement | null = null;
  private _graphSlot: HTMLElement | null = null;

  // 状态
  private graphHeight = 220;
  private isGraphCollapsed = false;

  constructor(container: HTMLElement, config: SplitRightGraphBottomConfig = {}) {
    super(container, config);
    const cfg = this.config as SplitRightGraphBottomConfig;
    this.leftRatio = cfg.defaultLeftRatio ?? 0.35;
    this.graphHeight = cfg.graphHeight ?? 220;
  }

  protected get rootClassNames(): string[] {
    return ['layout-srgb-graph-bottom'];
  }

  protected get rootAttributes(): Record<string, string> {
    return { 'data-graph-collapsed': 'false' };
  }

  // ========================================================================
  // 右侧面板扩展：添加水平分隔条 + 图表区
  // ========================================================================

  protected onBuildRightPanelExtra = (rightPanel: HTMLElement): void => {
    const cfg = this.config as SplitRightGraphBottomConfig;
    const graphMinHeight = cfg.graphMinHeight ?? 120;
    const graphMaxHeight = cfg.graphMaxHeight ?? 480;
    const graphColumns = cfg.graphColumns ?? 3;

    // 水平分隔条
    this.resizerH = document.createElement('div');
    this.resizerH.className = this.getClassName('resizer-h');
    this.resizerH.setAttribute('role', 'separator');
    this.resizerH.setAttribute('aria-orientation', 'horizontal');
    this.resizerH.setAttribute('aria-label', '调整图表区高度');
    this.resizerH.setAttribute('tabindex', '0');
    rightPanel.appendChild(this.resizerH);

    // 图表区
    this.graphSection = document.createElement('section');
    this.graphSection.className = this.getClassName('graph-section');
    this.graphSection.setAttribute('data-collapsed', 'false');
    this.graphSection.style.height = `${this.graphHeight}px`;
    this.graphSection.style.minHeight = `${graphMinHeight}px`;
    this.graphSection.style.maxHeight = `${graphMaxHeight}px`;

    const graphHeader = document.createElement('div');
    graphHeader.className = this.getClassName('section-header');
    const graphH2 = document.createElement('h2');
    graphH2.className = this.getClassName('section-title');
    graphH2.textContent = '数据图表';
    const graphToggle = document.createElement('button');
    graphToggle.type = 'button';
    graphToggle.className = this.getClassName('section-toggle');
    graphToggle.dataset.target = 'graph';
    graphToggle.setAttribute('aria-label', '折叠图表区');
    graphToggle.textContent = '−';
    graphHeader.append(graphH2, graphToggle);
    this.graphSection.appendChild(graphHeader);

    this._graphSlot = document.createElement('div');
    this._graphSlot.className = this.getClassName('graph-grid');
    this._graphSlot.setAttribute('data-columns', String(graphColumns));
    this.graphSection.appendChild(this._graphSlot);
    rightPanel.appendChild(this.graphSection);
  };

  // ========================================================================
  // 事件绑定扩展：水平分隔条拖拽
  // ========================================================================

  protected bindCommonEvents(): void {
    super.bindCommonEvents();

    if (this.resizerH) {
      const onMouseDown = (e: MouseEvent) => {
        if (this.isCompactViewport) return;
        this.onResizerHMouseDown(e);
      };
      this.resizerH.addEventListener('mousedown', onMouseDown);
      this.eventCleanups.push(() =>
        this.resizerH?.removeEventListener('mousedown', onMouseDown)
      );
    }
  }

  private onResizerHMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.resizerH?.classList.add('is-dragging');

    const startY = e.clientY;
    const startHeight = this.graphSection?.clientHeight || this.graphHeight;
    const cfg = this.config as SplitRightGraphBottomConfig;
    const minHeight = cfg.graphMinHeight ?? 120;
    const maxHeight = cfg.graphMaxHeight ?? 480;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
      if (this.graphSection) {
        this.graphSection.style.height = `${newHeight}px`;
        this.graphHeight = newHeight;
      }
    };

    const handleMouseUp = () => {
      this.resizerH?.classList.remove('is-dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  // ========================================================================
  // 尺寸响应扩展
  // ========================================================================

  protected onHandleResizeExtra = (width: number): void => {
    const mobileBreakpoint = this.config.mobileBreakpoint || 768;

    if (width < mobileBreakpoint) {
      if (this.resizerH) this.resizerH.style.display = 'none';
      if (this.graphSection) this.graphSection.style.maxHeight = '35vh';
    } else {
      if (this.resizerH) this.resizerH.style.display = 'block';
      if (this.graphSection) this.graphSection.style.maxHeight = '';
    }
  };

  // ========================================================================
  // 图表区折叠扩展
  // ========================================================================

  protected onGraphSectionToggled = (collapsed: boolean): void => {
    this.isGraphCollapsed = collapsed;
    this.container.setAttribute('data-graph-collapsed', String(collapsed));
  };

  // ========================================================================
  // 抽象方法实现
  // ========================================================================

  getGraphSection(): HTMLElement | null {
    return this.graphSection;
  }

  getExtraSlotConfig(): Partial<Record<SlotName, SlotConfig>> {
    return {
      graph: { visible: true, collapsed: this.isGraphCollapsed }
    };
  }

  protected resolveGraphSlot(): HTMLElement | undefined {
    return this._graphSlot || undefined;
  }

  // ========================================================================
  // 公共 API（保持向后兼容）
  // ========================================================================

  getGraphHeight(): number {
    return this.graphHeight;
  }

  setGraphHeight(height: number): void {
    const cfg = this.config as SplitRightGraphBottomConfig;
    const minHeight = cfg.graphMinHeight ?? 120;
    const maxHeight = cfg.graphMaxHeight ?? 480;
    this.graphHeight = Math.max(minHeight, Math.min(maxHeight, height));
    if (this.graphSection) {
      this.graphSection.style.height = `${this.graphHeight}px`;
    }
  }

  getGraphSlot(): HTMLElement | null {
    return this._graphSlot;
  }

  // ========================================================================
  // 演示配置
  // ========================================================================

  applyDemoProfile(profile: SceneDemoProfile): void {
    super.applyDemoProfile(profile);
    if (profile.graphPanel === 'hidden') {
      if (this.graphSection) {
        this.graphSection.style.display = 'none';
      }
    }
  }

  resetDemoProfile(): void {
    super.resetDemoProfile();
    if (this.graphSection) {
      this.graphSection.style.display = '';
    }
  }

  // ========================================================================
  // 卸载扩展
  // ========================================================================

  protected onBeforeUnmount = (): void => {
    this.resizerH = null;
    this.graphSection = null;
    this._graphSlot = null;
  };
}

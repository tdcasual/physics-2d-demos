/**
 * SplitRightLayout - 左右分栏布局
 *
 * 结构：左侧 = header + control + graph，右侧 = animation + readout
 * 继承 DesktopSplitLayout 基类，只保留右侧结构和左侧 graph 的差异逻辑。
 *
 * @review-date 2026-04-18
 * @version 2.0.0-refactored
 */

import { DesktopSplitLayout, type DesktopSplitConfig } from '../desktop-split/desktop-split';
import type {
  SlotName,
  SlotConfig
} from '../../types';
import type { SceneDemoProfile } from '../../../demo-profile';
import '../../../../styles/teaching-shell.css';

/** SplitRight 布局配置 */
export interface SplitRightConfig extends DesktopSplitConfig {
  hasGraph?: boolean;
  graphHeight?: number;
  controlColumns?: 'auto' | 1 | 2 | 3;
}

export class SplitRightLayout extends DesktopSplitLayout<SplitRightConfig> {
  readonly id = 'split-right';
  readonly name = '左右分栏';
  readonly description = '控制区在左，动画区在右，数据读数面板可拖拽可调节';
  readonly supportedSlots: SlotName[] = [
    'header',
    'control',
    'animation',
    'graph',
    'readout'
  ];

  protected cssPrefix = 'teaching';
  protected leftRatio = 0.38;

  // 特有 DOM 引用
  private graphSection: HTMLElement | null = null;
  private _graphSlot: HTMLElement | null = null;

  constructor(container: HTMLElement, config: SplitRightConfig = {}) {
    super(container, config);
    const cfg = this.config;
    this.leftRatio = cfg.defaultLeftRatio ?? 0.38;
  }

  // ========================================================================
  // 类名映射（split-right 大量类名无前缀，需特殊处理）
  // ========================================================================

  protected getClassName(base: string): string {
    if (base === 'resizer-v') return 'teaching-panel-resizer';
    if (base === 'theme-toggle') return 'teaching-shell-theme-toggle';
    return `teaching-${base}`;
  }

  protected get rootClassNames(): string[] {
    return ['teaching-demo', 'v2-layout'];
  }

  protected get rootAttributes(): Record<string, string> {
    const cfg = this.config;
    return {
      'data-has-graph': String(cfg.hasGraph !== false),
      'data-control-columns': String(cfg.controlColumns ?? 'auto')
    };
  }

  // ========================================================================
  // 左侧面板扩展：添加图表区
  // ========================================================================

  protected onBuildLeftPanelExtra = (leftPanel: HTMLElement): void => {
    const cfg = this.config;
    const hasGraph = cfg.hasGraph !== false;
    if (!hasGraph) return;

    this.graphSection = document.createElement('section');
    this.graphSection.className = 'teaching-graph-section';
    this.graphSection.setAttribute('data-collapsed', 'false');
    const graphHeader = document.createElement('div');
    graphHeader.className = 'teaching-section-header';
    const graphH2 = document.createElement('h2');
    graphH2.className = 'teaching-section-title';
    graphH2.textContent = '图表';
    const graphToggle = document.createElement('button');
    graphToggle.type = 'button';
    graphToggle.className = 'teaching-section-toggle';
    graphToggle.dataset.target = 'graph';
    graphToggle.setAttribute('aria-label', '折叠图表区');
    graphToggle.textContent = '−';
    graphHeader.append(graphH2, graphToggle);
    this.graphSection.appendChild(graphHeader);
    this._graphSlot = document.createElement('div');
    this._graphSlot.className = 'teaching-graph-slot';
    this.graphSection.appendChild(this._graphSlot);
    leftPanel.appendChild(this.graphSection);
  };

  // ========================================================================
  // 抽象方法实现
  // ========================================================================

  getGraphSection(): HTMLElement | null {
    return this.graphSection;
  }

  getExtraSlotConfig(): Partial<Record<SlotName, SlotConfig>> {
    const cfg = this.config;
    return {
      graph: { visible: cfg.hasGraph ?? true }
    };
  }

  protected resolveGraphSlot(): HTMLElement | undefined {
    return this._graphSlot || undefined;
  }

  // ========================================================================
  // 公共 API（保持向后兼容）
  // ========================================================================

  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    const base = super.getSlotConfig(slot);
    if (slot === 'graph') {
      const cfg = this.config;
      return { visible: cfg.hasGraph ?? true };
    }
    return base;
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
  // 图表区折叠
  // ========================================================================

  protected expandGraphSection(): void {
    if (!this.graphSection) return;
    this.graphSection.setAttribute('data-collapsed', 'false');
    const toggle = this.graphSection.querySelector('.teaching-section-toggle');
    if (toggle) {
      toggle.textContent = '−';
    }
  }

  protected collapseGraphSection(): void {
    if (!this.graphSection) return;
    this.graphSection.setAttribute('data-collapsed', 'true');
    const toggle = this.graphSection.querySelector('.teaching-section-toggle');
    if (toggle) {
      toggle.textContent = '+';
    }
  }
}

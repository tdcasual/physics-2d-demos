/**
 * MobileStackLayout - 移动端堆叠布局
 * 
 * 设计原则：
 * 1. 动画区占主导（60-70%屏幕高度）
 * 2. 控制面板从底部滑出（类似原生App底部Sheet）
 * 3. 图表区默认折叠，避免小屏幕拥挤
 * 4. 数据读数以浮动卡片形式呈现
 * 5. 所有交互针对触摸优化（大点击区域、滑动手势）
 */

import { BaseLayout } from '../base-layout';
import type { LayoutSlots, LayoutConfig, Theme, SlotName, SlotConfig, TransportState, ReadoutItem } from '../../types';
import { createFloatingControls } from '../../../../ui/control-layout';

export interface MobileStackConfig extends LayoutConfig {
  /** 控制面板默认展开高度比例 */
  defaultControlRatio?: number;
  /** 是否默认展开图表 */
  graphExpanded?: boolean;
  /** 读数卡片位置 */
  readoutPosition?: 'top-right' | 'bottom-left';
}

export class MobileStackLayout extends BaseLayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的垂直堆叠布局，控制面板从底部滑出';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation', 'graph', 'readout'];
  
  // DOM 元素
  private mainContainer: HTMLElement | null = null;
  private animationSection: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private controlSheet: HTMLElement | null = null;
  private controlHandle: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private graphSection: HTMLElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private readoutCard: HTMLElement | null = null;
  private readoutSlot: HTMLElement | null = null;
  private floatingControls: HTMLElement | null = null;
  
  // 状态
  private controlExpanded = false;
  private graphExpanded = false;
  private controlRatio = 0.4;
  private isDraggingSheet = false;
  private dragStartY = 0;
  private dragStartRatio = 0.4;
  
  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    super(container, config);
    const cfg = this.config as MobileStackConfig;
    this.controlRatio = cfg.defaultControlRatio ?? 0.4;
    this.graphExpanded = cfg.graphExpanded ?? false;
  }
  
  render(container: HTMLElement): LayoutSlots {
    const cfg = this.config as MobileStackConfig;
    
    container.classList.add('mobile-stack-layout');
    container.setAttribute('data-theme', this.currentTheme);
    
    // 主容器 - 垂直弹性布局
    this.mainContainer = document.createElement('div');
    this.mainContainer.className = 'mobile-main-container';
    this.mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      background: var(--color-bg-primary);
    `;
    
    // 动画区（主导）
    this.animationSection = document.createElement('div');
    this.animationSection.className = 'mobile-animation-section';
    this.animationSection.style.cssText = `
      flex: 1;
      position: relative;
      min-height: 0;
      background: var(--color-bg-primary);
    `;
    
    this.stageSlot = document.createElement('div');
    this.stageSlot.className = 'mobile-stage-slot';
    this.stageSlot.style.cssText = `
      position: absolute;
      inset: 0;
    `;
    
    this.stageCanvas = document.createElement('canvas');
    this.stageCanvas.className = 'mobile-stage-canvas';
    this.stageCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    this.stageSlot.appendChild(this.stageCanvas);
    this.animationSection.appendChild(this.stageSlot);
    this.mainContainer.appendChild(this.animationSection);
    
    // 控制面板（底部滑出式）
    this.controlSheet = document.createElement('div');
    this.controlSheet.className = `mobile-control-sheet ${this.controlExpanded ? 'expanded' : ''}`;
    this.controlSheet.style.cssText = `
      position: relative;
      background: var(--color-bg-secondary);
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      height: ${this.controlExpanded ? `${this.controlRatio * 100}%` : '48px'};
      min-height: 48px;
      max-height: 70%;
      z-index: 100;
    `;
    
    // 拖拽手柄
    this.controlHandle = document.createElement('div');
    this.controlHandle.className = 'mobile-control-handle';
    this.controlHandle.style.cssText = `
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
    `;
    this.controlHandle.innerHTML = `
      <div style="
        width: 36px;
        height: 4px;
        background: var(--color-text-muted);
        border-radius: 2px;
      "></div>
    `;
    this.controlSheet.appendChild(this.controlHandle);
    
    // 控制内容区
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'mobile-control-slot';
    this.controlSlot.style.cssText = `
      padding: 0 16px 16px;
      overflow-y: auto;
      height: calc(100% - 48px);
    `;
    this.controlSheet.appendChild(this.controlSlot);
    
    this.mainContainer.appendChild(this.controlSheet);
    
    // 数据读数卡片（浮动）
    this.readoutCard = document.createElement('div');
    this.readoutCard.className = 'mobile-readout-card';
    const readoutPos = cfg.readoutPosition ?? 'top-right';
    this.readoutCard.style.cssText = `
      position: absolute;
      ${readoutPos.includes('top') ? 'top: 12px' : 'bottom: 60px'};
      ${readoutPos.includes('right') ? 'right: 12px' : 'left: 12px'};
      min-width: 140px;
      max-width: 200px;
      background: var(--color-bg-secondary);
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      z-index: 50;
      font-size: 13px;
    `;
    
    this.readoutSlot = document.createElement('ul');
    this.readoutSlot.className = 'mobile-readout-slot';
    this.readoutSlot.style.cssText = `
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;
    this.readoutCard.appendChild(this.readoutSlot);
    this.animationSection.appendChild(this.readoutCard);
    
    // 图表区（可选，默认折叠）
    if (this.graphExpanded) {
      this.graphSection = document.createElement('div');
      this.graphSection.className = 'mobile-graph-section';
      this.graphSection.style.cssText = `
        height: 200px;
        background: var(--color-bg-secondary);
        border-top: 1px solid var(--color-border-color);
      `;
      
      this.graphSlot = document.createElement('div');
      this.graphSlot.className = 'mobile-graph-slot';
      this.graphSlot.style.cssText = `
        height: 100%;
        padding: 8px;
      `;
      this.graphSection.appendChild(this.graphSlot);
      this.controlSheet.insertBefore(this.graphSection, this.controlSlot);
    }
    
    container.appendChild(this.mainContainer);
    
    // 绑定事件
    this.bindSheetDrag();
    this.bindToggleGraph();
    
    return {
      header: undefined,
      control: this.controlSlot,
      animation: this.stageSlot,
      graph: this.graphSlot || undefined,
      readout: this.readoutSlot
    };
  }
  
  private bindSheetDrag(): void {
    if (!this.controlHandle || !this.controlSheet) return;
    
    const startDrag = (y: number) => {
      this.isDraggingSheet = true;
      this.dragStartY = y;
      this.dragStartRatio = this.controlRatio;
      this.controlSheet!.style.transition = 'none';
    };
    
    const moveDrag = (y: number) => {
      if (!this.isDraggingSheet || !this.mainContainer) return;
      const deltaY = this.dragStartY - y;
      const containerHeight = this.mainContainer.clientHeight;
      const newRatio = Math.max(0.15, Math.min(0.7, 
        this.dragStartRatio + (deltaY / containerHeight)
      ));
      this.controlRatio = newRatio;
      this.controlSheet!.style.height = `${newRatio * 100}%`;
    };
    
    const endDrag = () => {
      if (!this.isDraggingSheet) return;
      this.isDraggingSheet = false;
      this.controlSheet!.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      // 吸附到最近状态
      this.controlExpanded = this.controlRatio > 0.25;
      this.controlRatio = this.controlExpanded ? Math.max(this.controlRatio, 0.4) : 0.12;
      this.controlSheet!.style.height = this.controlExpanded ? `${this.controlRatio * 100}%` : '48px';
      this.controlSheet!.classList.toggle('expanded', this.controlExpanded);
    };
    
    // 触摸事件
    this.controlHandle.addEventListener('touchstart', (e) => {
      startDrag(e.touches[0].clientY);
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      moveDrag(e.touches[0].clientY);
    }, { passive: true });
    
    document.addEventListener('touchend', endDrag);
    
    // 鼠标事件
    this.controlHandle.addEventListener('mousedown', (e) => {
      startDrag(e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
      moveDrag(e.clientY);
    });
    
    document.addEventListener('mouseup', endDrag);
    
    // 点击展开/收起
    this.controlHandle.addEventListener('click', () => {
      if (this.isDraggingSheet) return;
      this.controlExpanded = !this.controlExpanded;
      this.controlRatio = this.controlExpanded ? 0.4 : 0.12;
      this.controlSheet!.style.height = this.controlExpanded ? `${this.controlRatio * 100}%` : '48px';
      this.controlSheet!.classList.toggle('expanded', this.controlExpanded);
    });
  }
  
  private bindToggleGraph(): void {
    // 可以添加一个按钮来展开/收起图表区
  }
  
  setFloatingControls(callbacks: {
    onTogglePlay?: () => void;
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  }): void {
    if (this.floatingControls) {
      (this.floatingControls as any).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }
    
    const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
    
    this.floatingControls = createFloatingControls({
      isPlaying: callbacks.isPlaying,
      onTogglePlay: togglePlay,
      onReset: callbacks.onReset,
      onSpeedChange: callbacks.onSpeedChange,
      getSpeed: callbacks.getSpeed
    });
    
    // 移动端调整位置到底部居中
    this.floatingControls.style.cssText += `
      left: 50%;
      transform: translateX(-50%);
      top: auto;
      bottom: 12px;
    `;
    
    if (this.animationSection) {
      this.animationSection.appendChild(this.floatingControls);
    }
  }
  
  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }
  
  updateTransportState(state: TransportState): void {
    if (this.floatingControls && (this.floatingControls as any).setState) {
      (this.floatingControls as any).setState(state);
    }
  }
  
  setReadout(items: Array<{ label: string; value: string | number; layout?: 'half' | 'full' }>): void {
    if (!this.readoutSlot) return;
    
    this.readoutSlot.innerHTML = items.map(item => `
      <li class="mobile-readout-item" style="
        display: flex;
        flex-direction: column;
        gap: 2px;
      ">
        <span style="
          font-size: 11px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        ">${item.label}</span>
        <strong style="
          font-size: 13px;
          color: var(--color-text-primary);
          font-weight: 600;
        ">${item.value}</strong>
      </li>
    `).join('');
  }
  
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
  
  handleResize(width: number, height: number): void {
    // 移动端布局自适应
    if (height < 600) {
      // 小屏手机：进一步压缩控制面板
      if (!this.controlExpanded) {
        this.controlSheet!.style.height = '44px';
      }
    }
  }
  
  async unmount(): Promise<void> {
    if (this.floatingControls) {
      (this.floatingControls as any).dispose?.();
      this.floatingControls.remove();
      this.floatingControls = null;
    }
    await super.unmount();
  }
}

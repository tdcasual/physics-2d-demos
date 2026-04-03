/**
 * MobileStackLayout - 移动端垂直堆叠布局
 * 
 * 布局顺序（从上到下）：
 * 1. 浮动控制条（播放/暂停/重置/速度）- 固定在顶部或作为第一块
 * 2. 动画区（弹簧振子演示）- 占主要空间
 * 3. 图表区（x-t图像）- 可折叠
 * 4. 控制区（振子列表、预设场景）- 可滚动
 * 
 * 所有区域在一个可滚动容器内，自然流式布局
 */

import { BaseLayout } from '../base-layout';
import type { LayoutSlots, LayoutConfig, Theme, SlotName, SlotConfig, TransportState, ReadoutItem } from '../../types';

export interface MobileStackConfig extends LayoutConfig {
  /** 动画区高度比例 */
  animationRatio?: number;
  /** 图表区默认展开 */
  graphExpanded?: boolean;
  /** 控制条固定顶部 */
  stickyControls?: boolean;
}

export class MobileStackLayout extends BaseLayout {
  readonly id = 'mobile-stack';
  readonly name = '移动端堆叠';
  readonly description = '适合手机的垂直堆叠布局';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation', 'graph', 'readout'];
  
  // DOM 元素
  private scrollContainer: HTMLElement | null = null;
  private controlsBar: HTMLElement | null = null;
  private animationSection: HTMLElement | null = null;
  private stageSlot: HTMLElement | null = null;
  private stageCanvas: HTMLCanvasElement | null = null;
  private graphSection: HTMLElement | null = null;
  private graphSlot: HTMLElement | null = null;
  private graphToggle: HTMLElement | null = null;
  private controlSection: HTMLElement | null = null;
  private controlSlot: HTMLElement | null = null;
  private readoutBar: HTMLElement | null = null;
  
  // 状态
  private graphExpanded = false;
  private animationHeight = 300;
  
  constructor(container: HTMLElement, config: MobileStackConfig = {}) {
    super(container, config);
    const cfg = this.config as MobileStackConfig;
    this.graphExpanded = cfg.graphExpanded ?? false;
  }
  
  render(container: HTMLElement): LayoutSlots {
    container.classList.add('mobile-stack-layout');
    container.setAttribute('data-theme', this.currentTheme);
    container.style.cssText = `
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      background: var(--color-bg-primary);
    `;
    
    // 主滚动容器
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'mobile-scroll-container';
    this.scrollContainer.style.cssText = `
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    `;
    
    // 1. 运输控制条（固定在顶部或作为第一块）
    this.controlsBar = document.createElement('div');
    this.controlsBar.className = 'mobile-controls-bar';
    this.controlsBar.style.cssText = `
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-color);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    `;
    // 控制条内容由 setFloatingControls 填充
    this.scrollContainer.appendChild(this.controlsBar);
    
    // 2. 动画区（占主要空间）
    this.animationSection = document.createElement('div');
    this.animationSection.className = 'mobile-animation-section';
    this.animationSection.style.cssText = `
      position: relative;
      height: 50vh;
      min-height: 300px;
      background: var(--color-bg-primary);
      border-bottom: 1px solid var(--color-border-color);
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
    this.scrollContainer.appendChild(this.animationSection);
    
    // 3. 图表区（可折叠）
    this.graphSection = document.createElement('div');
    this.graphSection.className = 'mobile-graph-section';
    this.graphSection.style.cssText = `
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-color);
    `;
    
    // 图表标题栏（可点击折叠）
    this.graphToggle = document.createElement('div');
    this.graphToggle.className = 'mobile-section-toggle';
    this.graphToggle.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--color-bg-secondary);
      cursor: pointer;
      user-select: none;
    `;
    this.graphToggle.innerHTML = `
      <span style="font-weight: 600; font-size: 14px;">📈 x-t 图像</span>
      <span class="toggle-icon" style="transition: transform 0.2s;">${this.graphExpanded ? '▼' : '▶'}</span>
    `;
    this.graphToggle.addEventListener('click', () => this.toggleGraph());
    this.graphSection.appendChild(this.graphToggle);
    
    // 图表内容
    this.graphSlot = document.createElement('div');
    this.graphSlot.className = 'mobile-graph-slot';
    this.graphSlot.style.cssText = `
      height: ${this.graphExpanded ? '200px' : '0'};
      overflow: hidden;
      transition: height 0.3s ease;
    `;
    this.graphSection.appendChild(this.graphSlot);
    this.scrollContainer.appendChild(this.graphSection);
    
    // 4. 控制区（振子列表、预设场景）
    this.controlSection = document.createElement('div');
    this.controlSection.className = 'mobile-control-section';
    this.controlSection.style.cssText = `
      background: var(--color-bg-secondary);
      min-height: 200px;
    `;
    
    // 控制区标题
    const controlHeader = document.createElement('div');
    controlHeader.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border-color);
      font-weight: 600;
      font-size: 14px;
    `;
    controlHeader.textContent = '⚙️ 控制区';
    this.controlSection.appendChild(controlHeader);
    
    // 控制内容区
    this.controlSlot = document.createElement('div');
    this.controlSlot.className = 'mobile-control-slot';
    this.controlSlot.style.cssText = `
      padding: 16px;
    `;
    this.controlSection.appendChild(this.controlSlot);
    this.scrollContainer.appendChild(this.controlSection);
    
    // 数据读数浮动条（固定在底部或融入控制区）
    this.readoutBar = document.createElement('div');
    this.readoutBar.className = 'mobile-readout-bar';
    this.readoutBar.style.cssText = `
      padding: 12px 16px;
      background: var(--color-bg-primary);
      border-top: 1px solid var(--color-border-color);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      font-size: 12px;
    `;
    this.controlSection.appendChild(this.readoutBar);
    
    container.appendChild(this.scrollContainer);
    
    return {
      header: undefined,
      control: this.controlSlot,
      animation: this.stageSlot,
      graph: this.graphSlot,
      readout: this.readoutBar
    };
  }
  
  private toggleGraph(): void {
    this.graphExpanded = !this.graphExpanded;
    if (this.graphSlot) {
      this.graphSlot.style.height = this.graphExpanded ? '200px' : '0';
    }
    if (this.graphToggle) {
      const icon = this.graphToggle.querySelector('.toggle-icon');
      if (icon) icon.textContent = this.graphExpanded ? '▼' : '▶';
    }
  }
  
  setFloatingControls(callbacks: {
    onTogglePlay?: () => void;
    onPlayPause?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
    isPlaying?: () => boolean;
  }): void {
    if (!this.controlsBar) return;
    
    // 清空现有内容
    this.controlsBar.innerHTML = '';
    
    const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
    const isPlaying = callbacks.isPlaying?.() ?? false;
    const speed = callbacks.getSpeed?.() ?? 1;
    
    // 播放/暂停按钮
    const playBtn = document.createElement('button');
    playBtn.className = 'mobile-control-btn';
    playBtn.innerHTML = isPlaying ? '⏸' : '▶';
    playBtn.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: var(--color-accent-primary, #3b82f6);
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    playBtn.addEventListener('click', () => {
      togglePlay?.();
      playBtn.innerHTML = callbacks.isPlaying?.() ? '⏸' : '▶';
    });
    this.controlsBar.appendChild(playBtn);
    
    // 重置按钮
    const resetBtn = document.createElement('button');
    resetBtn.className = 'mobile-control-btn';
    resetBtn.innerHTML = '↺';
    resetBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--color-border-color);
      background: var(--color-btn-bg);
      color: var(--color-text-primary);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    resetBtn.addEventListener('click', () => callbacks.onReset?.());
    this.controlsBar.appendChild(resetBtn);
    
    // 速度控制
    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const speedLabel = document.createElement('span');
    speedLabel.textContent = '速度';
    speedLabel.style.cssText = `
      font-size: 13px;
      color: var(--color-text-secondary);
    `;
    speedContainer.appendChild(speedLabel);
    
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.05';
    speedSlider.max = '3';
    speedSlider.step = '0.05';
    speedSlider.value = String(speed);
    speedSlider.style.cssText = `
      width: 100px;
      height: 6px;
    `;
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      callbacks.onSpeedChange?.(val);
      speedValue.textContent = `${val.toFixed(2)}×`;
    });
    speedContainer.appendChild(speedSlider);
    
    const speedValue = document.createElement('span');
    speedValue.textContent = `${speed.toFixed(2)}×`;
    speedValue.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      min-width: 50px;
    `;
    speedContainer.appendChild(speedValue);
    
    this.controlsBar.appendChild(speedContainer);
  }
  
  updateTransportState(state: { isPlaying?: boolean; speed?: number }): void {
    // 更新控制条状态
    if (!this.controlsBar) return;
    const playBtn = this.controlsBar.querySelector('.mobile-control-btn') as HTMLButtonElement;
    if (playBtn && state.isPlaying !== undefined) {
      playBtn.innerHTML = state.isPlaying ? '⏸' : '▶';
    }
  }
  
  updateReadout(items: ReadoutItem[]): void {
    this.setReadout(items);
  }
  
  setReadout(items: Array<{ label: string; value: string | number; layout?: 'half' | 'full' }>): void {
    if (!this.readoutBar) return;
    
    this.readoutBar.innerHTML = items.slice(0, 6).map(item => `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4px;
      ">
        <span style="
          font-size: 10px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        ">${item.label}</span>
        <span style="
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        ">${item.value}</span>
      </div>
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
    // 调整动画区高度
    if (this.animationSection) {
      const newHeight = Math.max(250, Math.min(400, height * 0.45));
      this.animationSection.style.height = `${newHeight}px`;
    }
  }
  
  async unmount(): Promise<void> {
    await super.unmount();
  }
}

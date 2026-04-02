/**
 * EMF Analogy Controls - V3
 */

import {
  createCollapsibleCard,
  createButtonGrid,
  createTransportControls,
  createParamSlider
} from '../../ui/control-layout';

export interface EmfAnalogyControlsOptions {
  mount: HTMLElement;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStep?: () => void;
  onSetSystemOn?: (on: boolean) => void;
  onSetTapOpening?: (opening: number) => void;
  onSpeedChange?: (speed: number) => void;
  onSwitchView?: (view: 'circuit' | 'water') => void;
  onStatus?: (text: string) => void;
}

export function createEmfAnalogyControlsV3(options: EmfAnalogyControlsOptions) {
  const { mount, onPlay, onPause, onReset, onStep, onSetSystemOn, onSetTapOpening, onSpeedChange, onSwitchView, onStatus } = options;

  mount.innerHTML = '';

  // 系统开关卡片
  const switchCard = createCollapsibleCard('🔌 系统开关', { defaultCollapsed: false });
  const switchBtns = createButtonGrid([
    { label: '闭合开关', value: 'on', variant: 'primary', onClick: () => {
      onSetSystemOn?.(true);
      onStatus?.('开关闭合');
    }},
    { label: '断开开关', value: 'off', onClick: () => {
      onSetSystemOn?.(false);
      onStatus?.('开关断开');
    }}
  ], { columns: 2 });
  switchCard.body.appendChild(switchBtns.element);

  // 水龙头开度卡片
  const tapCard = createCollapsibleCard('🚰 水龙头开度', { defaultCollapsed: false });
  const tapSlider = createParamSlider('开度', {
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.5,
    onChange: (val) => {
      onSetTapOpening?.(val);
      onStatus?.(`水龙头开度: ${(val * 100).toFixed(0)}%`);
    }
  });
  tapCard.body.appendChild(tapSlider.element);

  // 播放控制卡片（如果有播放回调）
  if (onPlay && onPause) {
    const transportCard = createCollapsibleCard('▶️ 播放控制', { defaultCollapsed: false });
    const transport = createTransportControls({ onPlay, onPause, onReset: onReset || (() => {}), onStep: onStep || (() => {}) });
    transportCard.body.appendChild(transport.element);
    mount.appendChild(transportCard.element);
  }

  // 视图切换卡片
  if (onSwitchView) {
    const viewCard = createCollapsibleCard('🔀 视图切换', { defaultCollapsed: true });
    const viewBtns = createButtonGrid([
      { label: '电路视图', value: 'circuit', variant: 'primary', onClick: () => {
        onSwitchView?.('circuit');
        onStatus?.('切换到电路视图');
      }},
      { label: '水类比', value: 'water', variant: 'secondary', onClick: () => {
        onSwitchView?.('water');
        onStatus?.('切换到水类比视图');
      }}
    ], { columns: 2 });
    viewCard.body.appendChild(viewBtns.element);
    mount.appendChild(viewCard.element);
  }

  // 速度控制卡片
  if (onSpeedChange) {
    const speedCard = createCollapsibleCard('⏱️ 动画速度', { defaultCollapsed: true });
    const speedSlider = createParamSlider('播放速度', {
      min: 0.1,
      max: 3,
      step: 0.1,
      value: 1,
      unit: 'x',
      onChange: (val) => onSpeedChange?.(val)
    });
    speedCard.body.appendChild(speedSlider.element);
    mount.appendChild(speedCard.element);
  }

  mount.appendChild(switchCard.element);
  mount.appendChild(tapCard.element);

  // 重置卡片
  if (onReset) {
    const resetCard = createCollapsibleCard('🔄 重置', { defaultCollapsed: true });
    const resetBtn = document.createElement('button');
    resetBtn.className = 'ctrl-btn';
    resetBtn.textContent = '重置系统';
    resetBtn.addEventListener('click', () => {
      onReset?.();
      onStatus?.('系统已重置');
    });
    resetCard.body.appendChild(resetBtn);
    mount.appendChild(resetCard.element);
  }

  return { dispose: () => { mount.innerHTML = ''; } };
}

/**
 * EMF Analogy Controls - V4 (Tailwind 重构版)
 */

import { createControlCard } from '../../ui/components/ControlCard';

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

export function createEmfAnalogyControlsV4(options: EmfAnalogyControlsOptions) {
  const { mount, onPlay, onPause, onReset, onStep, onSetSystemOn, onSetTapOpening, onSpeedChange, onSwitchView, onStatus } = options;

  mount.innerHTML = '';

  // 系统开关卡片
  const switchCard = createControlCard('系统开关', { defaultCollapsed: false });
  const switchBtns = document.createElement('div');
  switchBtns.className = 'grid grid-cols-2 gap-2';
  
  const onBtn = document.createElement('button');
  onBtn.type = 'button';
  onBtn.textContent = '闭合开关';
  onBtn.className = [
    'px-3 py-2',
    'bg-coral text-white text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:brightness-110 transition-all'
  ].join(' ');
  onBtn.addEventListener('click', () => {
    onSetSystemOn?.(true);
    onStatus?.('开关闭合');
  });
  
  const offBtn = document.createElement('button');
  offBtn.type = 'button';
  offBtn.textContent = '断开开关';
  offBtn.className = [
    'px-3 py-2',
    'bg-slate-200 dark:bg-slate-700',
    'text-slate-900 dark:text-slate-100 text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
  ].join(' ');
  offBtn.addEventListener('click', () => {
    onSetSystemOn?.(false);
    onStatus?.('开关断开');
  });
  
  switchBtns.append(onBtn, offBtn);
  switchCard.body.appendChild(switchBtns);

  // 水龙头开度卡片
  const tapCard = createControlCard('水龙头开度', { defaultCollapsed: false });
  const tapSlider = createSliderRow('开度', 0, 1, 0.05, 0.5, '', (val) => {
    onSetTapOpening?.(val);
    onStatus?.(`水龙头开度: ${(val * 100).toFixed(0)}%`);
  });
  tapCard.body.appendChild(tapSlider);

  // 播放控制卡片
  if (onPlay && onPause) {
    const transportCard = createControlCard('播放控制', { defaultCollapsed: false });
    const transport = document.createElement('div');
    transport.className = 'grid grid-cols-4 gap-2';
    
    const buttons = [
      { icon: '▶', label: '播放', action: onPlay },
      { icon: '⏸', label: '暂停', action: onPause },
      { icon: '⏹', label: '重置', action: onReset || (() => {}) },
      { icon: '⏵', label: '单步', action: onStep || (() => {}) }
    ];
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'flex flex-col items-center gap-1',
        'px-2 py-2',
        'bg-slate-100 dark:bg-slate-700/50',
        'border border-slate-200 dark:border-slate-600',
        'rounded-lg cursor-pointer',
        'hover:bg-slate-200 dark:hover:bg-slate-600 transition-all'
      ].join(' ');
      button.innerHTML = `
        <span class="text-sm">${btn.icon}</span>
        <span class="text-[10px] text-slate-600 dark:text-slate-400">${btn.label}</span>
      `;
      button.addEventListener('click', btn.action);
      transport.appendChild(button);
    });
    
    transportCard.body.appendChild(transport);
    mount.appendChild(transportCard.element);
  }

  // 视图切换卡片
  if (onSwitchView) {
    const viewCard = createControlCard('视图切换', { defaultCollapsed: true });
    const viewBtns = document.createElement('div');
    viewBtns.className = 'grid grid-cols-2 gap-2';
    
    const circuitBtn = document.createElement('button');
    circuitBtn.type = 'button';
    circuitBtn.textContent = '电路视图';
    circuitBtn.className = [
      'px-3 py-2',
      'bg-coral text-white text-sm font-medium',
      'rounded-lg cursor-pointer',
      'hover:brightness-110 transition-all'
    ].join(' ');
    circuitBtn.addEventListener('click', () => {
      onSwitchView?.('circuit');
      onStatus?.('切换到电路视图');
    });
    
    const waterBtn = document.createElement('button');
    waterBtn.type = 'button';
    waterBtn.textContent = '水类比';
    waterBtn.className = [
      'px-3 py-2',
      'bg-slate-200 dark:bg-slate-700',
      'text-slate-900 dark:text-slate-100 text-sm font-medium',
      'rounded-lg cursor-pointer',
      'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
    ].join(' ');
    waterBtn.addEventListener('click', () => {
      onSwitchView?.('water');
      onStatus?.('切换到水类比视图');
    });
    
    viewBtns.append(circuitBtn, waterBtn);
    viewCard.body.appendChild(viewBtns);
    mount.appendChild(viewCard.element);
  }

  // 速度控制卡片
  if (onSpeedChange) {
    const speedCard = createControlCard('动画速度', { defaultCollapsed: true });
    const speedSlider = createSliderRow('播放速度', 0.1, 3, 0.1, 1, 'x', (val) => {
      onSpeedChange?.(val);
    });
    speedCard.body.appendChild(speedSlider);
    mount.appendChild(speedCard.element);
  }

  mount.appendChild(switchCard.element);
  mount.appendChild(tapCard.element);

  // 重置卡片
  if (onReset) {
    const resetCard = createControlCard('重置', { defaultCollapsed: true });
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = '重置系统';
    resetBtn.className = [
      'w-full px-3 py-2',
      'bg-slate-200 dark:bg-slate-700',
      'text-slate-900 dark:text-slate-100 text-sm font-medium',
      'rounded-lg cursor-pointer',
      'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
    ].join(' ');
    resetBtn.addEventListener('click', () => {
      onReset?.();
      onStatus?.('系统已重置');
    });
    resetCard.body.appendChild(resetBtn);
    mount.appendChild(resetCard.element);
  }

  return { dispose: () => { mount.innerHTML = ''; } };
}

// 辅助函数：创建滑块行
function createSliderRow(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit: string,
  onChange: (val: number) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  
  const labelEl = document.createElement('span');
  labelEl.className = 'text-xs text-slate-600 dark:text-slate-400 w-16 shrink-0';
  labelEl.textContent = label;
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.className = 'flex-1 h-1 accent-coral';
  
  const valueEl = document.createElement('span');
  valueEl.className = 'text-xs font-mono w-12 text-right text-slate-700 dark:text-slate-200 shrink-0';
  valueEl.textContent = unit ? `${value}${unit}` : String(value);
  
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    valueEl.textContent = unit ? `${val}${unit}` : String(val);
  });
  
  slider.addEventListener('change', () => {
    onChange(parseFloat(slider.value));
  });
  
  row.append(labelEl, slider, valueEl);
  return row;
}

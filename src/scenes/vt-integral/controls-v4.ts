/**
 * V-T Integral Controls - V4 (Tailwind 重构版)
 */

import { createControlCard } from '../../ui/components/ControlCard';
import { VT_SCENES, isValidVtScene } from './scene-values';

export interface VtIntegralControlsOptions {
  mount: HTMLElement;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStep?: () => void;
  onSetScene?: (scene: string) => void;
  onSetRects?: (value: number) => void;
  onSetTime?: (value: number) => void;
  onSetMethod?: (method: string) => void;
  onSetCurveAmplitude?: (value: number) => void;
  onSetCircleN?: (value: number) => void;
  onSetSurfaceN?: (value: number) => void;
  onSetDivision?: (value: number) => void;
  onPreset?: (preset: string) => void;
  onStatus?: (text: string) => void;
}

export function createVtIntegralControlsV4(options: VtIntegralControlsOptions) {
  const { mount, onPlay, onPause, onReset, onStep, onSetScene, onSetRects, onSetTime, 
          onSetCurveAmplitude, onSetCircleN, onSetSurfaceN, onSetDivision, onPreset, onStatus } = options;

  mount.innerHTML = '';

  // 播放控制卡片
  if (onPlay || onPause || onReset) {
    const transportCard = createControlCard('播放控制', { defaultCollapsed: false });
    const transport = document.createElement('div');
    transport.className = 'grid grid-cols-4 gap-2';
    
    const buttons = [
      { icon: '▶', label: '播放', action: onPlay || (() => {}) },
      { icon: '⏸', label: '暂停', action: onPause || (() => {}) },
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

  // 场景选择卡片
  if (onSetScene) {
    const sceneCard = createControlCard('子场景', { defaultCollapsed: false });
    const sceneBtns = document.createElement('div');
    sceneBtns.className = 'flex flex-col gap-1.5';
    
    VT_SCENES.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = [
        'flex items-center justify-between',
        'px-3 py-2',
        'bg-slate-100 dark:bg-slate-700/50',
        'border border-slate-200 dark:border-slate-600',
        'rounded-lg cursor-pointer',
        'transition-all duration-200',
        'hover:bg-slate-200 dark:hover:bg-slate-600',
        'hover:border-teal-400'
      ].join(' ');
      btn.innerHTML = `
        <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">${s.label}</span>
        <span class="text-[10px] text-slate-500 dark:text-slate-400">${s.desc}</span>
      `;
      btn.addEventListener('click', () => {
        if (isValidVtScene(s.value)) {
          onSetScene?.(s.value);
          onStatus?.(s.desc);
        }
      });
      sceneBtns.appendChild(btn);
    });
    sceneCard.body.appendChild(sceneBtns);
    mount.appendChild(sceneCard.element);
  }

  // 函数预设卡片
  if (onPreset) {
    const presetCard = createControlCard('函数类型', { defaultCollapsed: false });
    const presetBtns = document.createElement('div');
    presetBtns.className = 'grid grid-cols-2 gap-2';
    
    const presets = [
      { label: '匀速', value: 'constant', desc: 'v(t)=2' },
      { label: '匀加速', value: 'linear', desc: 'v(t)=0.5t' },
      { label: '变加速', value: 'quadratic', desc: 'v(t)=0.1t²' },
      { label: '正弦', value: 'sine', desc: 'v(t)=sin(t)' }
    ];
    
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = [
        'flex flex-col items-center',
        'px-2 py-2',
        'bg-slate-100 dark:bg-slate-700/50',
        'border border-slate-200 dark:border-slate-600',
        'rounded-lg cursor-pointer',
        'transition-all duration-200',
        'hover:bg-slate-200 dark:hover:bg-slate-600',
        'hover:border-teal-400'
      ].join(' ');
      btn.innerHTML = `
        <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">${p.label}</span>
        <span class="text-[10px] text-slate-500 dark:text-slate-400">${p.desc}</span>
      `;
      btn.addEventListener('click', () => {
        onPreset?.(p.value);
        onStatus?.(`${p.label}运动 ${p.desc}`);
      });
      presetBtns.appendChild(btn);
    });
    presetCard.body.appendChild(presetBtns);
    mount.appendChild(presetCard.element);
  }

  // 微元设置卡片
  if (onSetRects || onSetDivision) {
    const elementCard = createControlCard('微元设置', { defaultCollapsed: true });
    
    if (onSetRects) {
      const rectSlider = createSliderRow('矩形数量', 1, 50, 1, 10, '', (val) => {
        onSetRects?.(val);
      });
      elementCard.body.appendChild(rectSlider);
    }
    
    if (onSetDivision) {
      const divSlider = createSliderRow('分割数 n', 4, 100, 1, 8, '', (val) => {
        onSetDivision?.(val);
      });
      elementCard.body.appendChild(divSlider);
    }
    
    const hint = document.createElement('div');
    hint.className = 'mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1';
    hint.innerHTML = '<span>💡</span><span>微元越窄，近似越接近真实值。</span>';
    elementCard.body.appendChild(hint);
    
    mount.appendChild(elementCard.element);
  }

  // 高级参数卡片
  const hasAdvancedParams = onSetTime || onSetCurveAmplitude || onSetCircleN || onSetSurfaceN;
  if (hasAdvancedParams) {
    const advancedCard = createControlCard('高级参数', { defaultCollapsed: true });
    
    if (onSetTime) {
      const timeSlider = createSliderRow('时间 t', 0, 10, 0.1, 5, 's', (val) => {
        onSetTime?.(val);
      });
      advancedCard.body.appendChild(timeSlider);
    }
    
    if (onSetCurveAmplitude) {
      const ampSlider = createSliderRow('振幅', 0.5, 3, 0.1, 1, '', (val) => {
        onSetCurveAmplitude?.(val);
      });
      advancedCard.body.appendChild(ampSlider);
    }
    
    if (onSetCircleN) {
      const nSlider = createSliderRow('分割数', 4, 100, 1, 8, '', (val) => {
        onSetCircleN?.(val);
      });
      advancedCard.body.appendChild(nSlider);
    }
    
    if (onSetSurfaceN) {
      const snSlider = createSliderRow('网格密度', 10, 100, 5, 20, '', (val) => {
        onSetSurfaceN?.(val);
      });
      advancedCard.body.appendChild(snSlider);
    }
    
    mount.appendChild(advancedCard.element);
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
  row.className = 'flex items-center gap-2 py-1';
  
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
  valueEl.className = 'text-xs font-mono w-10 text-right text-slate-700 dark:text-slate-200 shrink-0';
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

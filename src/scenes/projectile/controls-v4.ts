/**
 * Projectile Motion Controls - V4 (Tailwind 版本)
 */

import { createControlCard } from '../../ui/components/ControlCard';
import { createButtonGrid, createSliderRow } from '../../ui/components/SceneControls';
import { styles, createElement } from '../../ui/components';

export interface ProjectileControlsOptions {
  mount: HTMLElement;
  onParamChange?: (key: string, value: number) => void;
  onPresetSelect?: (preset: string) => void;
}

export interface ProjectileControls {
  setParam: (key: string, value: number) => void;
  updatePreset: (preset: string) => void;
}

export function createProjectileControlsV4(options: ProjectileControlsOptions): ProjectileControls {
  const { mount, onParamChange, onPresetSelect } = options;

  mount.innerHTML = '';

  // ===== 1. 参数设置卡片 =====
  const paramsCard = createControlCard('参数', { defaultCollapsed: false });
  
  const params = [
    { key: 'v0', label: 'v₀', min: 0, max: 80, step: 0.5, value: 30, unit: 'm/s' },
    { key: 'theta', label: 'θ', min: 0, max: 90, step: 0.1, value: 45, unit: '°' },
    { key: 'h0', label: 'h₀', min: 0, max: 50, step: 0.5, value: 0, unit: 'm' },
    { key: 'g', label: 'g', min: 1.6, max: 20, step: 0.1, value: 9.8, unit: 'm/s²' },
    { key: 'c', label: 'c', min: 0, max: 0.5, step: 0.001, value: 0, unit: '' }
  ];

  const sliders: Record<string, { setValue: (v: number) => void }> = {};

  params.forEach(p => {
    const row = createSliderRow(p.label, {
      min: p.min,
      max: p.max,
      step: p.step,
      value: p.value,
      unit: p.unit,
      onChange: (val) => onParamChange?.(p.key, val),
    });
    
    const slider = row.querySelector('input')!;
    sliders[p.key] = {
      setValue: (v: number) => {
        slider.value = String(v);
        slider.dispatchEvent(new Event('input'));
      }
    };
    
    paramsCard.body.appendChild(row);
  });

  // ===== 2. 环境预设卡片 =====
  const presetCard = createControlCard('环境预设', { defaultCollapsed: false });
  
  const presets = [
    { label: '地球', desc: 'g=9.8', value: 'earth' },
    { label: '月球', desc: 'g=1.6', value: 'moon' },
    { label: '火星', desc: 'g=3.7', value: 'mars' },
    { label: '强风', desc: '阻力', value: 'wind' },
  ];
  
  let activePreset = 'earth';
  
  const presetGrid = createElement('div', 'grid grid-cols-4 gap-2');
  
  const presetButtons: Record<string, HTMLElement> = {};
  
  presets.forEach(p => {
    const btn = createElement('button', [
      'flex flex-col items-center justify-center',
      'px-2 py-2',
      'bg-slate-100 dark:bg-slate-700/50',
      'border border-slate-200 dark:border-slate-600',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:bg-slate-200 dark:hover:bg-slate-600',
      p.value === activePreset ? 'border-coral bg-coral/10' : '',
    ].join(' '));
    
    btn.innerHTML = `
      <span class="text-xs font-semibold ${p.value === activePreset ? 'text-coral' : 'text-slate-900 dark:text-slate-100'}">${p.label}</span>
      <span class="text-[10px] text-slate-500 dark:text-slate-400">${p.desc}</span>
    `;
    
    btn.addEventListener('click', () => {
      // 更新激活状态
      Object.entries(presetButtons).forEach(([key, button]) => {
        const isActive = key === p.value;
        button.classList.toggle('border-coral', isActive);
        button.classList.toggle('bg-coral/10', isActive);
        const labelSpan = button.querySelector('span:first-child')!;
        labelSpan.classList.toggle('text-coral', isActive);
        labelSpan.classList.toggle('text-slate-900', !isActive);
        labelSpan.classList.toggle('dark:text-slate-100', !isActive);
      });
      activePreset = p.value;
      onPresetSelect?.(p.value);
    });
    
    presetButtons[p.value] = btn;
    presetGrid.appendChild(btn);
  });
  
  presetCard.body.appendChild(presetGrid);

  // ===== 3. 显示选项卡片 =====
  const optionsCard = createControlCard('显示选项', { defaultCollapsed: true });
  
  const checkboxes = [
    { key: 'show-trajectory', label: '显示轨迹', checked: true },
    { key: 'show-velocity', label: '显示速度矢量', checked: true },
    { key: 'show-energy', label: '显示能量分析', checked: false },
  ];
  
  const checkboxContainer = createElement('div', 'flex flex-col gap-2');
  
  checkboxes.forEach(cb => {
    const label = createElement('label', [
      'flex items-center gap-2',
      'text-xs cursor-pointer',
      'text-slate-700 dark:text-slate-300',
    ].join(' '));
    
    const input = createElement('input', '', {
      attrs: {
        type: 'checkbox',
        'data-role': cb.key,
        ...(cb.checked ? { checked: 'checked' } : {}),
      },
    }) as HTMLInputElement;
    input.style.accentColor = '#4ECDC4';
    
    const span = createElement('span', '', { text: cb.label });
    
    label.append(input, span);
    checkboxContainer.appendChild(label);
  });
  
  optionsCard.body.appendChild(checkboxContainer);

  // 组装
  mount.appendChild(paramsCard.element);
  mount.appendChild(presetCard.element);
  mount.appendChild(optionsCard.element);

  return {
    setParam(key: string, value: number) {
      sliders[key]?.setValue(value);
    },
    updatePreset(preset: string) {
      Object.entries(presetButtons).forEach(([key, button]) => {
        const isActive = key === preset;
        button.classList.toggle('border-coral', isActive);
        button.classList.toggle('bg-coral/10', isActive);
        const labelSpan = button.querySelector('span:first-child')!;
        labelSpan.classList.toggle('text-coral', isActive);
        labelSpan.classList.toggle('text-slate-900', !isActive);
        labelSpan.classList.toggle('dark:text-slate-100', !isActive);
      });
      activePreset = preset;
    }
  };
}

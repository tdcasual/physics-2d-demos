/**
 * Projectile Motion Controls - V4 (Tailwind 版本)
 */

import { createControlCard } from '../../ui/components/ControlCard';
import { createSliderRow } from '../../ui/components/SceneControls';
import { createElement } from '../../ui/components';

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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
    ].join(' ');
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs font-semibold';
    labelSpan.style.color = p.value === activePreset ? 'var(--accent-primary)' : 'var(--text-primary)';
    labelSpan.textContent = p.label;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'text-[10px]';
    descSpan.style.color = 'var(--text-secondary)';
    descSpan.textContent = p.desc;
    
    btn.append(labelSpan, descSpan);
    
    // 设置基础样式
    btn.style.cssText = `
      background: ${p.value === activePreset ? 'var(--btn-hover-bg)' : 'var(--btn-bg)'};
      border: 1px solid ${p.value === activePreset ? 'var(--accent-primary)' : 'var(--border-color)'};
    `;
    
    btn.addEventListener('click', () => {
      // 更新激活状态
      Object.entries(presetButtons).forEach(([key, button]) => {
        const isActive = key === p.value;
        const btnLabelSpan = button.querySelector('span:first-child') as HTMLElement;
        if (btnLabelSpan) {
          btnLabelSpan.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-primary)';
        }
        button.style.background = isActive ? 'var(--btn-hover-bg)' : 'var(--btn-bg)';
        button.style.borderColor = isActive ? 'var(--accent-primary)' : 'var(--border-color)';
      });
      activePreset = p.value;
      onPresetSelect?.(p.value);
    });
    
    presetButtons[p.value] = btn;
    presetGrid.appendChild(btn);
  });
  
  presetCard.body.appendChild(presetGrid);

  // ===== 3. 显示选项卡片 =====
  // 组装
  mount.appendChild(paramsCard.element);
  mount.appendChild(presetCard.element);

  return {
    setParam(key: string, value: number) {
      sliders[key]?.setValue(value);
    },
    updatePreset(preset: string) {
      Object.entries(presetButtons).forEach(([key, button]) => {
        const isActive = key === preset;
        const btnLabelSpan = button.querySelector('span:first-child') as HTMLElement;
        if (btnLabelSpan) {
          btnLabelSpan.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-primary)';
        }
        button.style.background = isActive ? 'var(--btn-hover-bg)' : 'var(--btn-bg)';
        button.style.borderColor = isActive ? 'var(--accent-primary)' : 'var(--border-color)';
      });
      activePreset = preset;
    }
  };
}

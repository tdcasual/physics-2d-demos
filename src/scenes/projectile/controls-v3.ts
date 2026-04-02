/**
 * Projectile Motion Controls - V3
 * 无图表区场景的布局优化：
 * - 参数设置：内部双列排列（节省垂直空间）
 * - 环境预设：单行按钮组
 * - 显示选项：单列
 * 基本原则：大卡片垂直排列，卡片内部根据内容灵活布局
 */

import {
  createControlCard,
  createButtonGrid
} from '../../ui/control-layout';

export interface ProjectileControlsOptions {
  mount: HTMLElement;
  onParamChange?: (key: string, value: number) => void;
  onPresetSelect?: (preset: string) => void;
}

export interface ProjectileControls {
  setParam: (key: string, value: number) => void;
  updatePreset: (preset: string) => void;
}

export function createProjectileControlsV3(options: ProjectileControlsOptions): ProjectileControls {
  const { mount, onParamChange, onPresetSelect } = options;

  mount.innerHTML = '';

  // ===== 1. 参数设置卡片（内部双列布局）=====
  const paramsCard = createControlCard('⚙️ 参数', { defaultCollapsed: false });
  
  // 参数数据
  const params = [
    { key: 'v0', label: '初速度', min: 0, max: 80, step: 0.5, value: 30, unit: 'm/s' },
    { key: 'theta', label: '发射角', min: 0, max: 90, step: 0.1, value: 45, unit: '°' },
    { key: 'h0', label: '初始高度', min: 0, max: 50, step: 0.5, value: 0, unit: 'm' },
    { key: 'g', label: '重力加速度', min: 1.6, max: 20, step: 0.1, value: 9.8, unit: 'm/s²' },
    { key: 'c', label: '空气阻力', min: 0, max: 0.5, step: 0.001, value: 0, unit: '' }
  ];

  // 创建双列网格容器
  const paramsGrid = document.createElement('div');
  paramsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px;';
  
  const sliders: Record<string, { setValue: (v: number) => void }> = {};

  params.forEach(p => {
    const paramEl = document.createElement('div');
    paramEl.style.cssText = 'display: grid; grid-template-columns: auto 1fr auto; gap: 4px; align-items: center;';
    paramEl.innerHTML = `
      <label style="font-size: 10px; color: var(--text-secondary); white-space: nowrap;">${p.label}</label>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" 
             data-key="${p.key}" style="width: 100%; height: 4px;">
      <span style="font-size: 10px; min-width: 30px; text-align: right; font-family: monospace;">${p.value}${p.unit}</span>
    `;
    
    const slider = paramEl.querySelector('input')!;
    const valueSpan = paramEl.querySelector('span')!;
    
    slider.addEventListener('input', () => {
      valueSpan.textContent = `${slider.value}${p.unit}`;
    });
    
    slider.addEventListener('change', () => {
      onParamChange?.(p.key, parseFloat(slider.value));
    });
    
    sliders[p.key] = {
      setValue: (v: number) => {
        slider.value = String(v);
        valueSpan.textContent = `${v}${p.unit}`;
      }
    };
    
    paramsGrid.appendChild(paramEl);
  });
  
  paramsCard.body.appendChild(paramsGrid);

  // ===== 2. 环境预设卡片（单行按钮组）=====
  const presetCard = createControlCard('🌍 环境', { defaultCollapsed: false });
  
  const presetGrid = createButtonGrid([
    { label: '地球', value: 'earth', variant: 'primary', onClick: () => onPresetSelect?.('earth') },
    { label: '月球', value: 'moon', onClick: () => onPresetSelect?.('moon') },
    { label: '火星', value: 'mars', onClick: () => onPresetSelect?.('mars') },
    { label: '强风', value: 'wind', onClick: () => onPresetSelect?.('wind') }
  ], { columns: 4 });
  
  presetCard.body.appendChild(presetGrid.element);

  // ===== 3. 显示选项卡片（单列折叠）=====
  const optionsCard = createControlCard('👁️ 显示', { defaultCollapsed: true });
  optionsCard.body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <label class="ctrl-checkbox" style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
        <input type="checkbox" data-role="show-trajectory" checked style="accent-color: var(--accent-color);">
        <span>显示轨迹</span>
      </label>
      <label class="ctrl-checkbox" style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
        <input type="checkbox" data-role="show-velocity" checked style="accent-color: var(--accent-color);">
        <span>显示速度矢量</span>
      </label>
      <label class="ctrl-checkbox" style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
        <input type="checkbox" data-role="show-energy" style="accent-color: var(--accent-color);">
        <span>显示能量分析</span>
      </label>
    </div>
  `;

  // 垂直排列三个卡片
  mount.appendChild(paramsCard.element);
  mount.appendChild(presetCard.element);
  mount.appendChild(optionsCard.element);

  return {
    setParam(key: string, value: number) {
      sliders[key]?.setValue(value);
    },
    updatePreset(preset: string) {
      presetGrid.setActive(preset);
    }
  };
}

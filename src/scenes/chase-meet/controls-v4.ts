/**
 * Chase Meet Controls - V4 (弹簧振子风格)
 */

import { createControlCard } from '../../ui/components/ControlCard';
import type { ChaseMeetParams, ResolvedChaseMeetParams } from './scene.sim';

export interface ChaseMeetControlsOptions {
  mount: HTMLElement;
  initialParams: ResolvedChaseMeetParams;
  onApplyParams: (next: Partial<ChaseMeetParams>) => void;
  onStatus?: (text: string) => void;
}

export function createChaseMeetControlsV4(options: ChaseMeetControlsOptions) {
  const { mount, initialParams, onApplyParams, onStatus } = options;

  mount.innerHTML = '';

  const state: ChaseMeetParams = { ...initialParams };

  // 参数卡片
  const paramsCard = createControlCard('参数设置', { defaultCollapsed: false });
  
  const paramsContent = document.createElement('div');
  paramsContent.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
  
  // 总时间
  const totalTimeRow = createNumberInput('总时间 T', state.totalTime, 1, 120, 0.5, 's', 'total-time');
  paramsContent.appendChild(totalTimeRow);
  
  // 步长
  const dtRow = createNumberInput('步长 Δt', state.dt, 0.005, 1, 0.005, 's', 'dt');
  paramsContent.appendChild(dtRow);
  
  // 分隔线
  const divider1 = document.createElement('div');
  divider1.style.cssText = 'height: 1px; background: #e5e7eb; margin: 4px 0;';
  paramsContent.appendChild(divider1);
  
  // 初始位置 A
  const x0aRow = createNumberInput('初始位置 A', state.x0A, -100, 100, 0.5, 'm', 'x0a');
  paramsContent.appendChild(x0aRow);
  
  // 初始位置 B
  const x0bRow = createNumberInput('初始位置 B', state.x0B, -100, 100, 0.5, 'm', 'x0b');
  paramsContent.appendChild(x0bRow);
  
  // 分隔线
  const divider2 = document.createElement('div');
  divider2.style.cssText = 'height: 1px; background: #e5e7eb; margin: 4px 0;';
  paramsContent.appendChild(divider2);
  
  // 速度函数 A
  const vExprARow = createTextInput('速度函数 vA(t)', state.vExprA, 'vexpr-a', 'monospace');
  paramsContent.appendChild(vExprARow);
  
  // 速度函数 B
  const vExprBRow = createTextInput('速度函数 vB(t)', state.vExprB, 'vexpr-b', 'monospace');
  paramsContent.appendChild(vExprBRow);
  
  // 应用按钮
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.textContent = '应用参数';
  applyBtn.style.cssText = `
    margin-top: 8px;
    padding: 10px 16px;
    background: #FF6B6B;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(255,107,107,0.3);
  `;
  applyBtn.addEventListener('mouseenter', () => {
    applyBtn.style.filter = 'brightness(1.1)';
  });
  applyBtn.addEventListener('mouseleave', () => {
    applyBtn.style.filter = 'none';
  });
  applyBtn.addEventListener('click', applySettings);
  paramsContent.appendChild(applyBtn);
  
  paramsCard.body.appendChild(paramsContent);

  // 预设卡片
  const presetCard = createControlCard('快速预设', { defaultCollapsed: true });
  
  const presetContainer = document.createElement('div');
  presetContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  
  const presets = [
    { label: '匀速追赶', value: 'chase', desc: 'vA=2, vB=1', onClick: () => applyPreset({ vExprA: '2', vExprB: '1', x0A: '0', x0B: '10' }) },
    { label: '加速追赶', value: 'accel', desc: 'vA=0.5t, vB=2', onClick: () => applyPreset({ vExprA: '0.5*t', vExprB: '2', x0A: '0', x0B: '15' }) },
    { label: '相向而行', value: 'meet', desc: 'vA=3, vB=-2', onClick: () => applyPreset({ vExprA: '3', vExprB: '-2', x0A: '0', x0B: '20' }) }
  ];
  
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    `;
    btn.innerHTML = `
      <span style="font-size: 13px; font-weight: 600; color: #374151;">${p.label}</span>
      <span style="font-size: 11px; color: #9ca3af;">${p.desc}</span>
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = '#FF6B6B';
      btn.style.boxShadow = '0 1px 3px rgba(255,107,107,0.15)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = '#e5e7eb';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    });
    btn.addEventListener('click', () => {
      p.onClick();
      onStatus?.(`应用预设: ${p.label}`);
    });
    presetContainer.appendChild(btn);
  });
  
  presetCard.body.appendChild(presetContainer);

  mount.appendChild(paramsCard.element);
  mount.appendChild(presetCard.element);

  // 辅助函数：创建数字输入行
  function createNumberInput(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    role: string
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const labelEl = document.createElement('label');
    labelEl.style.cssText = 'font-size: 12px; color: #6b7280; width: 80px; flex-shrink: 0;';
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.dataset.role = role;
    input.style.cssText = `
      flex: 1;
      padding: 8px 10px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 13px;
      color: #374151;
      outline: none;
      transition: all 0.2s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#FF6B6B';
      input.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.1)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e5e7eb';
      input.style.boxShadow = 'none';
    });
    
    const unitEl = document.createElement('span');
    unitEl.style.cssText = 'font-size: 12px; color: #9ca3af; width: 20px; flex-shrink: 0;';
    unitEl.textContent = unit;
    
    row.append(labelEl, input, unitEl);
    return row;
  }
  
  // 辅助函数：创建文本输入行
  function createTextInput(
    label: string,
    value: string,
    role: string,
    fontFamily?: string
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    
    const labelEl = document.createElement('label');
    labelEl.style.cssText = 'font-size: 12px; color: #6b7280;';
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.dataset.role = role;
    input.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 13px;
      color: #374151;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
    `;
    if (fontFamily) {
      input.style.fontFamily = fontFamily;
    }
    input.addEventListener('focus', () => {
      input.style.borderColor = '#FF6B6B';
      input.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.1)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e5e7eb';
      input.style.boxShadow = 'none';
    });
    
    row.append(labelEl, input);
    return row;
  }

  // 绑定事件
  function getInput(role: string): HTMLInputElement | null {
    return mount.querySelector(`[data-role="${role}"]`) as HTMLInputElement;
  }

  function applyPreset(preset: Record<string, string>) {
    Object.entries(preset).forEach(([key, value]) => {
      const input = getInput(key);
      if (input) input.value = value;
    });
    applySettings();
  }

  function applySettings() {
    const totalTime = parseFloat(getInput('total-time')?.value || '10');
    const dt = parseFloat(getInput('dt')?.value || '0.05');
    const x0A = parseFloat(getInput('x0a')?.value || '0');
    const x0B = parseFloat(getInput('x0b')?.value || '10');
    const vExprA = getInput('vexpr-a')?.value || '2';
    const vExprB = getInput('vexpr-b')?.value || '1';

    state.totalTime = Math.max(1, Math.min(120, totalTime));
    state.dt = Math.max(0.005, Math.min(1, dt));
    state.x0A = x0A;
    state.x0B = x0B;
    state.vExprA = vExprA;
    state.vExprB = vExprB;

    onApplyParams({ ...state });
    onStatus?.('参数已应用');
  }

  return { dispose: () => { mount.innerHTML = ''; } };
}

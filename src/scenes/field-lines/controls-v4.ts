/**
 * Field Lines Controls - V4 (Tailwind 重构版)
 */

import { createControlCard } from '../../ui/components/ControlCard';

export interface FieldLinesControlsOptions {
  mount: HTMLElement;
  onSetScene?: (scene: string) => void;
  onSetDensity?: (density: number) => void;
  onSetCustomCharges?: (q1: number, q2: number) => void;
  onAddCharge?: (charge: number) => void;
  onRemoveCharge?: (index: number) => void;
  onPreset?: (preset: string) => void;
  onReset?: () => void;
  onStatus?: (text: string) => void;
}

export function createFieldLinesControlsV4(options: FieldLinesControlsOptions) {
  const { mount, onSetScene, onSetDensity, onSetCustomCharges, onAddCharge, onRemoveCharge, onReset, onStatus } = options;

  mount.innerHTML = '';

  // 场景选择卡片
  const sceneCard = createControlCard('场景选择', { defaultCollapsed: false });
  const sceneBtns = document.createElement('div');
  sceneBtns.className = 'grid grid-cols-2 gap-2';
  
  const scenes = [
    { label: '点电荷', value: 'point', desc: '单点电荷电场' },
    { label: '双极子', value: 'dipole', desc: '电偶极子电场' },
    { label: '四极子', value: 'quadrupole', desc: '电四极子电场' },
    { label: '平行板', value: 'plates', desc: '平行板电场' }
  ];
  
  scenes.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'flex flex-col items-center',
      'px-2 py-2.5',
      'bg-slate-100 dark:bg-slate-700/50',
      'border border-slate-200 dark:border-slate-600',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:bg-slate-200 dark:hover:bg-slate-600',
      'hover:border-teal-400'
    ].join(' ');
    btn.innerHTML = `
      <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">${s.label}</span>
    `;
    btn.addEventListener('click', () => {
      onSetScene?.(s.value);
      onStatus?.(s.desc);
    });
    sceneBtns.appendChild(btn);
  });
  sceneCard.body.appendChild(sceneBtns);

  // 电荷控制卡片
  const chargeCard = createControlCard('电荷控制', { defaultCollapsed: false });
  const chargeBtns = document.createElement('div');
  chargeBtns.className = 'grid grid-cols-2 gap-2';
  
  const addPosBtn = document.createElement('button');
  addPosBtn.type = 'button';
  addPosBtn.textContent = '+ 正电荷';
  addPosBtn.className = [
    'px-3 py-2',
    'bg-coral text-white text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:brightness-110 transition-all'
  ].join(' ');
  addPosBtn.addEventListener('click', () => {
    onAddCharge?.(1);
    onStatus?.('添加正电荷');
  });
  
  const addNegBtn = document.createElement('button');
  addNegBtn.type = 'button';
  addNegBtn.textContent = '- 负电荷';
  addNegBtn.className = [
    'px-3 py-2',
    'bg-slate-200 dark:bg-slate-700',
    'text-slate-900 dark:text-slate-100 text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
  ].join(' ');
  addNegBtn.addEventListener('click', () => {
    onAddCharge?.(-1);
    onStatus?.('添加负电荷');
  });
  
  chargeBtns.append(addPosBtn, addNegBtn);
  chargeCard.body.appendChild(chargeBtns);

  // 密度控制卡片
  const densityCard = createControlCard('线密度', { defaultCollapsed: true });
  const densitySlider = createSliderRow('电场线密度', 0.5, 2, 0.1, 1, '', (val) => {
    onSetDensity?.(val);
  });
  densityCard.body.appendChild(densitySlider);

  // 自定义电荷卡片
  const customCard = createControlCard('自定义电荷', { defaultCollapsed: true });
  const customContent = document.createElement('div');
  customContent.className = 'flex flex-col gap-2';
  
  const q1Row = createNumberInput('Q₁', 1, -10, 10, 0.5, 'q1');
  customContent.appendChild(q1Row);
  
  const q2Row = createNumberInput('Q₂', -1, -10, 10, 0.5, 'q2');
  customContent.appendChild(q2Row);
  
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.textContent = '应用电荷';
  applyBtn.className = [
    'mt-1 px-3 py-2',
    'bg-slate-200 dark:bg-slate-700',
    'text-slate-900 dark:text-slate-100 text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
  ].join(' ');
  applyBtn.addEventListener('click', () => {
    const q1 = parseFloat((customContent.querySelector('[data-role="q1"]') as HTMLInputElement)?.value || '1');
    const q2 = parseFloat((customContent.querySelector('[data-role="q2"]') as HTMLInputElement)?.value || '-1');
    onSetCustomCharges?.(q1, q2);
    onStatus?.(`设置电荷 Q₁=${q1}, Q₂=${q2}`);
  });
  customContent.appendChild(applyBtn);
  customCard.body.appendChild(customContent);

  // 重置卡片
  const resetCard = createControlCard('重置', { defaultCollapsed: true });
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = '重置场景';
  resetBtn.className = [
    'w-full px-3 py-2',
    'bg-slate-200 dark:bg-slate-700',
    'text-slate-900 dark:text-slate-100 text-sm font-medium',
    'rounded-lg cursor-pointer',
    'hover:bg-slate-300 dark:hover:bg-slate-600 transition-all'
  ].join(' ');
  resetBtn.addEventListener('click', () => {
    onReset?.();
    onStatus?.('场景已重置');
  });
  resetCard.body.appendChild(resetBtn);

  mount.appendChild(sceneCard.element);
  mount.appendChild(chargeCard.element);
  mount.appendChild(densityCard.element);
  mount.appendChild(customCard.element);
  mount.appendChild(resetCard.element);

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
  labelEl.className = 'text-xs text-slate-600 dark:text-slate-400 w-20 shrink-0';
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

// 辅助函数：创建数字输入行
function createNumberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  role: string
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  
  const labelEl = document.createElement('label');
  labelEl.className = 'text-xs text-slate-600 dark:text-slate-400 w-10 shrink-0';
  labelEl.textContent = label;
  
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.dataset.role = role;
  input.className = [
    'flex-1 px-2 py-1.5',
    'bg-white dark:bg-slate-800',
    'border border-slate-300 dark:border-slate-600',
    'rounded text-sm',
    'text-slate-900 dark:text-slate-100'
  ].join(' ');
  
  row.append(labelEl, input);
  return row;
}

/**
 * 通用场景控制组件
 * 适用于大多数物理演示场景
 */

import { createControlCard, type ControlCardOptions } from './ControlCard';
import { createElement } from './index';

export interface ControlItem {
  type: 'slider' | 'select' | 'button' | 'button-group';
  label: string;
  key: string;
  value?: number | string;
  options?: Array<{ label: string; value: string }>;
  buttons?: Array<{ label: string; value: string; desc?: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SceneControlsOptions {
  title: string;
  icon?: string;
  headerActions?: HTMLElement[];
  defaultCollapsed?: boolean;
  onChange?: (key: string, value: number | string) => void;
}

export interface SceneControlsInstance {
  element: HTMLElement;
  body: HTMLElement;
  setValue: (key: string, value: number | string) => void;
  getValue: (key: string) => number | string | undefined;
}

/**
 * 创建通用场景控制面板
 */
export function createSceneControls(
  options: SceneControlsOptions
): SceneControlsInstance {
  const card = createControlCard(options.title, {
    icon: options.icon,
    headerActions: options.headerActions,
    defaultCollapsed: options.defaultCollapsed ?? false,
  });

  const values = new Map<string, number | string>();
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();

  function setValue(key: string, value: number | string): void {
    values.set(key, value);
    const input = inputs.get(key);
    if (input) {
      input.value = String(value);
    }
  }

  function getValue(key: string): number | string | undefined {
    return values.get(key);
  }

  return {
    element: card.element,
    body: card.body,
    setValue,
    getValue,
  };
}

/**
 * 创建滑块控制行
 */
export function createSliderRow(
  label: string,
  options: {
    min: number;
    max: number;
    step: number;
    value: number;
    unit?: string;
    onChange?: (value: number) => void;
  }
): HTMLElement {
  const row = createElement('div', 'flex items-center gap-2 py-1');
  
  const labelEl = document.createElement('span');
  labelEl.className = 'text-[13px] font-semibold w-6 shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(options.min);
  slider.max = String(options.max);
  slider.step = String(options.step);
  slider.value = String(options.value);
  slider.className = 'flex-1 min-w-0 w-full h-1 rounded-lg appearance-none cursor-pointer';
  slider.style.cssText = `
    background: var(--border-color);
    accent-color: var(--accent-primary);
  `;
  
  const valueEl = document.createElement('span');
  valueEl.className = 'text-xs font-semibold w-10 text-right shrink-0';
  valueEl.style.color = 'var(--text-primary)';
  valueEl.textContent = options.value + (options.unit || '');
  
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    valueEl.textContent = val + (options.unit || '');
    options.onChange?.(val);
  });
  
  row.append(labelEl, slider, valueEl);
  return row;
}

/**
 * 创建选择器控制行
 */
export function createSelectRow(
  label: string,
  options: {
    choices: Array<{ label: string; value: string }>;
    value: string;
    onChange?: (value: string) => void;
  }
): HTMLElement {
  const row = createElement('div', 'flex items-center gap-2 py-1');
  
  const labelEl = document.createElement('span');
  labelEl.className = 'text-[13px] font-semibold shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;
  
  const select = document.createElement('select');
  select.className = 'text-xs px-1 py-0.5 rounded flex-1 min-w-0';
  select.style.cssText = `
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-primary);
  `;
  
  options.choices.forEach(choice => {
    const opt = document.createElement('option');
    opt.value = choice.value;
    opt.textContent = choice.label;
    if (choice.value === options.value) opt.selected = true;
    select.appendChild(opt);
  });
  
  select.addEventListener('change', () => {
    options.onChange?.(select.value);
  });
  
  row.append(labelEl, select);
  return row;
}

/**
 * 创建按钮网格（用于预设场景）
 */
export function createButtonGrid(
  buttons: Array<{
    label: string;
    desc?: string;
    onClick: () => void;
  }>,
  columns: 2 | 3 = 2
): HTMLElement {
  const grid = document.createElement('div');
  grid.className = `grid grid-cols-${columns} gap-2`;
  
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2.5',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:-translate-y-px',
    ].join(' ');
    button.style.cssText = `
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--btn-hover-bg)';
      button.style.borderColor = 'var(--accent-color)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--btn-bg)';
      button.style.borderColor = 'var(--border-color)';
    });
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs font-semibold';
    labelSpan.style.color = 'var(--text-primary)';
    labelSpan.textContent = btn.label;
    
    if (btn.desc) {
      const descSpan = document.createElement('span');
      descSpan.className = 'text-[10px]';
      descSpan.style.color = 'var(--text-secondary)';
      descSpan.textContent = btn.desc;
      button.append(labelSpan, descSpan);
    } else {
      button.appendChild(labelSpan);
    }
    
    button.addEventListener('click', btn.onClick);
    grid.appendChild(button);
  });
  
  return grid;
}

/**
 * 创建删除按钮
 */
export function createDeleteButton(onClick: () => void): HTMLElement {
  const btn = createElement('button', [
    'w-5 h-5',
    'flex items-center justify-center',
    'text-coral hover:bg-coral/10',
    'rounded cursor-pointer',
    'transition-colors',
  ].join(' '), {
    text: '✕',
    attrs: { title: '删除' },
  });
  
  btn.addEventListener('click', onClick);
  return btn;
}

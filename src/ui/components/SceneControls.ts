/**
 * 通用场景控制组件
 * 适用于大多数物理演示场景
 */

import { createControlCard, type ControlCardOptions } from './ControlCard';
import { styles, createElement } from './index';

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
  
  const labelEl = createElement('span', styles.text.label + ' w-6 shrink-0', { text: label });
  
  const slider = createElement('input', styles.input.range + ' flex-1 min-w-0', {
    attrs: {
      type: 'range',
      min: String(options.min),
      max: String(options.max),
      step: String(options.step),
      value: String(options.value),
    },
  }) as HTMLInputElement;
  
  const valueEl = createElement('span', 'text-xs font-semibold w-10 text-right shrink-0 text-slate-900 dark:text-slate-100', {
    text: options.value + (options.unit || ''),
  });
  
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
  
  const labelEl = createElement('span', styles.text.label + ' shrink-0', { text: label });
  
  const select = createElement('select', styles.input.select + ' flex-1 min-w-0', {}) as HTMLSelectElement;
  
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
  const grid = createElement('div', `grid grid-cols-${columns} gap-2`);
  
  buttons.forEach(btn => {
    const button = createElement('button', [
      'flex flex-col items-center justify-center',
      'px-2 py-2.5',
      'bg-slate-100 dark:bg-slate-700/50',
      'border border-slate-200 dark:border-slate-600',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:bg-slate-200 dark:hover:bg-slate-600',
      'hover:border-teal-400',
      'hover:-translate-y-px',
    ].join(' '));
    
    button.innerHTML = `
      <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">${btn.label}</span>
      ${btn.desc ? `<span class="text-[10px] text-slate-500 dark:text-slate-400">${btn.desc}</span>` : ''}
    `;
    
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

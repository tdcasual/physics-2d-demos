/**
 * 通用场景控制组件
 * 适用于大多数物理演示场景
 */

import { createControlCard } from './ControlCard';
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
    defaultCollapsed: options.defaultCollapsed ?? false
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
    getValue
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
  row.dataset.testid = 'slider-row';

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
  slider.className =
    'flex-1 min-w-0 w-full h-1 rounded-lg appearance-none cursor-pointer';
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
  row.dataset.testid = 'select-row';

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

  options.choices.forEach((choice) => {
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
  columns: 1 | 2 | 3 = 2
): HTMLElement {
  const grid = document.createElement('div');
  grid.className = `grid grid-cols-${columns} gap-2`;

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2.5',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:-translate-y-px'
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
 * 创建带激活状态的预设按钮组
 *
 * 适用于环境预设、场景预设等需要高亮当前选中项的控件。
 */
export function createPresetButtonGroup(
  mount: HTMLElement,
  presets: Array<{ id: string; label: string; desc?: string }>,
  options: {
    initialActive?: string;
    columns?: 2 | 3 | 4;
    onSelect: (id: string) => void;
  }
): { element: HTMLElement; setActive: (id: string) => void } {
  let activeId = options.initialActive ?? presets[0]?.id ?? '';

  const grid = document.createElement('div');
  grid.className = `grid grid-cols-${options.columns ?? 4} gap-2`;

  const buttons = new Map<string, HTMLButtonElement>();

  function updateStyles() {
    buttons.forEach((btn, id) => {
      const isActive = id === activeId;
      const labelSpan = btn.querySelector('span:first-child') as HTMLElement;
      if (labelSpan) {
        labelSpan.style.color = isActive
          ? 'var(--accent-primary)'
          : 'var(--text-primary)';
      }
      btn.style.background = isActive ? 'var(--btn-hover-bg)' : 'var(--btn-bg)';
      btn.style.borderColor = isActive
        ? 'var(--accent-primary)'
        : 'var(--border-color)';
    });
  }

  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2',
      'rounded-lg cursor-pointer',
      'transition-all duration-200'
    ].join(' ');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs font-semibold';
    labelSpan.textContent = p.label;

    if (p.desc) {
      const descSpan = document.createElement('span');
      descSpan.className = 'text-[10px]';
      descSpan.style.color = 'var(--text-secondary)';
      descSpan.textContent = p.desc;
      btn.append(labelSpan, descSpan);
    } else {
      btn.appendChild(labelSpan);
    }

    btn.addEventListener('click', () => {
      activeId = p.id;
      updateStyles();
      options.onSelect(p.id);
    });

    buttons.set(p.id, btn);
    grid.appendChild(btn);
  });

  updateStyles();
  mount.appendChild(grid);

  return {
    element: grid,
    setActive: (id: string) => {
      if (buttons.has(id)) {
        activeId = id;
        updateStyles();
      }
    }
  };
}

/**
 * 创建运输控制按钮行（播放/暂停/重置/单步）
 */
export function createTransportRow(
  mount: HTMLElement,
  callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onReset?: () => void;
    onStep?: () => void;
  }
): { element: HTMLElement } {
  const container = document.createElement('div');
  container.className = 'grid grid-cols-4 gap-2';

  const buttons = [
    { icon: '▶', label: '播放', action: callbacks.onPlay },
    { icon: '⏸', label: '暂停', action: callbacks.onPause },
    { icon: '⏹', label: '重置', action: callbacks.onReset },
    { icon: '⏵', label: '单步', action: callbacks.onStep }
  ];

  buttons.forEach((btn) => {
    if (!btn.action) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'flex flex-col items-center gap-1',
      'px-2 py-2',
      'rounded-lg cursor-pointer',
      'transition-all'
    ].join(' ');
    button.style.cssText = `
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
    `;
    button.innerHTML = `
      <span class="text-sm">${btn.icon}</span>
      <span class="text-[10px]" style="color: var(--text-secondary)">${btn.label}</span>
    `;
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--btn-hover-bg)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--btn-bg)';
    });
    button.addEventListener('click', btn.action);
    container.appendChild(button);
  });

  mount.appendChild(container);
  return { element: container };
}

/**
 * 创建场景/模式选择按钮列表
 *
 * 适用于 electrification、field-lines 等需要切换子场景的场景。
 */
export function createSceneSelector(
  mount: HTMLElement,
  scenes: Array<{ id: string; label: string; desc?: string }>,
  options: {
    initialActive?: string;
    onSelect: (id: string) => void;
  }
): { element: HTMLElement; setActive: (id: string) => void } {
  let activeId = options.initialActive ?? scenes[0]?.id ?? '';
  const buttons = new Map<string, HTMLButtonElement>();

  const container = document.createElement('div');
  container.className = 'flex flex-col gap-1.5';

  function updateStyles() {
    buttons.forEach((btn, id) => {
      const isActive = id === activeId;
      btn.style.cssText = `
        width: 100%;
        padding: 12px 14px;
        background: ${isActive ? 'var(--accent-primary-light, rgba(79,70,229,0.1))' : 'var(--btn-bg, #ffffff)'};
        border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'};
        border-radius: 8px;
        color: ${isActive ? 'var(--accent-primary)' : 'var(--text-primary)'};
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        box-shadow: ${isActive ? '0 1px 3px rgba(79,70,229,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'};
      `;
    });
  }

  scenes.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `
      <span style="font-weight: 600; font-size: 14px;">${s.label}</span>
      ${s.desc ? `<span style="display: block; font-size: 11px; margin-top: 3px; color: var(--text-secondary);">${s.desc}</span>` : ''}
    `;
    btn.addEventListener('click', () => {
      activeId = s.id;
      updateStyles();
      options.onSelect(s.id);
    });
    buttons.set(s.id, btn);
    container.appendChild(btn);
  });

  updateStyles();
  mount.appendChild(container);

  return {
    element: container,
    setActive: (id: string) => {
      if (buttons.has(id)) {
        activeId = id;
        updateStyles();
      }
    }
  };
}

/**
 * 创建数字输入行
 */
export function createNumberInputRow(
  label: string,
  options: {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    role?: string;
  },
  onChange: (value: number) => void
): HTMLElement {
  const row = createElement('div', 'flex items-center gap-2 py-1');

  const labelEl = document.createElement('label');
  labelEl.className = 'text-[13px] font-semibold w-20 shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(options.min ?? '');
  input.max = String(options.max ?? '');
  input.step = String(options.step ?? '');
  input.value = String(options.value);
  if (options.role) input.dataset.role = options.role;
  input.className = 'flex-1 px-2 py-1.5 rounded text-sm min-w-0';
  input.style.cssText = `
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    outline: none;
    transition: all 0.2s;
  `;
  input.addEventListener('focus', () => {
    input.style.borderColor = 'var(--accent-primary)';
    input.style.boxShadow = '0 0 0 3px var(--accent-primary-light)';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = 'var(--border-color)';
    input.style.boxShadow = 'none';
  });
  input.addEventListener('change', () => {
    onChange(parseFloat(input.value));
  });

  row.append(labelEl, input);

  if (options.unit) {
    const unitEl = document.createElement('span');
    unitEl.className = 'text-xs w-6 shrink-0';
    unitEl.style.color = 'var(--text-secondary)';
    unitEl.textContent = options.unit;
    row.appendChild(unitEl);
  }

  return row;
}

/**
 * 创建文本输入行
 */
export function createTextInputRow(
  label: string,
  options: {
    value: string;
    role?: string;
    fontFamily?: string;
  },
  onChange: (value: string) => void
): HTMLElement {
  const row = createElement('div', 'flex flex-col gap-1 py-1');

  const labelEl = document.createElement('label');
  labelEl.className = 'text-[13px] font-semibold';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = options.value;
  if (options.role) input.dataset.role = options.role;
  input.className = 'w-full px-2 py-1.5 rounded text-sm';
  input.style.cssText = `
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  `;
  if (options.fontFamily) {
    input.style.fontFamily = options.fontFamily;
  }
  input.addEventListener('focus', () => {
    input.style.borderColor = 'var(--accent-primary)';
    input.style.boxShadow = '0 0 0 3px var(--accent-primary-light)';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = 'var(--border-color)';
    input.style.boxShadow = 'none';
  });
  input.addEventListener('change', () => {
    onChange(input.value);
  });

  row.append(labelEl, input);
  return row;
}

/**
 * 创建删除按钮
 */
export function createDeleteButton(onClick: () => void): HTMLElement {
  const btn = createElement(
    'button',
    [
      'w-5 h-5',
      'flex items-center justify-center',
      'text-coral hover:bg-coral/10',
      'rounded cursor-pointer',
      'transition-colors'
    ].join(' '),
    {
      text: '✕',
      attrs: { title: '删除' }
    }
  );

  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * 创建数字输入控制行
 *
 * @param label - 左侧标签文本
 * @param options - 输入配置（value/min/max/step/unit/role）
 * @param onChange - 数值变化回调
 * @returns 包含标签、数字输入框和数值显示的 DOM 行元素
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
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 py-1';

  const inputId = `num-input-${Math.random().toString(36).slice(2, 8)}`;

  const labelEl = document.createElement('label');
  labelEl.htmlFor = inputId;
  labelEl.className = 'text-[12px] font-semibold w-20 shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'number';
  input.min = String(options.min ?? '');
  input.max = String(options.max ?? '');
  input.step = String(options.step ?? '');
  input.value = String(options.value);
  if (options.role) input.dataset.role = options.role;
  input.className = 'flex-1 px-2 py-1 rounded text-[13px] min-w-0';
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
    unitEl.className = 'text-[11px] w-6 shrink-0';
    unitEl.style.color = 'var(--text-secondary)';
    unitEl.textContent = options.unit;
    row.appendChild(unitEl);
  }

  return row;
}

/**
 * 创建文本输入行
 */

/**
 * 创建下拉选择控制行
 *
 * @param label - 左侧标签文本
 * @param options - 选择配置（choices/value/onChange）
 * @returns 包含标签和下拉选择框的 DOM 行元素
 */
export function createSelectRow(
  label: string,
  options: {
    choices: Array<{ label: string; value: string }>;
    value: string;
    onChange?: (value: string) => void;
  }
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 py-1';
  row.dataset.testid = 'select-row';

  const selectId = `select-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;

  const labelEl = document.createElement('label');
  labelEl.htmlFor = selectId;
  labelEl.className = 'text-[12px] font-semibold shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.id = selectId;
  select.className = 'text-[11px] px-1 py-0.5 rounded flex-1 min-w-0';
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

  const onChange = () => { options.onChange?.(select.value); };
  select.addEventListener('change', onChange);

  row.append(labelEl, select);
  (row as unknown as HTMLElement & { dispose: () => void }).dispose = () => {
    select.removeEventListener('change', onChange);
  };
  return row;
}

/**
 * 创建按钮网格（用于预设场景）
 */

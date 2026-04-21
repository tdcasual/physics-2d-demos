/**
 * 创建文本输入控制行
 *
 * @param label - 左侧标签文本
 * @param options - 输入配置（value/role/fontFamily）
 * @param onChange - 文本变化回调
 * @returns 包含标签和文本输入框的 DOM 行元素
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
  const row = document.createElement('div');
  row.className = 'flex flex-col gap-1 py-1';

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

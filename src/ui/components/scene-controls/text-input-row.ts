/**
 * 创建文本输入控制行
 *
 * @param label - 左侧标签文本
 * @param options - 输入配置（value/role/fontFamily）
 * @param onChange - 文本变化回调
 * @returns 包含标签和文本输入框的 DOM 行元素
 */
import { withDispose, type DisposableElement } from './types';

export function createTextInputRow(
  label: string,
  options: {
    value: string;
    role?: string;
    fontFamily?: string;
  },
  onChange: (value: string) => void
): DisposableElement {
  const row = document.createElement('div');
  row.className = 'flex flex-col gap-1 py-1';

  const inputId = `text-input-${Math.random().toString(36).slice(2, 8)}`;

  const labelEl = document.createElement('label');
  labelEl.htmlFor = inputId;
  labelEl.className = 'text-[12px] font-semibold';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'text';
  input.value = options.value;
  if (options.role) input.dataset.role = options.role;
  input.className = 'w-full px-2 py-1 rounded text-[13px]';
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
  const onFocus = () => {
    input.style.borderColor = 'var(--accent-primary)';
    input.style.boxShadow = '0 0 0 3px var(--accent-primary-light)';
  };
  const onBlur = () => {
    input.style.borderColor = 'var(--border-color)';
    input.style.boxShadow = 'none';
  };
  const onChangeHandler = () => {
    onChange(input.value);
  };
  input.addEventListener('focus', onFocus);
  input.addEventListener('blur', onBlur);
  input.addEventListener('change', onChangeHandler);

  row.append(labelEl, input);
  return withDispose(row, () => {
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('change', onChangeHandler);
  });
}

/**
 * 创建删除按钮
 */

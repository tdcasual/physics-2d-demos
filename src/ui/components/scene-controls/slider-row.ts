/**
 * 创建滑块控制行
 *
 * @param label - 左侧标签文本
 * @param options - 滑块配置（min/max/step/value/unit/onChange）
 * @returns 包含标签、滑块和数值显示的 DOM 行元素
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
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 py-1';
  row.dataset.testid = 'slider-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'text-[12px] font-semibold w-16 shrink-0';
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
  valueEl.className = 'text-[11px] font-semibold w-10 text-right shrink-0';
  valueEl.style.color = 'var(--text-primary)';
  valueEl.textContent = options.value + (options.unit || '');

  const onInput = () => {
    const val = parseFloat(slider.value);
    valueEl.textContent = val + (options.unit || '');
    options.onChange?.(val);
  };
  slider.addEventListener('input', onInput);

  row.append(labelEl, slider, valueEl);
  (row as unknown as HTMLElement & { dispose: () => void }).dispose = () => {
    slider.removeEventListener('input', onInput);
  };
  return row;
}

/**
 * 创建选择器控制行
 */

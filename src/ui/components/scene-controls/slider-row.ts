/**
 * 创建滑块控制行
 *
 * @param label - 左侧标签文本
 * @param options - 滑块配置（min/max/step/value/unit/onChange）
 * @returns 包含标签、滑块和数值显示的 DOM 行元素
 */
import { withDispose, type DisposableElement } from './types';

let sliderIdCounter = 0;

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
): DisposableElement {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 py-1';
  row.dataset.testid = 'slider-row';

  const sliderId = `slider-row-${++sliderIdCounter}`;

  const labelEl = document.createElement('label');
  labelEl.htmlFor = sliderId;
  labelEl.className = 'text-[12px] font-semibold w-16 shrink-0';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = sliderId;
  slider.min = String(options.min);
  slider.max = String(options.max);
  slider.step = String(options.step);
  slider.value = String(options.value);
  // 轨道/thumb 伪元素样式见 src/styles/shared/scene-controls.css
  // （appearance 重置与命中区无法以内联样式表达）
  slider.className = 'slider-row-input flex-1 min-w-0 w-full cursor-pointer';

  const valueEl = document.createElement('span');
  valueEl.className = 'text-[12px] font-semibold w-10 text-right shrink-0';
  valueEl.style.color = 'var(--text-primary)';
  valueEl.textContent = options.value + (options.unit || '');

  const onInput = () => {
    const val = parseFloat(slider.value);
    valueEl.textContent = val + (options.unit || '');
    options.onChange?.(val);
  };
  slider.addEventListener('input', onInput);

  row.append(labelEl, slider, valueEl);
  return withDispose(row, () => {
    slider.removeEventListener('input', onInput);
  });
}

/**
 * 创建选择器控制行
 */

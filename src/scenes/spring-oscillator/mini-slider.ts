/**
 * 小型参数滑块组件 — 标签 + range input + 数值显示
 */

export function createMiniSlider(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  onChange: (val: number) => void
): { element: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  container.className = 'flex items-center flex-1 min-w-0';
  container.style.gap = '1px';
  container.style.minWidth = 'calc(120px * var(--ui-scale, 1))';

  // 标签 - 响应式字体（k, m等增大20%）
  const labelSpan = document.createElement('span');
  labelSpan.className = 'font-black shrink-0';
  labelSpan.style.fontSize = 'calc(17px * var(--ui-scale, 1))';
  labelSpan.style.color = 'var(--text-secondary)';
  labelSpan.style.minWidth = 'calc(18px * var(--ui-scale, 1))';
  labelSpan.style.textAlign = 'center';
  labelSpan.style.lineHeight = '1.1';
  labelSpan.textContent = label;

  // 滑块 - 响应式高度
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.setAttribute('aria-label', label);
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.style.height = 'calc(5px * var(--ui-scale, 1))';
  slider.style.accentColor = 'var(--accent-primary)';
  slider.style.flex = '1 1 0';
  slider.style.minWidth = 'calc(20px * var(--ui-scale, 1))';

  // 数值 - 响应式字体
  const valueSpan = document.createElement('span');
  valueSpan.className = 'font-bold shrink-0';
  valueSpan.style.fontSize = 'calc(14px * var(--ui-scale, 1))';
  valueSpan.style.color = 'var(--text-primary)';
  valueSpan.style.minWidth = 'calc(32px * var(--ui-scale, 1))';
  valueSpan.style.maxWidth = 'calc(40px * var(--ui-scale, 1))';
  valueSpan.style.textAlign = 'left';
  valueSpan.style.paddingLeft = '2px';
  valueSpan.style.lineHeight = '1.1';
  valueSpan.textContent = String(value) + (unit || '');

  function onInput() {
    valueSpan.textContent = slider.value + (unit || '');
  }
  function onSliderChange() {
    onChange(parseFloat(slider.value));
  }

  slider.addEventListener('input', onInput);
  slider.addEventListener('change', onSliderChange);

  container.append(labelSpan, slider, valueSpan);
  return {
    element: container,
    dispose() {
      slider.removeEventListener('input', onInput);
      slider.removeEventListener('change', onSliderChange);
    }
  };
}

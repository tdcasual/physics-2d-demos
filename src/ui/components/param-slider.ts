export function createParamSlider(
  label: string,
  options: {
    min: number;
    max: number;
    step?: number;
    value?: number;
    unit?: string;
    onChange?: (value: number) => void;
    compact?: boolean;
  }
): {
  element: HTMLElement;
  setValue: (value: number) => void;
  getValue: () => number;
} {
  const container = document.createElement('div');
  container.className = 'ctrl-param';

  if (options.compact) {
    container.style.cssText =
      'display: grid; grid-template-columns: auto 1fr auto; gap: 4px; align-items: center;';
  } else {
    container.style.cssText =
      'display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;';
  }

  const labelEl = document.createElement('label');
  labelEl.className = 'ctrl-param-label';
  labelEl.textContent = label;
  labelEl.style.cssText = options.compact
    ? 'font-size: 10px; color: var(--text-secondary); white-space: nowrap;'
    : 'font-size: 11px;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'ctrl-slider';
  slider.min = String(options.min);
  slider.max = String(options.max);
  slider.step = String(options.step ?? (options.max - options.min) / 100);
  slider.value = String(options.value ?? options.min);
  slider.style.cssText = 'width: 100%; height: 4px;';

  const valueEl = document.createElement('span');
  valueEl.className = 'ctrl-param-value';
  valueEl.style.cssText = options.compact
    ? 'font-size: 10px; min-width: 30px; text-align: right; font-family: monospace;'
    : 'font-size: 11px; font-family: monospace;';

  function formatValue(val: number): string {
    const str = Number(val).toFixed(
      options.step ? Math.ceil(-Math.log10(options.step)) : 2
    );
    return options.unit ? `${str}${options.unit}` : str;
  }

  function updateDisplay(): void {
    valueEl.textContent = formatValue(Number(slider.value));
  }

  slider.addEventListener('input', () => {
    updateDisplay();
    options.onChange?.(Number(slider.value));
  });

  container.appendChild(labelEl);
  container.appendChild(slider);
  container.appendChild(valueEl);

  updateDisplay();

  return {
    element: container,
    setValue: (value: number) => {
      slider.value = String(value);
      updateDisplay();
    },
    getValue: () => Number(slider.value)
  };
}

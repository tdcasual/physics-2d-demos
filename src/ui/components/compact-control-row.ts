export interface CompactControlRowOptions {
  color: string;
  params: Array<{
    key: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'danger' | 'default';
  }>;
}

export function createCompactControlRow(
  options: CompactControlRowOptions
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'ctrl-row-compact';
  row.style.cssText = `
    display: grid;
    grid-template-columns: 14px ${options.params.map(() => '1fr').join(' ')} ${options.actions ? 'auto' : ''};
    gap: 8px;
    align-items: center;
    padding: 5px 8px;
    background: var(--card-bg, rgba(255,255,255,0.05));
    border-radius: 6px;
    border-left: 4px solid ${options.color};
  `;

  // 颜色标识
  const colorDot = document.createElement('div');
  colorDot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${options.color};`;
  row.appendChild(colorDot);

  // 参数控件
  options.params.forEach((param) => {
    const paramEl = document.createElement('div');
    paramEl.style.cssText = 'display: flex; align-items: center; gap: 4px;';
    paramEl.innerHTML = `
      <span style="font-size: 9px; color: var(--text-secondary); flex-shrink: 0;">${param.label}</span>
      <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" 
             style="flex: 1; height: 4px; min-width: 30px;">
      <span style="font-size: 9px; min-width: 20px; text-align: right;">${param.value}</span>
    `;

    const slider = paramEl.querySelector('input')!;
    const valueSpan = paramEl.querySelector('span:last-child')!;

    slider.addEventListener('input', () => {
      valueSpan.textContent = slider.value;
    });

    slider.addEventListener('change', () => {
      param.onChange(parseFloat(slider.value));
    });

    row.appendChild(paramEl);
  });

  // 操作按钮
  if (options.actions) {
    const actionsEl = document.createElement('div');
    actionsEl.style.cssText = 'display: flex; gap: 4px;';
    options.actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.className =
        action.variant === 'danger' ? 'ctrl-btn-icon danger' : 'ctrl-btn-icon';
      btn.addEventListener('click', action.onClick);
      actionsEl.appendChild(btn);
    });
    row.appendChild(actionsEl);
  }

  return row;
}

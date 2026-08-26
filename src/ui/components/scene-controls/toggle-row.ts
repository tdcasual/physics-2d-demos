/**
 * 创建开关控制行
 *
 * @param label - 左侧标签文本
 * @param options - 开关配置（value/onChange）
 * @returns 包含标签和开关的 DOM 行元素
 */
import { withDispose, type DisposableElement } from './types';

let toggleIdCounter = 0;

export function createToggleRow(
  label: string,
  options: {
    value: boolean;
    onChange?: (value: boolean) => void;
  }
): DisposableElement {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-2 py-1';
  row.dataset.testid = 'toggle-row';

  const labelId = `toggle-label-${++toggleIdCounter}`;

  const labelEl = document.createElement('span');
  labelEl.id = labelId;
  labelEl.className = 'text-[12px] font-semibold';
  labelEl.style.color = 'var(--text-secondary)';
  labelEl.textContent = label;

  const track = document.createElement('button');
  track.type = 'button';
  track.role = 'switch';
  track.setAttribute('aria-checked', String(options.value));
  track.setAttribute('aria-labelledby', labelId);
  // toggle-switch-btn：::before 伪元素把命中区扩到 ≥44px
  // （样式见 src/styles/shared/scene-controls.css），视觉尺寸不变
  track.className =
    'toggle-switch-btn relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
  track.style.backgroundColor = options.value
    ? 'var(--accent-primary)'
    : 'var(--border-color)';

  const thumb = document.createElement('span');
  thumb.className =
    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out';
  thumb.style.transform = options.value
    ? 'translateX(16px)'
    : 'translateX(2px)';
  thumb.style.marginTop = '1.5px';

  track.appendChild(thumb);

  const onClick = () => {
    const next = track.getAttribute('aria-checked') !== 'true';
    track.setAttribute('aria-checked', String(next));
    track.style.backgroundColor = next
      ? 'var(--accent-primary)'
      : 'var(--border-color)';
    thumb.style.transform = next ? 'translateX(16px)' : 'translateX(2px)';
    options.onChange?.(next);
  };

  track.addEventListener('click', onClick);

  row.appendChild(labelEl);
  row.appendChild(track);

  return withDispose(row, () => {
    track.removeEventListener('click', onClick);
  });
}

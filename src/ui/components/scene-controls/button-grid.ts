/**
 * 创建按钮网格（用于预设选择等）
 *
 * @param buttons - 按钮列表（label/desc/onClick）
 * @param columns - 网格列数（默认 2）
 * @returns 按钮网格 DOM 元素
 */
import { withDispose, type DisposableElement } from './types';

export function createButtonGrid(
  buttons: Array<{
    label: string;
    desc?: string;
    onClick: () => void;
  }>,
  columns: 1 | 2 | 3 = 2
): DisposableElement {
  const grid = document.createElement('div');
  grid.className = `grid grid-cols-${columns} gap-2`;
  const cleanups: Array<() => void> = [];

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2.5',
      'rounded-lg cursor-pointer',
      'transition-all duration-200',
      'hover:-translate-y-px'
    ].join(' ');
    button.style.cssText = `
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
    `;

    const onEnter = () => {
      button.style.background = 'var(--btn-hover-bg)';
      button.style.borderColor = 'var(--accent-color)';
    };
    const onLeave = () => {
      button.style.background = 'var(--btn-bg)';
      button.style.borderColor = 'var(--border-color)';
    };
    button.addEventListener('mouseenter', onEnter);
    button.addEventListener('mouseleave', onLeave);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs font-semibold';
    labelSpan.style.color = 'var(--text-primary)';
    labelSpan.textContent = btn.label;

    if (btn.desc) {
      const descSpan = document.createElement('span');
      descSpan.className = 'text-[10px]';
      descSpan.style.color = 'var(--text-secondary)';
      descSpan.textContent = btn.desc;
      button.append(labelSpan, descSpan);
    } else {
      button.appendChild(labelSpan);
    }

    button.addEventListener('click', btn.onClick);
    cleanups.push(() => {
      button.removeEventListener('mouseenter', onEnter);
      button.removeEventListener('mouseleave', onLeave);
      button.removeEventListener('click', btn.onClick);
    });
    grid.appendChild(button);
  });

  return withDispose(grid, () => cleanups.forEach((c) => c()));
}

/**
 * 创建带激活状态的预设按钮组
 *
 * 适用于环境预设、场景预设等需要高亮当前选中项的控件。
 */

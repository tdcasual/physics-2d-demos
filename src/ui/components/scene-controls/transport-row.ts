/**
 * 创建运输控制行（播放/暂停/重置/单步）
 *
 * @param mount - 挂载容器
 * @param callbacks - 按钮点击回调
 * @returns 包含元素引用的控制器
 */
export function createTransportRow(
  mount: HTMLElement,
  callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onReset?: () => void;
    onStep?: () => void;
  }
): { element: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  container.className = 'grid grid-cols-4 gap-2';
  const cleanups: Array<() => void> = [];

  const buttons = [
    { icon: '▶', label: '播放', action: callbacks.onPlay },
    { icon: '⏸', label: '暂停', action: callbacks.onPause },
    { icon: '⏹', label: '重置', action: callbacks.onReset },
    { icon: '⏵', label: '单步', action: callbacks.onStep }
  ];

  buttons.forEach((btn) => {
    if (!btn.action) return;
    const action = btn.action;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'flex flex-col items-center gap-1',
      'px-2 py-2',
      'rounded-lg cursor-pointer',
      'transition-all'
    ].join(' ');
    button.style.cssText = `
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
    `;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'text-sm';
    iconSpan.textContent = btn.icon;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-[10px]';
    labelSpan.style.color = 'var(--text-secondary)';
    labelSpan.textContent = btn.label;
    button.append(iconSpan, labelSpan);
    const onEnter = () => {
      button.style.background = 'var(--btn-hover-bg)';
    };
    const onLeave = () => {
      button.style.background = 'var(--btn-bg)';
    };
    button.addEventListener('mouseenter', onEnter);
    button.addEventListener('mouseleave', onLeave);
    button.addEventListener('click', action);
    cleanups.push(() => {
      button.removeEventListener('mouseenter', onEnter);
      button.removeEventListener('mouseleave', onLeave);
      button.removeEventListener('click', action);
    });
    container.appendChild(button);
  });

  mount.appendChild(container);
  return { element: container, dispose: () => cleanups.forEach((c) => c()) };
}

/**
 * 创建场景/模式选择按钮列表
 *
 * 适用于 electrification、field-lines 等需要切换子场景的场景。
 */

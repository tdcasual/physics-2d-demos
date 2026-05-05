/**
 * 键盘快捷键帮助浮层
 *
 * 按 ? 键显示，Esc 或点击外部关闭。
 */

export type KeyboardHelpOverlay = {
  element: HTMLElement;
  show(): void;
  hide(): void;
  toggle(): void;
  dispose(): void;
};

const SHORTCUTS: Array<{ key: string; action: string }> = [
  { key: 'Space', action: '播放 / 暂停' },
  { key: 'R', action: '重置场景' },
  { key: 'T', action: '切换主题' },
  { key: '← / →', action: '单步后退 / 前进' },
  { key: 'A / D', action: '减慢 / 加快速度' },
  { key: 'F', action: '切换全屏' },
  { key: 'L', action: '切换布局' },
  { key: '?', action: '显示此帮助' },
  { key: 'Esc', action: '关闭帮助 / 退出演示模式' }
];

export function createKeyboardHelpOverlay(): KeyboardHelpOverlay {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-50 flex items-center justify-center hidden';
  overlay.style.background = 'rgba(0, 0, 0, 0.5)';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '键盘快捷键');

  const panel = document.createElement('div');
  panel.className = 'rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
  panel.style.background = 'var(--bg-primary, #fff)';
  panel.style.color = 'var(--text-primary, #000)';

  const title = document.createElement('h2');
  title.className = 'text-lg font-bold mb-4';
  title.textContent = '键盘快捷键';

  const grid = document.createElement('div');
  grid.className = 'grid gap-x-4 gap-y-2 text-sm';
  grid.style.gridTemplateColumns = 'auto 1fr';

  for (const s of SHORTCUTS) {
    const keyEl = document.createElement('kbd');
    keyEl.className = 'px-2 py-0.5 rounded font-mono text-xs border';
    keyEl.style.background = 'var(--bg-secondary, #f3f4f6)';
    keyEl.style.borderColor = 'var(--border-color, #d1d5db)';
    keyEl.style.color = 'var(--text-primary, #000)';
    keyEl.textContent = s.key;

    const descEl = document.createElement('span');
    descEl.textContent = s.action;

    grid.appendChild(keyEl);
    grid.appendChild(descEl);
  }

  const closeHint = document.createElement('p');
  closeHint.className = 'mt-4 text-xs text-center';
  closeHint.style.opacity = '0.6';
  closeHint.textContent = '按 Esc 或点击外部关闭';

  panel.appendChild(title);
  panel.appendChild(grid);
  panel.appendChild(closeHint);
  overlay.appendChild(panel);

  function show(): void {
    overlay.classList.remove('hidden');
  }

  function hide(): void {
    overlay.classList.add('hidden');
  }

  function toggle(): void {
    overlay.classList.toggle('hidden');
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  document.body.appendChild(overlay);

  return { element: overlay, show, hide, toggle, dispose: () => overlay.remove() };
}

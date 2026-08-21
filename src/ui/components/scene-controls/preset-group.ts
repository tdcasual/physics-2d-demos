/**
 * 创建预设按钮组
 *
 * @param mount - 挂载容器
 * @param presets - 预设列表（id/label/desc）
 * @param options - 配置（initialActive/columns/onSelect）
 * @returns 包含元素引用和 setActive 方法的控制器
 */
export function createPresetButtonGroup(
  mount: HTMLElement,
  presets: Array<{ id: string; label: string; desc?: string }>,
  options: {
    initialActive?: string;
    columns?: 2 | 3 | 4;
    onSelect: (id: string) => void;
  }
): {
  element: HTMLElement;
  setActive: (id: string) => void;
  dispose: () => void;
} {
  let activeId = options.initialActive ?? presets[0]?.id ?? '';

  const grid = document.createElement('div');
  const cols = options.columns ?? 4;
  grid.className =
    cols === 2
      ? 'grid grid-cols-2 gap-2'
      : cols === 3
        ? 'grid grid-cols-3 gap-2'
        : 'grid grid-cols-4 gap-2';
  grid.setAttribute('role', 'radiogroup');

  const buttons = new Map<string, HTMLButtonElement>();
  const clickHandlers = new Map<string, () => void>();

  function updateStyles() {
    buttons.forEach((btn, id) => {
      const isActive = id === activeId;
      btn.setAttribute('aria-checked', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      const labelSpan = btn.querySelector('span:first-child') as HTMLElement;
      if (labelSpan) {
        labelSpan.style.color = 'var(--text-primary)';
      }
      btn.style.background = isActive ? 'var(--btn-hover-bg)' : 'var(--btn-bg)';
      btn.style.borderColor = isActive
        ? 'var(--accent-primary)'
        : 'var(--border-color)';
    });
  }

  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'radio');
    btn.dataset.presetId = p.id;
    btn.className = [
      'flex flex-col items-center justify-center',
      'px-2 py-2',
      'rounded-lg cursor-pointer',
      'transition-all duration-200'
    ].join(' ');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs font-semibold';
    labelSpan.textContent = p.label;

    if (p.desc) {
      const descSpan = document.createElement('span');
      descSpan.className = 'text-[10px]';
      descSpan.style.color = 'var(--text-secondary)';
      descSpan.textContent = p.desc;
      btn.append(labelSpan, descSpan);
    } else {
      btn.appendChild(labelSpan);
    }

    const onClick = () => {
      activeId = p.id;
      updateStyles();
      options.onSelect(p.id);
    };
    clickHandlers.set(p.id, onClick);
    btn.addEventListener('click', onClick);

    buttons.set(p.id, btn);
    grid.appendChild(btn);
  });

  updateStyles();
  mount.appendChild(grid);

  return {
    element: grid,
    setActive: (id: string) => {
      if (buttons.has(id)) {
        activeId = id;
        updateStyles();
      }
    },
    dispose: () => {
      buttons.forEach((btn, id) => {
        const handler = clickHandlers.get(id);
        if (handler) btn.removeEventListener('click', handler);
      });
      buttons.clear();
      clickHandlers.clear();
    }
  };
}

/**
 * 创建运输控制按钮行（播放/暂停/重置/单步）
 */

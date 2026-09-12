/**
 * 创建预设按钮组
 *
 * @param mount - 挂载容器
 * @param presets - 预设列表（id/label/desc）
 * @param options - 配置（initialActive/columns/label/onSelect）
 * @returns 包含元素引用和 setActive 方法的控制器
 */
export function createPresetButtonGroup(
  mount: HTMLElement,
  presets: Array<{
    id: string;
    label: string;
    desc?: string;
    presentationLabel?: string;
  }>,
  options: {
    initialActive?: string;
    columns?: 2 | 3 | 4;
    /** radiogroup 的无障碍名称，通常取自字段/卡片标题 */
    label?: string;
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
  grid.setAttribute('aria-label', options.label ?? '预设选项');

  const buttons = new Map<string, HTMLButtonElement>();
  const clickHandlers = new Map<string, () => void>();
  const keyHandlers = new Map<string, (event: KeyboardEvent) => void>();

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
    labelSpan.dataset.standardLabel = p.label;
    if (p.presentationLabel) {
      labelSpan.dataset.presentationLabel = p.presentationLabel;
    }

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
    const onKeydown = (event: KeyboardEvent) => {
      const index = presets.findIndex((preset) => preset.id === p.id);
      if (index < 0) return;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % presets.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + presets.length) % presets.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = presets.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const next = presets[nextIndex];
      if (!next) return;
      activeId = next.id;
      updateStyles();
      buttons.get(next.id)?.focus();
      options.onSelect(next.id);
    };
    clickHandlers.set(p.id, onClick);
    keyHandlers.set(p.id, onKeydown);
    btn.addEventListener('click', onClick);
    btn.addEventListener('keydown', onKeydown);

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
        const keyHandler = keyHandlers.get(id);
        if (keyHandler) btn.removeEventListener('keydown', keyHandler);
      });
      buttons.clear();
      clickHandlers.clear();
      keyHandlers.clear();
    }
  };
}

/**
 * 创建运输控制按钮行（播放/暂停/重置/单步）
 */

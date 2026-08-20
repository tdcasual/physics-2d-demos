/**
 * 创建场景/模式选择按钮列表
 *
 * 适用于 electrification、field-lines 等需要切换子场景的场景。
 *
 * @param mount - 挂载容器
 * @param scenes - 场景选项列表（id/label/desc）
 * @param options - 配置（initialActive/onSelect）
 * @returns 包含元素引用和 setActive 方法的控制器
 */
export function createSceneSelector(
  mount: HTMLElement,
  scenes: Array<{ id: string; label: string; desc?: string }>,
  options: {
    initialActive?: string;
    onSelect: (id: string) => void;
  }
): {
  element: HTMLElement;
  setActive: (id: string) => void;
  dispose: () => void;
} {
  let activeId = scenes.some((scene) => scene.id === options.initialActive)
    ? (options.initialActive as string)
    : (scenes[0]?.id ?? '');
  const buttons = new Map<string, HTMLButtonElement>();
  const clickHandlers = new Map<string, () => void>();
  const keyHandlers = new Map<string, (event: KeyboardEvent) => void>();

  const container = document.createElement('div');
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', '场景选择');
  container.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--scene-selector-gap, 6px);';

  function updateStyles() {
    buttons.forEach((btn, id) => {
      const isActive = id === activeId;
      btn.setAttribute('aria-checked', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      btn.style.cssText = `
        width: 100%;
        padding: var(--scene-selector-padding, 12px 14px);
        background: ${isActive ? 'var(--accent-primary-light)' : 'var(--btn-bg)'};
        border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'};
        border-radius: 8px;
        color: var(--text-primary);
        font-size: var(--scene-selector-text-size, 13px);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        box-shadow: ${isActive ? '0 1px 3px var(--shadow-color)' : '0 1px 2px var(--shadow-color)'};
      `;
    });
  }

  scenes.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(s.id === activeId));
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = `font-weight: 600; font-size: var(--scene-selector-label-size, 14px);`;
    labelSpan.textContent = s.label;
    btn.appendChild(labelSpan);
    if (s.desc) {
      const descSpan = document.createElement('span');
      descSpan.style.cssText =
        'display: block; font-size: var(--scene-selector-desc-size, 11px); margin-top: 3px; color: var(--text-secondary);';
      descSpan.textContent = s.desc;
      btn.appendChild(descSpan);
    }
    const handler = () => {
      activeId = s.id;
      updateStyles();
      options.onSelect(s.id);
    };
    const keyHandler = (event: KeyboardEvent) => {
      const index = scenes.findIndex((scene) => scene.id === s.id);
      if (index < 0) return;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % scenes.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + scenes.length) % scenes.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = scenes.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const next = scenes[nextIndex];
      if (!next) return;
      activeId = next.id;
      updateStyles();
      buttons.get(next.id)?.focus();
      options.onSelect(next.id);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('keydown', keyHandler);
    clickHandlers.set(s.id, handler);
    keyHandlers.set(s.id, keyHandler);
    buttons.set(s.id, btn);
    container.appendChild(btn);
  });

  updateStyles();
  mount.appendChild(container);

  return {
    element: container,
    setActive: (id: string) => {
      if (buttons.has(id)) {
        activeId = id;
        updateStyles();
      }
    },
    dispose() {
      buttons.forEach((btn, id) => {
        const handler = clickHandlers.get(id);
        if (handler) btn.removeEventListener('click', handler);
        const keyHandler = keyHandlers.get(id);
        if (keyHandler) btn.removeEventListener('keydown', keyHandler);
      });
      clickHandlers.clear();
      keyHandlers.clear();
      buttons.clear();
    }
  };
}

/**
 * 创建数字输入行
 */

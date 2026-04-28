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
): { element: HTMLElement; setActive: (id: string) => void } {
  let activeId = options.initialActive ?? scenes[0]?.id ?? '';
  const buttons = new Map<string, HTMLButtonElement>();

  const container = document.createElement('div');
  container.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px;';

  function updateStyles() {
    buttons.forEach((btn, id) => {
      const isActive = id === activeId;
      btn.style.cssText = `
        width: 100%;
        padding: 12px 14px;
        background: ${isActive ? 'var(--accent-primary-light, rgba(79,70,229,0.1))' : 'var(--btn-bg, #ffffff)'};
        border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'};
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        box-shadow: ${isActive ? '0 1px 3px rgba(79,70,229,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'};
      `;
    });
  }

  scenes.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'font-weight: 600; font-size: 14px;';
    labelSpan.textContent = s.label;
    btn.appendChild(labelSpan);
    if (s.desc) {
      const descSpan = document.createElement('span');
      descSpan.style.cssText =
        'display: block; font-size: 11px; margin-top: 3px; color: var(--text-secondary);';
      descSpan.textContent = s.desc;
      btn.appendChild(descSpan);
    }
    btn.addEventListener('click', () => {
      activeId = s.id;
      updateStyles();
      options.onSelect(s.id);
    });
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
    }
  };
}

/**
 * 创建数字输入行
 */

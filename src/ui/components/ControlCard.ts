/**
 * ControlCard - 弹簧振子风格（白色清爽）
 */

export interface ControlCardOptions {
  className?: string;
  defaultCollapsed?: boolean;
  icon?: string;
  headerActions?: HTMLElement[];
}

export interface ControlCardInstance {
  element: HTMLElement;
  body: HTMLElement;
  header: HTMLElement;
  setCollapsed: (collapsed: boolean) => void;
}

/**
 * 创建控制卡片 - 弹簧振子风格
 */
export function createControlCard(
  title: string,
  options?: ControlCardOptions
): ControlCardInstance {
  // 卡片容器 - 使用主题变量
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
  `;
  
  if (options?.className) {
    card.className = options.className;
  }
  
  if (options?.defaultCollapsed) {
    card.classList.add('collapsed');
  }

  // 头部
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    user-select: none;
  `;

  // 标题
  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    white-space: nowrap;
  `;
  
  if (options?.icon) {
    titleEl.innerHTML = `<span style="width:16px;height:16px;opacity:0.7">${options.icon}</span>${title}`;
  } else {
    titleEl.textContent = title;
  }

  header.appendChild(titleEl);

  // 操作按钮容器
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

  // 插入自定义操作按钮 - 使用主题变量
  if (options?.headerActions) {
    options.headerActions.forEach(btn => {
      btn.style.cssText = `
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: var(--shadow-sm);
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.filter = 'brightness(1.1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.filter = 'none';
      });
      actionsContainer.appendChild(btn);
    });
  }

  // 折叠按钮
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.style.cssText = `
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 4px;
  `;
  toggle.innerHTML = options?.defaultCollapsed ? '▶' : '▼';
  toggle.setAttribute('aria-label', options?.defaultCollapsed ? '展开' : '折叠');
  toggle.addEventListener('mouseenter', () => {
    toggle.style.background = 'var(--border-light)';
  });
  toggle.addEventListener('mouseleave', () => {
    toggle.style.background = 'transparent';
  });

  actionsContainer.appendChild(toggle);
  header.appendChild(actionsContainer);

  // 内容区域
  const body = document.createElement('div');
  body.style.cssText = `
    padding: 14px;
    display: ${options?.defaultCollapsed ? 'none' : 'flex'};
    flex-direction: column;
    gap: 10px;
  `;

  card.appendChild(header);
  card.appendChild(body);

  // 点击头部折叠/展开
  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button') !== toggle) {
      return;
    }
    const isCollapsed = card.classList.toggle('collapsed');
    toggle.innerHTML = isCollapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', isCollapsed ? '展开' : '折叠');
    body.style.display = isCollapsed ? 'none' : 'flex';
  });

  function setCollapsed(collapsed: boolean): void {
    card.classList.toggle('collapsed', collapsed);
    toggle.innerHTML = collapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', collapsed ? '展开' : '折叠');
    body.style.display = collapsed ? 'none' : 'flex';
  }

  return { element: card, body, header, setCollapsed };
}

/**
 * ControlCard - 弹簧振子风格（白色清爽）
 */

export interface ControlCardOptions {
  className?: string;
  defaultCollapsed?: boolean;
  icon?: string;
  headerActions?: HTMLElement[];
  /** 设为 'full' 则在多列控制区布局中强制占满整行（含滑块或长文本的卡片应设置） */
  span?: 'full';
}

export interface ControlCardInstance {
  element: HTMLElement;
  body: HTMLElement;
  header: HTMLElement;
  setCollapsed: (collapsed: boolean) => void;
  dispose: () => void;
}

/** 卡片计数器，用于生成折叠按钮 aria-controls 指向的唯一内容区 id */
let controlCardSeq = 0;

/**
 * 创建控制卡片 - 弹簧振子风格
 */
export function createControlCard(
  title: string,
  options?: ControlCardOptions
): ControlCardInstance {
  const cleanups: Array<() => void> = [];
  // 卡片容器 - 使用主题变量
  const card = document.createElement('div');
  card.dataset.testid = 'control-card';
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

  if (options?.span === 'full') {
    card.dataset.span = 'full';
  }

  // 头部 - 极致紧凑，高分屏适配
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(6px * var(--ui-scale, 1)) calc(10px * var(--ui-scale, 1));
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    user-select: none;
    min-height: calc(32px * var(--ui-scale, 1));
  `;

  // 标题 - 响应式字体（移动端适当缩小）
  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: calc(13px * var(--ui-scale, 1));
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    white-space: nowrap;
  `;

  if (options?.icon) {
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'width:16px;height:16px;opacity:0.7';
    iconSpan.textContent = options.icon;
    titleEl.appendChild(iconSpan);
    titleEl.appendChild(document.createTextNode(title));
  } else {
    titleEl.textContent = title;
  }

  header.appendChild(titleEl);

  // 操作按钮容器
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText =
    'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

  // 插入自定义操作按钮 - 使用主题变量，高分屏适配
  if (options?.headerActions) {
    options.headerActions.forEach((btn) => {
      btn.style.cssText = `
        padding: calc(4px * var(--ui-scale, 1)) calc(10px * var(--ui-scale, 1));
        font-size: calc(12px * var(--ui-scale, 1));
        font-weight: 500;
        background: var(--accent-primary);
        color: var(--accent-contrast);
        border: none;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: var(--shadow-sm);
        min-height: calc(28px * var(--ui-scale, 1));
      `;
      const onEnter = () => {
        btn.style.filter = 'brightness(1.1)';
      };
      const onLeave = () => {
        btn.style.filter = 'none';
      };
      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        btn.removeEventListener('mouseenter', onEnter);
        btn.removeEventListener('mouseleave', onLeave);
      });
      actionsContainer.appendChild(btn);
    });
  }

  // 折叠按钮 - 高分屏适配
  // 视觉尺寸 22px；命中区通过 .card-toggle-btn::before 伪元素扩到 44px
  // （见 styles/shared/scene-controls.css），不占用布局空间
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.dataset.testid = 'card-toggle';
  toggle.className = 'card-toggle-btn';
  toggle.style.cssText = `
    position: relative;
    width: calc(22px * var(--ui-scale, 1));
    height: calc(22px * var(--ui-scale, 1));
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: calc(13px * var(--ui-scale, 1));
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 4px;
  `;
  toggle.textContent = options?.defaultCollapsed ? '▶' : '▼';
  toggle.setAttribute(
    'aria-label',
    options?.defaultCollapsed ? '展开' : '折叠'
  );
  toggle.setAttribute('aria-expanded', String(!options?.defaultCollapsed));
  const onToggleEnter = () => {
    toggle.style.background = 'var(--border-light)';
  };
  const onToggleLeave = () => {
    toggle.style.background = 'transparent';
  };
  toggle.addEventListener('mouseenter', onToggleEnter);
  toggle.addEventListener('mouseleave', onToggleLeave);
  cleanups.push(() => {
    toggle.removeEventListener('mouseenter', onToggleEnter);
    toggle.removeEventListener('mouseleave', onToggleLeave);
  });

  actionsContainer.appendChild(toggle);
  header.appendChild(actionsContainer);

  // 内容区域 - 极致紧凑，高分屏适配
  const body = document.createElement('div');
  body.id = `control-card-body-${++controlCardSeq}`;
  body.style.cssText = `
    padding: calc(4px * var(--ui-scale, 1)) calc(6px * var(--ui-scale, 1));
    display: ${options?.defaultCollapsed ? 'none' : 'flex'};
    flex-direction: column;
    gap: calc(4px * var(--ui-scale, 1));
  `;
  toggle.setAttribute('aria-controls', body.id);

  card.appendChild(header);
  card.appendChild(body);

  // 整个头部都可点击折叠；点击 headerActions 中的其他按钮时不触发
  const onHeaderClick = (e: MouseEvent) => {
    const clickedButton = (e.target as HTMLElement).closest('button');
    if (clickedButton && clickedButton !== toggle) return;
    setCollapsed(!card.classList.contains('collapsed'));
  };
  header.addEventListener('click', onHeaderClick);
  cleanups.push(() => header.removeEventListener('click', onHeaderClick));

  function setCollapsed(collapsed: boolean): void {
    card.classList.toggle('collapsed', collapsed);
    toggle.textContent = collapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', collapsed ? '展开' : '折叠');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    body.style.display = collapsed ? 'none' : 'flex';
  }

  return {
    element: card,
    body,
    header,
    setCollapsed,
    dispose: () => cleanups.forEach((c) => c())
  };
}

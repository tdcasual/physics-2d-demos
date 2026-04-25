/**
 * 浮动控制组件工具函数
 */

// 模块级按钮清理函数存储（避免 any 类型断言）
export const buttonDisposers = new WeakMap<HTMLButtonElement, () => void>();

// 检测移动设备
export function isMobileDevice(): boolean {
  return window.innerWidth < 768;
}

// 获取设备类型
export function getDeviceType(): 'mobile' | 'desktop' {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

interface ButtonOptions {
  title: string;
  content?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  color?: string;
  onClick: () => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = options.title;
  if (options.content) btn.textContent = options.content;
  btn.style.cssText = `
    width: ${options.width || 'auto'};
    height: ${options.height || 'auto'};
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    background: var(--btn-bg, rgba(255, 255, 255, 0.1));
    color: ${options.color || 'var(--text-primary, #fff)'};
    font-size: ${options.fontSize || '14px'};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
  `;

  const onClick = options.onClick;
  const onMouseEnter = () => {
    btn.style.background = 'var(--btn-hover-bg, rgba(255, 255, 255, 0.2))';
    btn.style.transform = 'translateY(-1px)';
  };
  const onMouseLeave = () => {
    btn.style.background = 'var(--btn-bg, rgba(255, 255, 255, 0.1))';
    btn.style.transform = 'none';
  };

  btn.addEventListener('click', onClick);
  btn.addEventListener('mouseenter', onMouseEnter);
  btn.addEventListener('mouseleave', onMouseLeave);

  // 注册按钮清理函数
  buttonDisposers.set(btn, () => {
    btn.removeEventListener('click', onClick);
    btn.removeEventListener('mouseenter', onMouseEnter);
    btn.removeEventListener('mouseleave', onMouseLeave);
  });

  return btn;
}

// 初始化拖拽
export function initDrag(element: HTMLElement): () => void {
  let isDragging = false;
  let startX = 0,
    startY = 0,
    initialLeft = 0,
    initialTop = 0;

  function onMouseDown(e: MouseEvent) {
    // 只有直接点击容器时才拖拽
    if (e.target !== element) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;
    element.style.transition = 'none';
    element.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    element.style.left = `${initialLeft + e.clientX - startX}px`;
    element.style.top = `${initialTop + e.clientY - startY}px`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    element.style.transition = '';
    element.style.cursor = '';
    document.body.style.userSelect = '';
  }

  element.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    element.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

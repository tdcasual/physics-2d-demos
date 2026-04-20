/**
 * UI Components - Tailwind 版本
 * 基于弹簧振子场景提炼的通用组件库
 */

export {
  createControlCard,
  type ControlCardOptions,
  type ControlCardInstance
} from './ControlCard';

/**
 * 通用样式工具类
 */
/**
 * Tailwind 主题样式工具类
 * 与 teaching-shell.css 的 @theme 配置保持一致
 */
export const styles = {
  // 按钮样式
  btn: {
    base: 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
    primary: 'bg-accent-primary text-text-inverse hover:brightness-110',
    secondary:
      'bg-btn-bg text-text-primary border border-border-color hover:bg-btn-hover-bg',
    ghost: 'bg-transparent text-text-secondary hover:bg-btn-bg'
  },

  // 卡片样式
  card: {
    base: 'bg-bg-card border border-border-color rounded-lg overflow-hidden',
    hover: 'hover:border-accent-color hover:shadow-md'
  },

  // 输入框样式
  input: {
    range:
      'w-full h-1 bg-border-color accent-coral rounded-lg appearance-none cursor-pointer',
    select:
      'text-xs px-1 py-0.5 rounded border border-border-color bg-bg-card text-text-primary'
  },

  // 布局样式
  layout: {
    row: 'flex items-center gap-2',
    col: 'flex flex-col gap-2',
    grid2: 'grid grid-cols-2 gap-2'
  },

  // 文本样式
  text: {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    muted: 'text-text-muted text-[10px]',
    label: 'text-[13px] font-semibold text-text-secondary'
  }
};

// 辅助函数：应用按钮样式（包含事件监听）
export function applyButtonHover(element: HTMLElement): void {
  element.addEventListener('mouseenter', () => {
    element.classList.add('bg-btn-hover-bg');
  });
  element.addEventListener('mouseleave', () => {
    element.classList.remove('bg-btn-hover-bg');
  });
}

/**
 * 工具函数：批量添加样式
 */
export function addClasses(element: HTMLElement, classes: string): void {
  const classList = classes.split(' ').filter(Boolean);
  element.classList.add(...classList);
}

/**
 * 工具函数：创建带样式的元素
 */
export function createElement(
  tag: string,
  classes: string,
  options?: {
    text?: string;
    html?: string;
    attrs?: Record<string, string>;
    style?: Record<string, string>;
  }
): HTMLElement {
  const el = document.createElement(tag);
  addClasses(el, classes);

  if (options?.text) el.textContent = options.text;
  if (options?.html) el.innerHTML = options.html;
  if (options?.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  if (options?.style) {
    Object.entries(options.style).forEach(([key, value]) => {
      (el.style as unknown as Record<string, string>)[key] = value;
    });
  }

  return el;
}

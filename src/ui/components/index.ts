/**
 * UI Components - Tailwind 版本
 * 基于弹簧振子场景提炼的通用组件库
 */

export { createControlCard, type ControlCardOptions, type ControlCardInstance } from './ControlCard';

/**
 * 通用样式工具类
 */
// 使用CSS变量的样式（与主题系统一致）
export function getThemeStyles() {
  return {
    // 按钮样式 - 基础类名
    btn: {
      base: 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
      primary: 'bg-coral text-white hover:brightness-110',
      // secondary和ghost现在需要通过applyThemeButton函数应用
    },
    
    // 布局样式（纯布局，无颜色）
    layout: {
      row: 'flex items-center gap-2',
      col: 'flex flex-col gap-2',
      grid2: 'grid grid-cols-2 gap-2',
    },
  };
}

/**
 * 应用主题按钮样式到元素
 */
export function applyThemeButton(
  element: HTMLElement, 
  variant: 'primary' | 'secondary' | 'ghost' = 'secondary'
): void {
  const baseClasses = 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer';
  element.className = baseClasses;
  
  switch (variant) {
    case 'primary':
      element.style.cssText = `
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
      `;
      break;
    case 'secondary':
      element.style.cssText = `
        background: var(--btn-bg);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      `;
      element.addEventListener('mouseenter', () => {
        element.style.background = 'var(--btn-hover-bg)';
      });
      element.addEventListener('mouseleave', () => {
        element.style.background = 'var(--btn-bg)';
      });
      break;
    case 'ghost':
      element.style.cssText = `
        background: transparent;
        color: var(--text-secondary);
        border: none;
      `;
      element.addEventListener('mouseenter', () => {
        element.style.background = 'var(--btn-bg)';
      });
      element.addEventListener('mouseleave', () => {
        element.style.background = 'transparent';
      });
      break;
  }
}

/**
 * 应用主题卡片样式到元素
 */
export function applyThemeCard(element: HTMLElement): void {
  element.className = 'rounded-lg overflow-hidden';
  element.style.cssText = `
    background: var(--bg-card);
    border: 1px solid var(--border-color);
  `;
}

/**
 * 应用主题输入框样式到元素
 */
export function applyThemeInput(
  element: HTMLInputElement | HTMLSelectElement,
  type: 'range' | 'select' = 'select'
): void {
  if (type === 'range') {
    element.className = 'w-full h-1 rounded-lg appearance-none cursor-pointer';
    element.style.cssText = `
      background: var(--border-color);
      accent-color: var(--accent-primary);
    `;
  } else {
    element.className = 'text-xs px-1 py-0.5 rounded';
    element.style.cssText = `
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-primary);
    `;
  }
}

/**
 * 应用主题文本样式到元素
 */
export function applyThemeText(
  element: HTMLElement,
  variant: 'primary' | 'secondary' | 'muted' | 'label' = 'primary'
): void {
  const sizeClasses = {
    primary: 'text-sm',
    secondary: 'text-sm',
    muted: 'text-[10px]',
    label: 'text-[13px] font-semibold',
  };
  
  element.className = sizeClasses[variant];
  
  const colors = {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    label: 'var(--text-secondary)',
  };
  
  element.style.color = colors[variant];
}

// 保留旧的styles对象以兼容现有代码（已弃用，建议迁移到上面的函数）
export const styles = {
  btn: {
    base: 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
    primary: 'bg-coral text-white hover:brightness-110',
    secondary: '',
    ghost: '',
  },
  card: { base: '', hover: '' },
  input: { range: '', select: '' },
  layout: { row: 'flex items-center gap-2', col: 'flex flex-col gap-2', grid2: 'grid grid-cols-2 gap-2' },
  text: { primary: '', secondary: '', muted: '', label: '' },
};

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
      el.style[key as any] = value;
    });
  }
  
  return el;
}

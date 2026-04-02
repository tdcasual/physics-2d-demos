/**
 * UI Components - Tailwind 版本
 * 基于弹簧振子场景提炼的通用组件库
 */

export { createControlCard, type ControlCardOptions, type ControlCardInstance } from './ControlCard';

/**
 * 通用样式工具类
 */
export const styles = {
  // 按钮样式
  btn: {
    base: 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
    primary: 'bg-coral text-white hover:brightness-110',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600',
    ghost: 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
  },
  
  // 卡片样式
  card: {
    base: 'bg-white/5 dark:bg-slate-800/60 border border-slate-200/10 dark:border-slate-400/10 rounded-lg overflow-hidden',
    hover: 'hover:border-teal-400 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
  },
  
  // 输入框样式
  input: {
    range: 'w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer',
    select: 'text-xs px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  },
  
  // 布局样式
  layout: {
    row: 'flex items-center gap-2',
    col: 'flex flex-col gap-2',
    grid2: 'grid grid-cols-2 gap-2',
  },
  
  // 文本样式
  text: {
    primary: 'text-slate-900 dark:text-slate-100',
    secondary: 'text-slate-500 dark:text-slate-400',
    muted: 'text-slate-400 dark:text-slate-500 text-[10px]',
    label: 'text-[13px] font-semibold text-slate-500 dark:text-slate-400',
  },
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

/**
 * 创建删除按钮（✕）
 *
 * @param onClick - 点击回调
 * @returns 删除按钮 DOM 元素
 */
export function createDeleteButton(onClick: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.className = [
    'w-5 h-5',
    'flex items-center justify-center',
    'text-coral hover:bg-coral/10',
    'rounded cursor-pointer',
    'transition-colors'
  ].join(' ');
  btn.textContent = '✕';
  btn.title = '删除';

  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * 读数面板拖拽功能
 * 将元素变为可拖拽，支持边界约束
 */

/**
 * 使元素可拖拽
 * @param element - 要拖拽的元素
 * @param handle - 拖拽手柄（通常是 header）
 * @returns 清理函数（移除事件监听器）
 */
export function makeElementDraggable(
  element: HTMLElement,
  handle: HTMLElement | null
): () => void {
  if (!handle) return () => {};

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.style.cursor = 'move';

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const computedStyle = window.getComputedStyle(element);
    const currentLeft = parseFloat(computedStyle.left) || 0;
    const currentTop = parseFloat(computedStyle.top) || 0;

    if (computedStyle.right !== 'auto') {
      const parentRect = element.offsetParent?.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      if (parentRect) {
        initialLeft = elemRect.left - parentRect.left;
        initialTop = elemRect.top - parentRect.top;
      } else {
        initialLeft = currentLeft;
        initialTop = currentTop;
      }
    } else {
      initialLeft = currentLeft;
      initialTop = currentTop;
    }

    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transition = 'none';
    document.body.style.userSelect = 'none';

    e.preventDefault();
    e.stopPropagation();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let nextLeft = initialLeft + dx;
    let nextTop = initialTop + dy;

    const parent = element.offsetParent as HTMLElement | null;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      nextLeft = Math.max(
        0,
        Math.min(nextLeft, parentRect.width - elemRect.width)
      );
      nextTop = Math.max(
        0,
        Math.min(nextTop, parentRect.height - elemRect.height)
      );
    }

    element.style.left = `${nextLeft}px`;
    element.style.top = `${nextTop}px`;
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  };

  handle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    handle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

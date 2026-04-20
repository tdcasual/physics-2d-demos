/**
 * 通用拖拽工具
 *
 * 使元素可拖拽，支持指定拖拽手柄。
 */
export function makeDraggable(
  element: HTMLElement,
  handle?: HTMLElement
): () => void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const dragHandle = handle || element;
  dragHandle.style.cursor = 'move';

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;

    element.style.transition = 'none';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    element.style.left = `${initialLeft + dx}px`;
    element.style.top = `${initialTop + dy}px`;
    element.style.right = 'auto';
  }

  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  }

  dragHandle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // 返回清理函数
  return () => {
    dragHandle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

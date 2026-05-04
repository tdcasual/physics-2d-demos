/**
 * 通用拖拽工具
 *
 * 使元素可拖拽，支持指定拖拽手柄。
 * 使用 Pointer Events API 统一鼠标和触摸输入。
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
  dragHandle.style.touchAction = 'none';

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;

    element.style.transition = 'none';
    document.body.style.userSelect = 'none';
    dragHandle.setPointerCapture(e.pointerId);

    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    element.style.left = `${initialLeft + dx}px`;
    element.style.top = `${initialTop + dy}px`;
    element.style.right = 'auto';
  }

  function onPointerUp() {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  }

  dragHandle.addEventListener('pointerdown', onPointerDown);
  dragHandle.addEventListener('pointermove', onPointerMove);
  dragHandle.addEventListener('pointerup', onPointerUp);
  dragHandle.addEventListener('pointercancel', onPointerUp);

  // 返回清理函数
  return () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
    dragHandle.removeEventListener('pointerdown', onPointerDown);
    dragHandle.removeEventListener('pointermove', onPointerMove);
    dragHandle.removeEventListener('pointerup', onPointerUp);
    dragHandle.removeEventListener('pointercancel', onPointerUp);
  };
}

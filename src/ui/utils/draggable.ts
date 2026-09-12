/**
 * 通用拖拽工具
 *
 * 使元素可拖拽，支持指定拖拽手柄。
 * 使用 Pointer Events API 统一鼠标和触摸输入。
 */
export function makeDraggable(
  element: HTMLElement,
  handle?: HTMLElement,
  options: { clampToParent?: boolean } = {}
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
    if (
      (e.target as HTMLElement).closest(
        'button, a, input, select, textarea, [role="button"]'
      )
    )
      return;
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

    let nextLeft = initialLeft + dx;
    let nextTop = initialTop + dy;
    if (options.clampToParent) {
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
    }

    element.style.left = `${nextLeft}px`;
    element.style.top = `${nextTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
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

export function makeResizable(
  element: HTMLElement,
  options: {
    minWidth?: number;
    minHeight?: number;
    onResize?: () => void;
  } = {}
): () => void {
  const minWidth = options.minWidth ?? 220;
  const minHeight = options.minHeight ?? 140;
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'lab-float-resize';
  handle.setAttribute('aria-label', '调整面板大小');
  handle.tabIndex = 0;
  element.appendChild(handle);

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = element.getBoundingClientRect().width;
    startH = element.getBoundingClientRect().height;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return;
    const width = Math.max(minWidth, startW + (e.clientX - startX));
    const height = Math.max(minHeight, startH + (e.clientY - startY));
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.maxHeight = 'none';
    options.onResize?.();
  }

  function onPointerUp(): void {
    if (!dragging) return;
    dragging = false;
    options.onResize?.();
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);

  return () => {
    dragging = false;
    handle.removeEventListener('pointerdown', onPointerDown);
    handle.removeEventListener('pointermove', onPointerMove);
    handle.removeEventListener('pointerup', onPointerUp);
    handle.removeEventListener('pointercancel', onPointerUp);
    handle.remove();
  };
}

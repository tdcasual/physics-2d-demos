/**
 * 高精度干涉测微仪 — 交互事件绑定（逐字搬移自原 instrument.view.ts）
 *
 * 拖拽/滚轮/键盘处理器及其私有状态（isDragging、startX/Y、sysDragging 等）
 * 原本就是工厂闭包内仅交互层使用的变量，现随处理器一并搬入本模块闭包。
 */

import type {
  MicrometerConfig,
  MicrometerElements,
  MicrometerViewState
} from './types';

/**
 * 绑定全部交互事件，返回解绑函数（供 dispose 调用，移除逻辑与原 dispose 一致）。
 */
export function bindInteractions(options: {
  viewState: MicrometerViewState;
  config: MicrometerConfig;
  elements: Pick<MicrometerElements, 'thimbleGroup' | 'caseEl' | 'systemEl'>;
  renderView: () => void;
  emitReading: () => void;
}): () => void {
  const { viewState, config, elements, renderView, emitReading } = options;
  const { thimbleGroup, caseEl, systemEl } = elements;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startReading = 0;
  // 整体仪器拖拽状态
  let sysDragging = false;
  let sysStartX = 0;
  let sysStartY = 0;

  // ── 统一交互事件处理 ──
  const handleDragStart = (clientX: number, clientY: number) => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    startReading = viewState.currentReading;
    thimbleGroup.style.cursor = 'grabbing';
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const deltaReadingX = (deltaX / 1.8 / config.tickGapX) * 0.5;
    const deltaReadingY = (deltaY / 1.8 / config.tickGapY) * 0.01;
    const newReading = Math.max(
      0,
      Math.min(startReading + deltaReadingX + deltaReadingY, config.maxReading)
    );
    if (newReading !== viewState.currentReading) {
      viewState.currentReading = newReading;
      renderView();
      emitReading();
    }
  };

  const handleDragEnd = () => {
    isDragging = false;
    thimbleGroup.style.cursor = 'grab';
  };

  function isNarrowHost(): boolean {
    return (
      caseEl.closest('.micrometer-root')?.classList.contains('is-narrow') ===
      true
    );
  }

  // ── 整体仪器拖拽（拖动目镜）──
  const handleSysDragStart = (clientX: number, clientY: number) => {
    sysDragging = true;
    sysStartX = clientX;
    sysStartY = clientY;
    caseEl.style.cursor = 'grabbing';
  };

  const handleSysDragMove = (clientX: number, clientY: number) => {
    if (!sysDragging) return;
    viewState.sysX += clientX - sysStartX;
    viewState.sysY += clientY - sysStartY;
    sysStartX = clientX;
    sysStartY = clientY;
    systemEl.style.transform = `translate(${viewState.sysX}px, ${viewState.sysY}px) scale(${viewState.systemScale})`;
  };

  const handleSysDragEnd = () => {
    sysDragging = false;
    caseEl.style.cursor = 'grab';
  };

  const onMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleDragStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) handleDragMove(e.clientX, e.clientY);
    if (sysDragging) handleSysDragMove(e.clientX, e.clientY);
  };
  const onMouseUp = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  const onCaseMouseDown = (e: MouseEvent) => {
    if (isNarrowHost()) return;
    e.stopPropagation();
    handleSysDragStart(e.clientX, e.clientY);
  };
  const onCaseTouchStart = (e: TouchEvent) => {
    if (isNarrowHost()) return;
    e.stopPropagation();
    handleSysDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    if (sysDragging) {
      e.preventDefault();
      handleSysDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchEnd = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newReading = Math.max(
      0,
      Math.min(
        viewState.currentReading + (e.deltaY > 0 ? 0.01 : -0.01),
        config.maxReading
      )
    );
    if (newReading !== viewState.currentReading) {
      viewState.currentReading = newReading;
      renderView();
      emitReading();
    }
  };

  const onThimbleKeyDown = (e: KeyboardEvent) => {
    let delta = 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = 0.01;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -0.01;
        break;
      case 'PageUp':
        delta = 0.1;
        break;
      case 'PageDown':
        delta = -0.1;
        break;
      case 'Home':
        delta = -viewState.currentReading;
        break;
      case 'End':
        delta = config.maxReading - viewState.currentReading;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = Math.max(
      0,
      Math.min(viewState.currentReading + delta, config.maxReading)
    );
    if (next !== viewState.currentReading) {
      viewState.currentReading = next;
      renderView();
      emitReading();
      thimbleGroup.setAttribute(
        'aria-valuenow',
        viewState.currentReading.toFixed(3)
      );
      thimbleGroup.setAttribute(
        'aria-valuetext',
        `${viewState.currentReading.toFixed(3)} mm`
      );
    }
  };

  const onCaseKeyDown = (e: KeyboardEvent) => {
    const step2 = 30;
    switch (e.key) {
      case 'ArrowRight':
        viewState.sysX += step2;
        break;
      case 'ArrowLeft':
        viewState.sysX -= step2;
        break;
      case 'ArrowUp':
        viewState.sysY -= step2;
        break;
      case 'ArrowDown':
        viewState.sysY += step2;
        break;
      default:
        return;
    }
    e.preventDefault();
    systemEl.style.transform = `translate(${viewState.sysX}px, ${viewState.sysY}px) scale(${viewState.systemScale})`;
  };

  thimbleGroup.addEventListener('mousedown', onMouseDown);
  caseEl.addEventListener('mousedown', onCaseMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  thimbleGroup.addEventListener('touchstart', onTouchStart, { passive: false });
  caseEl.addEventListener('touchstart', onCaseTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  thimbleGroup.addEventListener('wheel', onWheel, { passive: false });
  thimbleGroup.addEventListener('keydown', onThimbleKeyDown);
  caseEl.addEventListener('keydown', onCaseKeyDown);

  return () => {
    thimbleGroup.removeEventListener('mousedown', onMouseDown);
    caseEl.removeEventListener('mousedown', onCaseMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    thimbleGroup.removeEventListener('touchstart', onTouchStart, {
      passive: false
    } as EventListenerOptions);
    caseEl.removeEventListener('touchstart', onCaseTouchStart, {
      passive: false
    } as EventListenerOptions);
    document.removeEventListener('touchmove', onTouchMove, {
      passive: false
    } as EventListenerOptions);
    document.removeEventListener('touchend', onTouchEnd);
    thimbleGroup.removeEventListener('wheel', onWheel);
    thimbleGroup.removeEventListener('keydown', onThimbleKeyDown);
    caseEl.removeEventListener('keydown', onCaseKeyDown);
  };
}

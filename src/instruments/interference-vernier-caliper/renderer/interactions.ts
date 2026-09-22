/**
 * 干涉读数游标卡尺 — 指针拖拽与键盘交互
 */

import { UNIT_PX } from './constants';
import { interferenceVernierCaliperMeta } from '../instrument.meta';
import { ancestorZoomScale } from '../../_utils/fit-visual';
import { localPointerDelta } from '../../../core/canvas-sizing';

/**
 * 视图与交互共享的可变状态。
 * 主文件（渲染/序列化）与本模块（拖拽）通过同一对象读写，语义与拆分前闭包共享一致。
 */
export const DEFAULT_VISUAL_SCALE = 2;
export const INSTRUMENT_LAYOUT_WIDTH = 695;
/** CSS box of `.instrument-container`. */
export const INSTRUMENT_LAYOUT_HEIGHT = 250;
/**
 * Visible height at scale 1: layout box + slider/lens drop-shadow (~15)
 * + `.scroll-wrapper` padding-top (10). 250 was too short and cropped the
 * eyepiece whenever root scale was not height-limited.
 */
export const INSTRUMENT_VISUAL_HEIGHT = 275;
/**
 * Visible width at scale 1 including slider travel (MAX_X) + body + shaft/knob
 * (`right: -88px`). 695 is only the ruler box and clips the knob at default 1.4 cm.
 */
export const INSTRUMENT_VISUAL_WIDTH = 860;
export const SLIDER_LAYOUT_WIDTH = 566;

export const CALIPER_VISUAL_SELECTORS = [
  '.main-ruler',
  '.slider-assembly',
  '.slider-body',
  '.lens-assembly',
  '.screw-assembly',
  '.knob',
  '.vernier-ruler'
] as const;

export function fitInstrumentRootScale(
  availW: number,
  availH: number,
  visualScale: number = DEFAULT_VISUAL_SCALE,
  maxScale = 1.25
): number {
  const designW = INSTRUMENT_VISUAL_WIDTH * visualScale;
  const designH = INSTRUMENT_VISUAL_HEIGHT * visualScale;
  if (!(availW > 0) || !(availH > 0)) return 1;
  return Math.min(availW / designW, availH / designH, maxScale);
}

export type InteractionState = {
  currentReadingCm: number;
  isDragging: boolean;
  dragMode: 'slider' | 'knob' | null;
  startPointerX: number;
  startReadingCm: number;
  sysDragging: boolean;
  sysStartX: number;
  sysStartY: number;
  sysX: number;
  sysY: number;
  visualScale: number;
};

export function applyInstrumentTransform(
  instrumentEl: HTMLElement,
  state: InteractionState
): void {
  instrumentEl.style.transformOrigin =
    state.visualScale === DEFAULT_VISUAL_SCALE ? '' : 'top left';
  instrumentEl.style.transform = `translate(${state.sysX}px, ${state.sysY}px) scale(${state.visualScale})`;
}

export function createInteractionState(parent: HTMLElement): InteractionState {
  // Normalize to layout space: an ancestor stage panzoom zoom must not
  // change the instrument's internal placement.
  const zoomK = ancestorZoomScale(parent);
  const parentRect = parent.getBoundingClientRect();
  const parentW = parentRect.width / zoomK;
  const parentH = parentRect.height / zoomK;
  const scaledW = INSTRUMENT_VISUAL_WIDTH * DEFAULT_VISUAL_SCALE;
  const scaledH = INSTRUMENT_VISUAL_HEIGHT * DEFAULT_VISUAL_SCALE;
  const sysX =
    parentW >= scaledW
      ? Math.round((parentW - scaledW) / 2)
      : parentW > 100
        ? 0
        : -100;
  const sysY =
    parentH > 100 ? Math.max(0, Math.round((parentH - scaledH) / 2)) : 0;
  return {
    currentReadingCm:
      interferenceVernierCaliperMeta.defaultParams.initialReading,
    isDragging: false,
    dragMode: null,
    startPointerX: 0,
    startReadingCm: 0,
    sysDragging: false,
    sysStartX: 0,
    sysStartY: 0,
    sysX,
    sysY,
    visualScale: DEFAULT_VISUAL_SCALE
  };
}

export type InteractionElements = {
  slider: HTMLDivElement;
  knob: HTMLDivElement;
  mainRuler: HTMLElement;
  instrumentEl: HTMLDivElement;
};

/**
 * 绑定滑块/旋钮/整尺拖拽与键盘可访问性。
 * 返回 detach 函数，移除全部已注册的监听器。
 */
export function attachInteractions(
  elements: InteractionElements,
  state: InteractionState,
  onReadingMoved: () => void
): () => void {
  const { slider, knob, mainRuler, instrumentEl } = elements;

  function getPointerX(e: MouseEvent | TouchEvent): number {
    if ('touches' in e && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return (e as MouseEvent).clientX;
  }

  function handleDragStart(
    e: MouseEvent | TouchEvent,
    mode: 'slider' | 'knob'
  ) {
    if (mode === 'slider') {
      const target = e.target as HTMLElement;
      if (target.id === 'knob' || target.closest('#knob')) return;
    }
    state.isDragging = true;
    state.dragMode = mode;
    state.startPointerX = getPointerX(e);
    state.startReadingCm = state.currentReadingCm;
  }

  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (!state.isDragging) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    // 屏幕 delta → 局部坐标：stage panzoom 缩放时按 viewport 的 k 归一化
    const { dx: deltaX } = localPointerDelta(
      slider,
      getPointerX(e) - state.startPointerX,
      0
    );
    if (state.dragMode === 'slider') {
      state.currentReadingCm = state.startReadingCm + deltaX / 2 / UNIT_PX;
    } else if (state.dragMode === 'knob') {
      state.currentReadingCm =
        state.startReadingCm + (deltaX / 2 / UNIT_PX) * 0.1;
    }
    onReadingMoved();
  }

  function handleDragEnd() {
    state.isDragging = false;
    state.dragMode = null;
  }

  const onSliderMouseDown = (e: MouseEvent) => handleDragStart(e, 'slider');
  const onSliderTouchStart = (e: TouchEvent) => handleDragStart(e, 'slider');
  const onKnobMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleDragStart(e, 'knob');
  };
  const onKnobTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleDragStart(e, 'knob');
  };

  const handleSysDragStart = (clientX: number, clientY: number) => {
    state.sysDragging = true;
    state.sysStartX = clientX;
    state.sysStartY = clientY;
  };
  const handleSysDragMove = (clientX: number, clientY: number) => {
    if (!state.sysDragging) return;
    const { dx, dy } = localPointerDelta(
      instrumentEl,
      clientX - state.sysStartX,
      clientY - state.sysStartY
    );
    state.sysX += dx;
    state.sysY += dy;
    state.sysStartX = clientX;
    state.sysStartY = clientY;
    applyInstrumentTransform(instrumentEl, state);
  };
  const handleSysDragEnd = () => {
    state.sysDragging = false;
  };

  function isNarrowHost(): boolean {
    const rootNode = instrumentEl.getRootNode();
    if (!(rootNode instanceof ShadowRoot)) return false;
    return (
      rootNode
        .querySelector('.microscope-root')
        ?.classList.contains('is-narrow') === true
    );
  }

  const onRulerMouseDown = (e: MouseEvent) => {
    if (isNarrowHost()) return;
    e.stopPropagation();
    handleSysDragStart(e.clientX, e.clientY);
  };
  const onRulerTouchStart = (e: TouchEvent) => {
    if (isNarrowHost()) return;
    e.stopPropagation();
    handleSysDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onDocMouseMove = (e: MouseEvent) => {
    if (state.isDragging) handleDragMove(e);
    if (state.sysDragging) handleSysDragMove(e.clientX, e.clientY);
  };
  const onDocTouchMove = (e: TouchEvent) => {
    if (state.isDragging) handleDragMove(e);
    if (state.sysDragging) {
      if (e.cancelable) e.preventDefault();
      handleSysDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onDocMouseUp = () => {
    handleDragEnd();
    handleSysDragEnd();
  };
  const onDocTouchEnd = () => {
    handleDragEnd();
    handleSysDragEnd();
  };
  const onDocTouchCancel = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  slider.addEventListener('mousedown', onSliderMouseDown);
  slider.addEventListener('touchstart', onSliderTouchStart, { passive: false });
  knob.addEventListener('mousedown', onKnobMouseDown);
  knob.addEventListener('touchstart', onKnobTouchStart, { passive: false });
  mainRuler.addEventListener('mousedown', onRulerMouseDown);
  mainRuler.addEventListener('touchstart', onRulerTouchStart, {
    passive: false
  });
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('touchmove', onDocTouchMove, { passive: false });
  document.addEventListener('mouseup', onDocMouseUp);
  document.addEventListener('touchend', onDocTouchEnd);
  document.addEventListener('touchcancel', onDocTouchCancel);

  // ── 键盘可访问性 ──
  mainRuler.tabIndex = 0;
  mainRuler.setAttribute('role', 'button');
  mainRuler.setAttribute('aria-label', '主刻度尺，拖动可移动整个仪器');
  const onRulerKeyDown = (e: KeyboardEvent) => {
    const step = 30;
    switch (e.key) {
      case 'ArrowRight':
        state.sysX += step;
        break;
      case 'ArrowLeft':
        state.sysX -= step;
        break;
      case 'ArrowUp':
        state.sysY -= step;
        break;
      case 'ArrowDown':
        state.sysY += step;
        break;
      default:
        return;
    }
    e.preventDefault();
    applyInstrumentTransform(instrumentEl, state);
  };
  mainRuler.addEventListener('keydown', onRulerKeyDown);

  return () => {
    slider.removeEventListener('mousedown', onSliderMouseDown);
    slider.removeEventListener('touchstart', onSliderTouchStart, {
      passive: false
    } as EventListenerOptions);
    knob.removeEventListener('mousedown', onKnobMouseDown);
    knob.removeEventListener('touchstart', onKnobTouchStart, {
      passive: false
    } as EventListenerOptions);
    mainRuler.removeEventListener('mousedown', onRulerMouseDown);
    mainRuler.removeEventListener('touchstart', onRulerTouchStart, {
      passive: false
    } as EventListenerOptions);
    mainRuler.removeEventListener('keydown', onRulerKeyDown);
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('touchmove', onDocTouchMove, {
      passive: false
    } as EventListenerOptions);
    document.removeEventListener('mouseup', onDocMouseUp);
    document.removeEventListener('touchend', onDocTouchEnd);
    document.removeEventListener('touchcancel', onDocTouchCancel);
  };
}

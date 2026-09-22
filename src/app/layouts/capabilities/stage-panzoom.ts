/**
 * Stage pan/zoom controller — data-workspace built-in viewport.
 *
 * CSS transform on a content wrapper for interaction; after zoom settles,
 * canvas.dataset.renderBoost raises backing resolution so bitmaps stay sharp.
 * Scene sim state is never mutated.
 */

import { setRenderBoost } from '../../../core/canvas-sizing';
import {
  PANZOOM_PAN_IGNORE_ATTR,
  STAGE_CHROME_ATTR
} from '../../../platform/stage-chrome';
import { buildStagePanzoomControls } from './stage-panzoom-controls';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_BUTTON_FACTOR = 1.25;
const PAN_SLACK = 0.4;
const BOOST_DEBOUNCE_MS = 200;
const ANIMATE_MS = 120;
const IDENTITY_EPS = 1e-3;

/** Pointer pan ignores scene widgets so instruments keep their own drag. */
const PAN_IGNORE_SELECTOR = [
  '[data-panzoom-ignore]',
  `[${PANZOOM_PAN_IGNORE_ATTR}]`,
  'button',
  'input',
  'a',
  'select',
  'textarea'
].join(',');

/**
 * Wheel zoom only skips chrome/inputs. Instrument hosts still zoom: they
 * often fill the stage, and pan-ignore would otherwise disable wheel entirely.
 */
const WHEEL_IGNORE_SELECTOR = [
  '[data-panzoom-ignore]',
  'button',
  'input',
  'a',
  'select',
  'textarea'
].join(',');

export type StagePanzoomOptions = {
  slot: HTMLElement;
  onZoomSettled?: (zoom: number) => void;
  /** When true, single-finger touch pans (scene pointers are already locked). */
  stageLock?: boolean;
};

export type StagePanzoomHandle = {
  apply(): void;
  reset(): void;
  dispose(): void;
};

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function eventPath(event: Event): EventTarget[] {
  if (typeof event.composedPath === 'function') return event.composedPath();
  const path: EventTarget[] = [];
  let node: Node | null = event.target instanceof Node ? event.target : null;
  while (node) {
    path.push(node);
    node = node.parentNode;
  }
  return path;
}

function pathMatches(event: Event, selector: string): boolean {
  for (const node of eventPath(event)) {
    if (node instanceof Element && node.matches(selector)) return true;
  }
  return false;
}

function isPanIgnored(event: Event): boolean {
  return pathMatches(event, PAN_IGNORE_SELECTOR);
}

function isWheelIgnored(event: Event): boolean {
  return pathMatches(event, WHEEL_IGNORE_SELECTOR);
}

function formatTransform(x: number, y: number, zoom: number): string {
  const tx = Number((Number.isFinite(x) ? x : 0).toFixed(3));
  const ty = Number((Number.isFinite(y) ? y : 0).toFixed(3));
  const z = Number((Number.isFinite(zoom) ? zoom : 1).toFixed(4));
  return `translate(${tx}px, ${ty}px) scale(${z})`;
}

function capturePointer(el: HTMLElement, pointerId: number): void {
  if (typeof el.setPointerCapture !== 'function') return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    /* happy-dom / detached */
  }
}

function releasePointer(el: HTMLElement, pointerId: number): void {
  if (typeof el.releasePointerCapture !== 'function') return;
  try {
    if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
  } catch {
    /* already released */
  }
}

export function createStagePanzoom(
  options: StagePanzoomOptions
): StagePanzoomHandle {
  const { slot, onZoomSettled, stageLock = false } = options;
  const ac = new AbortController();
  const signal = ac.signal;

  let viewport: HTMLDivElement | null = null;
  let controls: HTMLDivElement | null = null;
  let tx = 0;
  let ty = 0;
  let zoom = 1;
  let applied = false;
  let disposed = false;
  let didSetPosition = false;
  let savedPosition = '';
  let savedOverflow = '';
  let boostTimer: number | null = null;
  let lastAppliedBoost = 1;
  let animateTimer: number | null = null;
  const pointers = new Map<number, Point>();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchContent: Point = { x: 0, y: 0 };

  function slotRect(): DOMRect {
    return slot.getBoundingClientRect();
  }

  function localPoint(clientX: number, clientY: number): Point {
    const rect = slotRect();
    const x = Number(clientX);
    const y = Number(clientY);
    return {
      x: (Number.isFinite(x) ? x : rect.width / 2) - (rect.left || 0),
      y: (Number.isFinite(y) ? y : rect.height / 2) - (rect.top || 0)
    };
  }

  function clampPan(): void {
    const rect = slotRect();
    const w = rect.width;
    const h = rect.height;
    if (!(w > 0) || !(h > 0)) return;
    const slackX = PAN_SLACK * w;
    const slackY = PAN_SLACK * h;
    const minTx = w - slackX - w * zoom;
    const maxTx = slackX;
    const minTy = h - slackY - h * zoom;
    const maxTy = slackY;
    tx = minTx > maxTx ? (minTx + maxTx) / 2 : clamp(tx, minTx, maxTx);
    ty = minTy > maxTy ? (minTy + maxTy) / 2 : clamp(ty, minTy, maxTy);
  }

  function paint(animated: boolean): void {
    if (!viewport) return;
    if (animated) {
      viewport.classList.add('is-animated');
      if (animateTimer != null) window.clearTimeout(animateTimer);
      animateTimer = window.setTimeout(() => {
        viewport?.classList.remove('is-animated');
        animateTimer = null;
      }, ANIMATE_MS);
    } else {
      viewport.classList.remove('is-animated');
    }
    viewport.style.transform = formatTransform(tx, ty, zoom);
    // 每次 paint 都写（含首次 zoom=1）：指针 delta 归一化（stageZoomOf）
    // 沿 composed 树读此属性；viewport 随 unwrap 删除，无需额外清理。
    viewport.dataset.stageZoom = String(zoom);
  }

  function settledZoom(): number {
    return Math.abs(zoom - 1) < IDENTITY_EPS ? 1 : zoom;
  }

  function canvasesInSlot(): HTMLCanvasElement[] {
    return [...slot.querySelectorAll('canvas')];
  }

  function applyBoostNow(forceResize = false): void {
    const settled = settledZoom();
    for (const canvas of canvasesInSlot()) {
      if (settled === 1) delete canvas.dataset.renderBoost;
      else setRenderBoost(canvas, settled);
    }
    const shouldResize = forceResize || lastAppliedBoost !== settled;
    lastAppliedBoost = settled;
    // repaint 走 onZoomSettled（→ scene.requestStageRepaint 的 rAF 合帧
    // resize+render），不再派发 window resize 假事件；boost 未变时
    // （forceResize=false 且 settled 同档）不触发，避免滚轮微调每次
    // 都跑完整 scene.resize()。
    if (shouldResize) {
      onZoomSettled?.(settled);
    }
  }

  function scheduleBoost(): void {
    if (boostTimer != null) window.clearTimeout(boostTimer);
    boostTimer = window.setTimeout(() => {
      boostTimer = null;
      applyBoostNow();
    }, BOOST_DEBOUNCE_MS);
  }

  function clearBoostTimer(): void {
    if (boostTimer != null) {
      window.clearTimeout(boostTimer);
      boostTimer = null;
    }
  }

  function setZoomAt(nextZoom: number, anchor: Point, animated: boolean): void {
    const z = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    const k = zoom === 0 ? 1 : z / zoom;
    tx = anchor.x - k * (anchor.x - tx);
    ty = anchor.y - k * (anchor.y - ty);
    zoom = z;
    clampPan();
    paint(animated);
    scheduleBoost();
  }

  function panBy(dx: number, dy: number): void {
    tx += dx;
    ty += dy;
    clampPan();
    paint(false);
  }

  function slotCenter(): Point {
    const rect = slotRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function pointerList(): Point[] {
    return [...pointers.values()];
  }

  function onPointerDown(event: PointerEvent): void {
    if (disposed || !viewport) return;
    if (event.pointerType !== 'touch' && event.button !== 0) return;
    if (isPanIgnored(event)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const isTouch = event.pointerType === 'touch';

    if (isTouch && !stageLock && pointers.size === 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    capturePointer(viewport, event.pointerId);

    if (pointers.size >= 2) {
      const [a, b] = pointerList();
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchStartZoom = zoom;
      const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchContent = {
        x: (mid.x - tx) / zoom,
        y: (mid.y - ty) / zoom
      };
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (disposed || !pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, next);

    if (pointers.size >= 2) {
      event.preventDefault();
      const [a, b] = pointerList();
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      const factor = dist / pinchStartDist;
      zoom = clamp(pinchStartZoom * factor, ZOOM_MIN, ZOOM_MAX);
      tx = mid.x - pinchContent.x * zoom;
      ty = mid.y - pinchContent.y * zoom;
      clampPan();
      paint(false);
      scheduleBoost();
      return;
    }

    const isTouch = event.pointerType === 'touch';
    if (isTouch && !stageLock) return;

    event.preventDefault();
    panBy(next.x - prev.x, next.y - prev.y);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (viewport) releasePointer(viewport, event.pointerId);
    if (pointers.size < 2) {
      pinchStartDist = 0;
    }
    if (pointers.size === 1) {
      const [a] = pointerList();
      const mid = localPoint(a.x, a.y);
      pinchContent = {
        x: (mid.x - tx) / zoom,
        y: (mid.y - ty) / zoom
      };
    }
  }

  function onWheel(event: WheelEvent): void {
    if (disposed || !viewport) return;
    if (isWheelIgnored(event)) return;
    event.preventDefault();
    let dy = event.deltaY;
    if (event.deltaMode === 1) dy *= 16;
    else if (event.deltaMode === 2) dy *= 400;
    const factor = Math.exp(-dy * 0.002);
    setZoomAt(zoom * factor, localPoint(event.clientX, event.clientY), false);
  }

  function onDblClick(event: MouseEvent): void {
    if (disposed) return;
    if (isPanIgnored(event)) return;
    event.preventDefault();
    resetInternal(true);
  }

  function attachListeners(): void {
    const opts: AddEventListenerOptions = { signal, capture: true };
    slot.addEventListener('pointerdown', onPointerDown, opts);
    slot.addEventListener('pointermove', onPointerMove, opts);
    slot.addEventListener('pointerup', onPointerUp, opts);
    slot.addEventListener('pointercancel', onPointerUp, opts);
    slot.addEventListener('lostpointercapture', onPointerUp, { signal });
    slot.addEventListener('dblclick', onDblClick, opts);
    slot.addEventListener('wheel', onWheel, {
      signal,
      capture: true,
      passive: false
    });
  }

  function wrap(): void {
    if (viewport?.parentElement === slot) return;

    savedPosition = slot.style.position;
    savedOverflow = slot.style.overflow;
    const computedPos = getComputedStyle(slot).position;
    if (
      computedPos === 'static' ||
      computedPos === '' ||
      computedPos === 'auto'
    ) {
      slot.style.position = 'relative';
      didSetPosition = true;
    }
    slot.style.overflow = 'hidden';

    viewport = document.createElement('div');
    viewport.className = 'stage-viewport';
    viewport.style.transformOrigin = '0 0';

    controls = buildStagePanzoomControls({
      signal,
      onZoomIn: () => setZoomAt(zoom * ZOOM_BUTTON_FACTOR, slotCenter(), true),
      onZoomOut: () => setZoomAt(zoom / ZOOM_BUTTON_FACTOR, slotCenter(), true),
      onReset: () => resetInternal(true)
    });

    const moving: ChildNode[] = [];
    for (const child of [...slot.childNodes]) {
      // 引用判断必须保留（viewport/controls 是自身创建的）；其余 chrome
      // 一律靠在创建点自标 data-stage-chrome 识别（单一事实源）。
      if (child === viewport || child === controls) continue;
      if (child instanceof HTMLElement && child.hasAttribute(STAGE_CHROME_ATTR))
        continue;
      moving.push(child);
    }
    slot.insertBefore(viewport, slot.firstChild);
    for (const child of moving) viewport.appendChild(child);
    slot.appendChild(controls);
    paint(false);
  }

  function unwrap(): void {
    if (!viewport) return;
    const parent = viewport.parentElement;
    if (parent) {
      while (viewport.firstChild) {
        parent.insertBefore(viewport.firstChild, viewport);
      }
      viewport.remove();
    }
    controls?.remove();
    viewport = null;
    controls = null;
    if (didSetPosition) slot.style.position = savedPosition;
    slot.style.overflow = savedOverflow;
    didSetPosition = false;
  }

  function resetInternal(animated: boolean): void {
    tx = 0;
    ty = 0;
    zoom = 1;
    pinchStartZoom = 1;
    pinchStartDist = 0;
    pointers.clear();
    paint(animated);
    clearBoostTimer();
    applyBoostNow(true);
  }

  function apply(): void {
    if (disposed) return;
    if (applied && viewport?.parentElement === slot) return;
    wrap();
    if (!applied) attachListeners();
    applied = true;
    paint(false);
  }

  function reset(): void {
    if (disposed) return;
    resetInternal(true);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    pointers.clear();
    clearBoostTimer();
    if (animateTimer != null) window.clearTimeout(animateTimer);
    zoom = 1;
    tx = 0;
    ty = 0;
    lastAppliedBoost = 1;
    for (const canvas of canvasesInSlot()) {
      delete canvas.dataset.renderBoost;
    }
    ac.abort();
    // dispose 顺序：清 boost → 删 renderBoost → unwrap（之后
    // sizeCanvasToFill 量的才是未变换容器）→ 最后强制 repaint 一次。
    unwrap();
    onZoomSettled?.(1);
    applied = false;
  }

  apply();
  return { apply, reset, dispose };
}

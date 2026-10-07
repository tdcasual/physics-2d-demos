/**
 * 场景画布自绘缩放（数据处理环节读数用）。
 *
 * 平台的舞台缩放是 CSS transform + 提升画布背衬分辨率，受画布像素上限
 * 约束，放不到能数清毫米刻度的倍数。需要高倍读数的场景改用本控制器：
 * 只维护一个视图变换 screen = k·p + t，由场景按该变换矢量重画，画布
 * 背衬尺寸不变，放多大都清晰。
 *
 * 使用本控制器的场景须在 DataWorkspaceSpec 里关掉平台缩放
 * （stagePanZoom: false）且不锁舞台指针（stageLock: false），并自行在
 * 工作区打开期间屏蔽会改动实验状态的拖拽。
 *
 * 手势：滚轮 / 双指缩放（以指针处为不动点），拖动平移；按钮与平台缩放
 * 控件同名同样式（放大 / 缩小 / 复位视图）。
 */

import { localPointerDelta } from '../../core/canvas-sizing';
import { STAGE_CHROME_ATTR } from '../stage-chrome';

export type CanvasZoomView = {
  /** 放大倍率，1 = 未缩放。 */
  k: number;
  /** 平移量（CSS px）。 */
  tx: number;
  ty: number;
};

export const IDENTITY_ZOOM_VIEW: CanvasZoomView = { k: 1, tx: 0, ty: 0 };

const BUTTON_FACTOR = 1.5;
const WHEEL_RATE = 0.0015;

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 倍率限制在 [1, maxZoom]，平移限制在「放大后的画面始终盖满画布」。 */
export function clampCanvasZoomView(
  view: CanvasZoomView,
  width: number,
  height: number,
  maxZoom: number
): CanvasZoomView {
  const k = clampNumber(view.k, 1, Math.max(1, maxZoom));
  return {
    k,
    tx: clampNumber(view.tx, width - k * width, 0),
    ty: clampNumber(view.ty, height - k * height, 0)
  };
}

/** 以画布上的 (x, y) 为不动点缩放 factor 倍。 */
export function zoomCanvasViewAt(
  view: CanvasZoomView,
  factor: number,
  x: number,
  y: number,
  width: number,
  height: number,
  maxZoom: number
): CanvasZoomView {
  if (!(factor > 0) || !Number.isFinite(factor)) return view;
  const k = clampNumber(view.k * factor, 1, Math.max(1, maxZoom));
  const ratio = k / view.k;
  return clampCanvasZoomView(
    {
      k,
      tx: x - ratio * (x - view.tx),
      ty: y - ratio * (y - view.ty)
    },
    width,
    height,
    maxZoom
  );
}

type TrackedPointer = {
  /** 画布局部坐标（offset 系，免疫祖先 transform）。 */
  x: number;
  y: number;
  clientX: number;
  clientY: number;
};

export type CanvasZoomOptions = {
  canvas: HTMLCanvasElement;
  /** 画布 CSS 尺寸。 */
  size(): { width: number; height: number };
  /** 当前允许的最大倍率（可随画布尺寸变化）。 */
  maxZoom(): number;
  /** 视图变化后由场景重画。 */
  onChange(): void;
};

export function createCanvasZoom(options: CanvasZoomOptions) {
  const { canvas } = options;
  const ac = new AbortController();
  const signal = ac.signal;
  let active = false;
  let current: CanvasZoomView = { ...IDENTITY_ZOOM_VIEW };
  const pointers = new Map<number, TrackedPointer>();
  let controls: HTMLDivElement | null = null;
  let savedTouchAction: string | null = null;
  let positionedHost: HTMLElement | null = null;
  let savedHostPosition = '';

  function clamped(): CanvasZoomView {
    const { width, height } = options.size();
    current = clampCanvasZoomView(current, width, height, options.maxZoom());
    return current;
  }

  function publish(): void {
    if (active) canvas.dataset.viewZoom = clamped().k.toFixed(3);
    else delete canvas.dataset.viewZoom;
  }

  function changed(): void {
    publish();
    options.onChange();
  }

  function zoomAt(factor: number, x: number, y: number): void {
    const { width, height } = options.size();
    current = zoomCanvasViewAt(
      clamped(),
      factor,
      x,
      y,
      width,
      height,
      options.maxZoom()
    );
    changed();
  }

  function zoomAtCenter(factor: number): void {
    const { width, height } = options.size();
    zoomAt(factor, width / 2, height / 2);
  }

  function reset(): void {
    current = { ...IDENTITY_ZOOM_VIEW };
    changed();
  }

  function track(event: PointerEvent): TrackedPointer {
    return {
      x: event.offsetX,
      y: event.offsetY,
      clientX: event.clientX,
      clientY: event.clientY
    };
  }

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (!active) return;
      pointers.set(event.pointerId, track(event));
      canvas.setPointerCapture?.(event.pointerId);
    },
    { signal }
  );
  canvas.addEventListener(
    'pointermove',
    (event) => {
      const previous = pointers.get(event.pointerId);
      if (!active || !previous) return;
      const now = track(event);
      const other = [...pointers.entries()].find(
        ([id]) => id !== event.pointerId
      )?.[1];
      if (!other) {
        const delta = localPointerDelta(
          canvas,
          now.clientX - previous.clientX,
          now.clientY - previous.clientY
        );
        const view = clamped();
        current = { ...view, tx: view.tx + delta.dx, ty: view.ty + delta.dy };
        pointers.set(event.pointerId, now);
        changed();
        return;
      }
      // 双指：两指间距之比为缩放倍率，中点为不动点。
      const before = localPointerDelta(
        canvas,
        previous.clientX - other.clientX,
        previous.clientY - other.clientY
      );
      const after = localPointerDelta(
        canvas,
        now.clientX - other.clientX,
        now.clientY - other.clientY
      );
      const distBefore = Math.hypot(before.dx, before.dy);
      const distAfter = Math.hypot(after.dx, after.dy);
      pointers.set(event.pointerId, now);
      if (distBefore > 0 && distAfter > 0) {
        zoomAt(
          distAfter / distBefore,
          (now.x + other.x) / 2,
          (now.y + other.y) / 2
        );
      }
    },
    { signal }
  );
  const release = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
  };
  canvas.addEventListener('pointerup', release, { signal });
  canvas.addEventListener('pointercancel', release, { signal });
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!active) return;
      event.preventDefault();
      zoomAt(
        Math.exp(-event.deltaY * WHEEL_RATE),
        event.offsetX,
        event.offsetY
      );
    },
    { passive: false, signal }
  );

  function buildControls(): HTMLDivElement {
    const host = document.createElement('div');
    // 与平台缩放控件共用类名：样式、位置规则与无障碍名称保持一致。
    host.className = 'stage-panzoom-controls';
    host.setAttribute(STAGE_CHROME_ATTR, '');
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', '舞台缩放');
    const button = (label: string, text: string, onClick: () => void) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'stage-panzoom-btn';
      el.setAttribute('aria-label', label);
      el.title = label;
      el.textContent = text;
      el.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        },
        { signal }
      );
      return el;
    };
    host.append(
      button('放大', '➕', () => zoomAtCenter(BUTTON_FACTOR)),
      button('缩小', '➖', () => zoomAtCenter(1 / BUTTON_FACTOR)),
      button('复位视图', '复位', reset)
    );
    return host;
  }

  function releaseHostPosition(): void {
    if (positionedHost) positionedHost.style.position = savedHostPosition;
    positionedHost = null;
    savedHostPosition = '';
  }

  /** 控件挂在画布的父节点上；布局切换后画布换了父节点时跟着搬。 */
  function placeControls(): void {
    if (!active) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    controls ??= buildControls();
    if (controls.parentElement === parent) return;
    releaseHostPosition();
    if (
      typeof getComputedStyle === 'function' &&
      getComputedStyle(parent).position === 'static'
    ) {
      positionedHost = parent;
      savedHostPosition = parent.style.position;
      parent.style.position = 'relative';
    }
    parent.appendChild(controls);
  }

  function removeControls(): void {
    controls?.remove();
    releaseHostPosition();
  }

  return {
    isActive: () => active,
    /** 当前视图变换（已按画布尺寸与倍率上限钳制）。 */
    view(): CanvasZoomView {
      if (!active) return IDENTITY_ZOOM_VIEW;
      placeControls();
      return { ...clamped() };
    },
    setActive(next: boolean): void {
      if (active === next) return;
      active = next;
      pointers.clear();
      current = { ...IDENTITY_ZOOM_VIEW };
      if (next) {
        // 拖动与双指缩放归画布，不让浏览器滚动页面。
        savedTouchAction = canvas.style.touchAction;
        canvas.style.touchAction = 'none';
        placeControls();
      } else {
        canvas.style.touchAction = savedTouchAction ?? '';
        savedTouchAction = null;
        removeControls();
      }
      publish();
    },
    zoomAt,
    reset,
    dispose(): void {
      ac.abort();
      pointers.clear();
      removeControls();
      controls = null;
      delete canvas.dataset.viewZoom;
    }
  };
}

export type CanvasZoom = ReturnType<typeof createCanvasZoom>;

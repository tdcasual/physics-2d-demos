import { readoutOccludesStage } from '../../../platform/stage-readout';

/** 画布 CSS 坐标系中的轴对齐矩形 */
export type Box = { left: number; top: number; right: number; bottom: number };

const READOUT_PANEL_SELECTOR =
  '.teaching-readout-panel, .srgb-readout-panel, .readout-panel';
const FLOATING_TRANSPORT_SELECTOR = '.stage-floating-controls';

function toCanvasBox(
  canvas: HTMLCanvasElement,
  el: Element,
  width: number,
  height: number
): Box | null {
  if (el instanceof HTMLElement && el.hidden) return null;
  const cr = canvas.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  if (cr.width <= 0 || cr.height <= 0 || pr.width <= 0 || pr.height <= 0) {
    return null;
  }
  const kx = width / cr.width;
  const ky = height / cr.height;
  const box: Box = {
    left: Math.max(0, (pr.left - cr.left) * kx),
    top: Math.max(0, (pr.top - cr.top) * ky),
    right: Math.min(width, (pr.right - cr.left) * kx),
    bottom: Math.min(height, (pr.bottom - cr.top) * ky)
  };
  return box.right > box.left && box.bottom > box.top ? box : null;
}

/**
 * 画布上方浮层（读数面板、浮动播放条）在画布 CSS 坐标中的矩形。
 * 读数面板不遮挡舞台（移动端 tab 等）时不计入。
 */
export function measureStageOcclusions(
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number
): Box[] {
  const parent = canvas?.parentElement;
  if (!canvas || !parent) return [];
  const boxes: Box[] = [];
  if (readoutOccludesStage(canvas)) {
    const panel = parent.querySelector(READOUT_PANEL_SELECTOR);
    const box = panel ? toCanvasBox(canvas, panel, width, height) : null;
    if (box) boxes.push(box);
  }
  const transport = parent.querySelector(FLOATING_TRANSPORT_SELECTOR);
  const box = transport ? toCanvasBox(canvas, transport, width, height) : null;
  if (box) boxes.push(box);
  return boxes;
}

export function occlusionSignature(boxes: Box[]): string {
  return boxes
    .map((b) =>
      [b.left, b.top, b.right, b.bottom].map((v) => Math.round(v)).join(',')
    )
    .join('|');
}

/**
 * 浮层尺寸 / 显隐变化时请求重绘（暂停时画面也能及时避让）。
 * 先例：vt-integral、single-slit 的读数浮层观察。
 */
export function createOcclusionWatcher(
  getCanvas: () => HTMLCanvasElement | null,
  onChange: () => void
): { watch(): void; dispose(): void } {
  const observers: Array<{ disconnect(): void }> = [];
  const observed = new Set<Element>();
  let parentObserved = false;
  let frame: number | null = null;

  const schedule = (): void => {
    if (frame !== null || typeof requestAnimationFrame === 'undefined') return;
    frame = requestAnimationFrame(() => {
      frame = null;
      watch();
      onChange();
    });
  };

  const observe = (el: Element, attributes: boolean): void => {
    if (observed.has(el)) return;
    observed.add(el);
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(schedule);
      resize.observe(el);
      observers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(schedule);
      mutate.observe(
        el,
        attributes
          ? { attributes: true, attributeFilter: ['class', 'style', 'hidden'] }
          : { childList: true }
      );
      observers.push(mutate);
    }
  };

  function watch(): void {
    const parent = getCanvas()?.parentElement;
    if (!parent) return;
    if (!parentObserved) {
      parentObserved = true;
      // 面板可能晚于首绘挂载：监听子节点以便补挂观察
      observe(parent, false);
    }
    parent
      .querySelectorAll(
        `${READOUT_PANEL_SELECTOR}, ${FLOATING_TRANSPORT_SELECTOR}`
      )
      .forEach((el) => observe(el, true));
  }

  return {
    watch,
    dispose() {
      if (frame !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(frame);
      }
      frame = null;
      observers.forEach((o) => o.disconnect());
      observers.length = 0;
      observed.clear();
    }
  };
}

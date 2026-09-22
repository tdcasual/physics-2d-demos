import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStagePanzoom } from '../../src/app/layouts/capabilities/stage-panzoom';
import { STAGE_CHROME_ATTR } from '../../src/platform/stage-chrome';

function mockRect(
  el: HTMLElement,
  width: number,
  height: number,
  left = 0,
  top = 0
): void {
  el.getBoundingClientRect = () =>
    ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON() {}
    }) as DOMRect;
}

function parseTransform(el: HTMLElement): {
  x: number;
  y: number;
  zoom: number;
} {
  const text = el.style.transform || '';
  const scale = /scale\(([^)]+)\)/.exec(text);
  const translate = /translate\(([^,]+),\s*([^)]+)\)/.exec(text);
  return {
    x: translate ? parseFloat(translate[1]) : 0,
    y: translate ? parseFloat(translate[2]) : 0,
    zoom: scale ? parseFloat(scale[1]) : 1
  };
}

function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  target: EventTarget,
  opts: {
    x: number;
    y: number;
    pointerId?: number;
    pointerType?: string;
    button?: number;
  }
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: opts.x,
      clientY: opts.y,
      pointerId: opts.pointerId ?? 1,
      pointerType: opts.pointerType ?? 'mouse',
      button: opts.button ?? 0
    })
  );
}

function wheel(
  target: EventTarget,
  opts: { x: number; y: number; deltaY: number }
): void {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    composed: true,
    deltaY: opts.deltaY
  });
  Object.defineProperty(event, 'clientX', { value: opts.x });
  Object.defineProperty(event, 'clientY', { value: opts.y });
  target.dispatchEvent(event);
}

describe('stage pan/zoom controller', () => {
  let slot: HTMLElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.useFakeTimers();
    slot = document.createElement('div');
    slot.className = 'lab-stage-slot';
    canvas = document.createElement('canvas');
    slot.appendChild(canvas);
    document.body.appendChild(slot);
    mockRect(slot, 400, 300);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('wraps slot children idempotently and restores them on dispose', () => {
    const extra = document.createElement('div');
    extra.className = 'scene-overlay';
    slot.appendChild(extra);
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    expect(viewport).toBeTruthy();
    expect(viewport.contains(canvas)).toBe(true);
    expect(viewport.contains(extra)).toBe(true);
    expect(slot.querySelector('.stage-panzoom-controls')).toBeTruthy();
    handle.apply();
    expect(slot.querySelectorAll('.stage-viewport')).toHaveLength(1);
    handle.dispose();
    expect(slot.querySelector('.stage-viewport')).toBeNull();
    expect(slot.querySelector('.stage-panzoom-controls')).toBeNull();
    expect(canvas.parentElement).toBe(slot);
    expect(extra.parentElement).toBe(slot);
    expect([...slot.children].indexOf(canvas)).toBeLessThan(
      [...slot.children].indexOf(extra)
    );
  });

  it('leaves self-marked chrome outside the transformed viewport', () => {
    const chrome = document.createElement('div');
    chrome.className = 'teaching-stage-floating-controls';
    // chrome 识别走创建点自标的 data-stage-chrome（单一事实源），不再看类名
    chrome.setAttribute(STAGE_CHROME_ATTR, '');
    // 类名相同但未自标的元素视为内容，必须被包进 viewport
    const unmarked = document.createElement('div');
    unmarked.className = 'teaching-stage-floating-controls';
    slot.append(chrome, unmarked);
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    expect(viewport.contains(canvas)).toBe(true);
    expect(viewport.contains(chrome)).toBe(false);
    expect(chrome.parentElement).toBe(slot);
    expect(viewport.contains(unmarked)).toBe(true);
    handle.dispose();
    expect(chrome.parentElement).toBe(slot);
  });

  it('publishes the current zoom on viewport dataset.stageZoom from the first paint', () => {
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    // 首次 paint（zoom=1）也写属性，避免漏写
    expect(viewport.dataset.stageZoom).toBe('1');
    wheel(viewport, { x: 200, y: 150, deltaY: -180 });
    const zoom = parseTransform(viewport).zoom;
    expect(zoom).toBeGreaterThan(1);
    // transform 字符串按 toFixed(4) 舍入，dataset 是全精度，故按 3 位比较
    expect(Number(viewport.dataset.stageZoom)).toBeCloseTo(zoom, 3);
    handle.reset();
    expect(viewport.dataset.stageZoom).toBe('1');
    handle.dispose();
  });

  it('zooms about the cursor and composes translate+scale', () => {
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    wheel(viewport, { x: 100, y: 80, deltaY: -100 });
    const t = parseTransform(viewport);
    expect(t.zoom).toBeGreaterThan(1);
    expect(t.zoom).toBeLessThanOrEqual(3);
    // Cursor at (100,80) stays put: 100 = tx + 100 * zoom → tx = 100 - 100*zoom
    expect(t.x).toBeCloseTo(100 - 100 * t.zoom, 2);
    expect(t.y).toBeCloseTo(80 - 80 * t.zoom, 2);
    handle.dispose();
  });

  it('clamps pan so content edges leave at most 40% of the slot', () => {
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', canvas, { x: 40, y: 40 });
    pointer('pointermove', canvas, { x: 40 + 2000, y: 40 + 2000 });
    pointer('pointerup', canvas, { x: 2040, y: 2040 });
    const t = parseTransform(viewport);
    expect(t.x).toBeCloseTo(400 * 0.4, 5);
    expect(t.y).toBeCloseTo(300 * 0.4, 5);
    handle.dispose();
  });

  it('does not pan when the event originates in an ignore region', () => {
    const ignore = document.createElement('div');
    ignore.dataset.panzoomIgnore = '';
    slot.appendChild(ignore);
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', ignore, { x: 20, y: 20 });
    pointer('pointermove', ignore, { x: 120, y: 80 });
    pointer('pointerup', ignore, { x: 120, y: 80 });
    expect(parseTransform(viewport)).toEqual({ x: 0, y: 0, zoom: 1 });
    handle.dispose();
  });

  it('still wheel-zooms over an instrument host', () => {
    const instrument = document.createElement('div');
    instrument.setAttribute('data-panzoom-pan-ignore', 'true');
    slot.appendChild(instrument);
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    wheel(instrument, { x: 200, y: 150, deltaY: -180 });
    expect(parseTransform(viewport).zoom).toBeGreaterThan(1);
    handle.dispose();
  });

  it('does not pan when dragging a button or instrument host', () => {
    const instrument = document.createElement('div');
    instrument.setAttribute('data-panzoom-pan-ignore', 'true');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'x';
    slot.append(instrument, btn);
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', instrument, { x: 10, y: 10 });
    pointer('pointermove', instrument, { x: 80, y: 40 });
    pointer('pointerup', instrument, { x: 80, y: 40 });
    pointer('pointerdown', btn, { x: 12, y: 12 });
    pointer('pointermove', btn, { x: 90, y: 50 });
    pointer('pointerup', btn, { x: 90, y: 50 });
    expect(parseTransform(viewport).x).toBe(0);
    expect(parseTransform(viewport).y).toBe(0);
    handle.dispose();
  });

  it('debounces renderBoost and settles via onZoomSettled, never window resize', () => {
    const resize = vi.fn();
    window.addEventListener('resize', resize);
    const onZoomSettled = vi.fn();
    const handle = createStagePanzoom({ slot, onZoomSettled });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    wheel(viewport, { x: 200, y: 150, deltaY: -180 });
    expect(canvas.dataset.renderBoost).toBeUndefined();
    vi.advanceTimersByTime(199);
    expect(canvas.dataset.renderBoost).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(Number(canvas.dataset.renderBoost)).toBeGreaterThan(1);
    // boost 清晰化不再派发 window resize；repaint 只走 onZoomSettled
    expect(resize).not.toHaveBeenCalled();
    expect(onZoomSettled).toHaveBeenCalledTimes(1);
    expect(onZoomSettled).toHaveBeenLastCalledWith(
      Number(canvas.dataset.renderBoost)
    );
    handle.reset();
    expect(canvas.dataset.renderBoost).toBeUndefined();
    expect(parseTransform(viewport)).toEqual({ x: 0, y: 0, zoom: 1 });
    // reset 走 forceResize，强制 repaint 一次
    expect(onZoomSettled).toHaveBeenCalledTimes(2);
    expect(onZoomSettled).toHaveBeenLastCalledWith(1);
    expect(resize).not.toHaveBeenCalled();
    handle.dispose();
    window.removeEventListener('resize', resize);
  });

  it('skips onZoomSettled when the settled boost did not change', () => {
    const onZoomSettled = vi.fn();
    const handle = createStagePanzoom({ slot, onZoomSettled });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    // 连续放大直到顶到 ZOOM_MAX=3 并 settle
    for (let i = 0; i < 20; i++) {
      wheel(viewport, { x: 200, y: 150, deltaY: -200 });
    }
    vi.advanceTimersByTime(200);
    expect(onZoomSettled).toHaveBeenCalledTimes(1);
    expect(onZoomSettled).toHaveBeenLastCalledWith(3);
    // 已到上限，继续放大 settled 不变 → shouldResize=false，不再 repaint
    wheel(viewport, { x: 200, y: 150, deltaY: -200 });
    vi.advanceTimersByTime(200);
    expect(onZoomSettled).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('exposes generic zoom controls and resets from the reset button', () => {
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    const zoomIn = slot.querySelector(
      'button[aria-label="放大"]'
    ) as HTMLButtonElement;
    const zoomOut = slot.querySelector(
      'button[aria-label="缩小"]'
    ) as HTMLButtonElement;
    const resetBtn = slot.querySelector(
      'button[aria-label="复位视图"]'
    ) as HTMLButtonElement;
    expect(zoomIn.textContent).toBe('➕');
    expect(zoomOut.textContent).toBe('➖');
    expect(resetBtn.textContent).toBe('复位');
    // 控件是 slot 内 chrome，创建点必须自标
    expect(
      slot
        .querySelector('.stage-panzoom-controls')
        ?.hasAttribute(STAGE_CHROME_ATTR)
    ).toBe(true);
    zoomIn.click();
    expect(parseTransform(viewport).zoom).toBeGreaterThan(1);
    resetBtn.click();
    expect(parseTransform(viewport)).toEqual({ x: 0, y: 0, zoom: 1 });
    handle.dispose();
  });

  it('resets on double-click of blank content', () => {
    const handle = createStagePanzoom({ slot });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    wheel(viewport, { x: 200, y: 150, deltaY: -120 });
    expect(parseTransform(viewport).zoom).toBeGreaterThan(1);
    canvas.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: 200,
        clientY: 150
      })
    );
    expect(parseTransform(viewport)).toEqual({ x: 0, y: 0, zoom: 1 });
    handle.dispose();
  });

  it('does not single-finger pan on touch unless stageLock is set', () => {
    const unlocked = createStagePanzoom({ slot, stageLock: false });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', canvas, {
      x: 40,
      y: 40,
      pointerType: 'touch',
      pointerId: 11
    });
    pointer('pointermove', canvas, {
      x: 140,
      y: 40,
      pointerType: 'touch',
      pointerId: 11
    });
    pointer('pointerup', canvas, {
      x: 140,
      y: 40,
      pointerType: 'touch',
      pointerId: 11
    });
    expect(parseTransform(viewport).x).toBe(0);
    unlocked.dispose();

    const locked = createStagePanzoom({ slot, stageLock: true });
    const vp2 = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', canvas, {
      x: 40,
      y: 40,
      pointerType: 'touch',
      pointerId: 12
    });
    pointer('pointermove', canvas, {
      x: 140,
      y: 40,
      pointerType: 'touch',
      pointerId: 12
    });
    expect(parseTransform(vp2).x).toBeGreaterThan(0);
    locked.dispose();
  });

  it('two-finger pinch zooms even when stageLock is off', () => {
    const handle = createStagePanzoom({ slot, stageLock: false });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    pointer('pointerdown', canvas, {
      x: 150,
      y: 150,
      pointerType: 'touch',
      pointerId: 1
    });
    pointer('pointerdown', canvas, {
      x: 250,
      y: 150,
      pointerType: 'touch',
      pointerId: 2
    });
    pointer('pointermove', canvas, {
      x: 100,
      y: 150,
      pointerType: 'touch',
      pointerId: 1
    });
    pointer('pointermove', canvas, {
      x: 300,
      y: 150,
      pointerType: 'touch',
      pointerId: 2
    });
    expect(parseTransform(viewport).zoom).toBeGreaterThan(1);
    handle.dispose();
  });

  it('dispose removes boost and unwraps after a zoom, repainting exactly once', () => {
    const onZoomSettled = vi.fn();
    const handle = createStagePanzoom({ slot, onZoomSettled });
    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    wheel(viewport, { x: 200, y: 150, deltaY: -200 });
    vi.advanceTimersByTime(200);
    expect(canvas.dataset.renderBoost).toBeTruthy();
    expect(onZoomSettled).toHaveBeenCalledTimes(1);
    const resize = vi.fn();
    window.addEventListener('resize', resize);
    handle.dispose();
    expect(slot.querySelector('.stage-viewport')).toBeNull();
    expect(canvas.dataset.renderBoost).toBeUndefined();
    expect(canvas.parentElement).toBe(slot);
    // dispose 不再派发 window resize；repaint 恰好一次且带 zoom=1
    expect(resize).not.toHaveBeenCalled();
    expect(onZoomSettled).toHaveBeenCalledTimes(2);
    expect(onZoomSettled).toHaveBeenLastCalledWith(1);
    window.removeEventListener('resize', resize);
  });
});

import { describe, expect, it } from 'vitest';
import { makeDraggable, makeResizable } from '../../src/ui/utils/draggable';

function pointerDown(el: Element, x: number, y: number) {
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX: x,
      clientY: y,
      bubbles: true,
      pointerId: 1
    })
  );
}

function pointerMove(el: Element, x: number, y: number) {
  el.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: x,
      clientY: y,
      bubbles: true,
      pointerId: 1
    })
  );
}

function pointerUp(el: Element) {
  el.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
  );
}

describe('makeDraggable', () => {
  it('should make element draggable and update position', () => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '100px';
    element.style.top = '100px';
    document.body.appendChild(element);

    // Mock offsetLeft/offsetTop for happy-dom
    Object.defineProperty(element, 'offsetLeft', {
      value: 100,
      writable: true
    });
    Object.defineProperty(element, 'offsetTop', { value: 100, writable: true });

    const cleanup = makeDraggable(element);

    // Simulate drag: 100,100 -> 150,120 = delta 50,20
    pointerDown(element, 100, 100);
    pointerMove(element, 150, 120);
    pointerUp(element);

    expect(element.style.left).toBe('150px');
    expect(element.style.top).toBe('120px');
    expect(element.style.right).toBe('auto');

    cleanup();
    element.remove();
  });

  it('should use custom handle when provided', () => {
    const element = document.createElement('div');
    const handle = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '50px';
    element.style.top = '50px';
    document.body.appendChild(element);
    document.body.appendChild(handle);

    Object.defineProperty(element, 'offsetLeft', { value: 50, writable: true });
    Object.defineProperty(element, 'offsetTop', { value: 50, writable: true });

    const cleanup = makeDraggable(element, handle);

    expect(handle.style.cursor).toBe('move');

    pointerDown(handle, 50, 50);
    pointerMove(handle, 70, 80);
    pointerUp(handle);

    expect(element.style.left).toBe('70px');
    expect(element.style.top).toBe('80px');

    cleanup();
    element.remove();
    handle.remove();
  });

  it('should cleanup event listeners', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const cleanup = makeDraggable(element);
    expect(() => cleanup()).not.toThrow();

    element.remove();
  });

  it('should not move before pointerdown', () => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '10px';
    element.style.top = '10px';
    document.body.appendChild(element);

    const cleanup = makeDraggable(element);

    // Pointer move without pointerdown should not move element
    pointerMove(element, 100, 100);

    expect(element.style.left).toBe('10px');
    expect(element.style.top).toBe('10px');

    cleanup();
    element.remove();
  });

  it('should set user-select none during drag', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const cleanup = makeDraggable(element);

    pointerDown(element, 0, 0);
    expect(document.body.style.userSelect).toBe('none');

    pointerUp(element);
    expect(document.body.style.userSelect).toBe('');

    cleanup();
    element.remove();
  });

  it('normalizes drag deltas by the ancestor stage zoom (k=2)', () => {
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const element = document.createElement('div');
    element.style.position = 'absolute';
    viewport.appendChild(element);
    document.body.appendChild(viewport);

    Object.defineProperty(element, 'offsetLeft', {
      value: 100,
      writable: true
    });
    Object.defineProperty(element, 'offsetTop', { value: 100, writable: true });

    const cleanup = makeDraggable(element);

    // 屏幕位移 (20, 10) → 局部 (10, 5)
    pointerDown(element, 0, 0);
    pointerMove(element, 20, 10);
    pointerUp(element);

    expect(element.style.left).toBe('110px');
    expect(element.style.top).toBe('105px');

    cleanup();
    viewport.remove();
  });

  it('clamps to parent using transform-immune offset sizes', () => {
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const parent = document.createElement('div');
    const element = document.createElement('div');
    element.style.position = 'absolute';
    parent.appendChild(element);
    viewport.appendChild(parent);
    document.body.appendChild(viewport);

    Object.defineProperty(element, 'offsetParent', {
      configurable: true,
      value: parent
    });
    Object.defineProperty(element, 'offsetLeft', {
      value: 0,
      writable: true
    });
    Object.defineProperty(element, 'offsetTop', { value: 0, writable: true });
    // 布局尺寸 400×300 / 100×50；GBCR 带上 k=2 的祖先放大，不得用于 clamp
    Object.defineProperty(parent, 'offsetWidth', {
      configurable: true,
      value: 400
    });
    Object.defineProperty(parent, 'offsetHeight', {
      configurable: true,
      value: 300
    });
    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      value: 100
    });
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      value: 50
    });
    const scaledRect = (width: number, height: number) =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: width * 2,
        height: height * 2,
        right: width * 2,
        bottom: height * 2,
        toJSON() {}
      }) as DOMRect;
    parent.getBoundingClientRect = () => scaledRect(400, 300);
    element.getBoundingClientRect = () => scaledRect(100, 50);

    const cleanup = makeDraggable(element, undefined, {
      clampToParent: true
    });

    // 屏幕 (1000, 1000) → 局部 (500, 500) → clamp 到 (400-100, 300-50)
    pointerDown(element, 0, 0);
    pointerMove(element, 1000, 1000);
    pointerUp(element);

    expect(element.style.left).toBe('300px');
    expect(element.style.top).toBe('250px');

    cleanup();
    viewport.remove();
  });
});

describe('makeResizable', () => {
  it('starts from offset sizes and normalizes deltas by the stage zoom (k=2)', () => {
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const element = document.createElement('div');
    viewport.appendChild(element);
    document.body.appendChild(viewport);

    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      value: 200
    });
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      value: 120
    });
    // GBCR 带上 k=2 的祖先放大，不得作为起点尺寸
    element.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 400,
        height: 240,
        right: 400,
        bottom: 240,
        toJSON() {}
      }) as DOMRect;

    const cleanup = makeResizable(element, { minWidth: 100, minHeight: 60 });
    const handle = element.querySelector('.lab-float-resize') as HTMLElement;
    expect(handle).toBeTruthy();

    // 屏幕 (40, 20) → 局部 (20, 10)
    pointerDown(handle, 0, 0);
    pointerMove(handle, 40, 20);
    pointerUp(handle);

    expect(element.style.width).toBe('220px');
    expect(element.style.height).toBe('130px');

    cleanup();
    viewport.remove();
  });
});

import { describe, expect, it } from 'vitest';
import { makeDraggable } from '../../src/ui/utils/draggable';

function pointerDown(el: Element, x: number, y: number) {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
}

function pointerMove(el: Element, x: number, y: number) {
  el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
}

function pointerUp(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
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
});

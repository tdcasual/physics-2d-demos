import { describe, expect, it } from 'vitest';
import { makeDraggable } from '../../src/ui/utils/draggable';

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
    element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true })
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 150, clientY: 120, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

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

    handle.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true })
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 70, clientY: 80, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

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

  it('should not move before mousedown', () => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '10px';
    element.style.top = '10px';
    document.body.appendChild(element);

    const cleanup = makeDraggable(element);

    // Mouse move without mousedown should not move element
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true })
    );

    expect(element.style.left).toBe('10px');
    expect(element.style.top).toBe('10px');

    cleanup();
    element.remove();
  });

  it('should set user-select none during drag', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const cleanup = makeDraggable(element);

    element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true })
    );
    expect(document.body.style.userSelect).toBe('none');

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(document.body.style.userSelect).toBe('');

    cleanup();
    element.remove();
  });
});

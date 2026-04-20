import { describe, expect, it, vi } from 'vitest';
import { ResizerBehavior } from '../../src/app/layouts/masters/split-right/resizer-behavior';

describe('ResizerBehavior', () => {
  function setup() {
    const container = document.createElement('div');
    container.style.cssText = 'width: 1200px; height: 800px;';

    const leftPanel = document.createElement('aside');
    leftPanel.style.width = '400px';
    container.appendChild(leftPanel);

    const resizer = document.createElement('div');
    container.appendChild(resizer);

    let currentRatio = 0.33;
    const onChange = vi.fn((ratio: number) => {
      currentRatio = ratio;
    });

    const behavior = new ResizerBehavior(
      container,
      resizer,
      leftPanel,
      () => ({ leftMinWidth: 260, leftMaxWidth: 960 }),
      onChange
    );

    return {
      container,
      leftPanel,
      resizer,
      behavior,
      onChange,
      getRatio: () => currentRatio
    };
  }

  it('should update grid columns on mouse drag', () => {
    const { container, behavior, onChange } = setup();

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, button: 0 });
    behavior.onMouseDown(mouseDown, false);

    const mouseMove = new MouseEvent('mousemove', { clientX: 600 });
    document.dispatchEvent(mouseMove);

    expect(container.style.gridTemplateColumns).toMatch(/^\d+px 8px 1fr$/);
    expect(onChange).toHaveBeenCalled();
  });

  it('should respect min width on drag', () => {
    const { container, behavior } = setup();

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, button: 0 });
    behavior.onMouseDown(mouseDown, false);

    // Drag far left (negative delta)
    const mouseMove = new MouseEvent('mousemove', { clientX: 0 });
    document.dispatchEvent(mouseMove);

    const cols = container.style.gridTemplateColumns;
    const width = parseInt(cols.split('px')[0], 10);
    expect(width).toBeGreaterThanOrEqual(260);
  });

  it('should do nothing in compact viewport', () => {
    const { container, behavior, onChange } = setup();

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, button: 0 });
    behavior.onMouseDown(mouseDown, true); // isCompactViewport = true

    expect(container.style.gridTemplateColumns).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should update grid columns on ArrowRight key', () => {
    const { container, resizer, behavior, onChange } = setup();

    behavior.onMouseDown(
      new MouseEvent('mousedown', { clientX: 500, button: 0 }),
      false
    );
    resizer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(onChange).toHaveBeenCalled();
    expect(container.style.gridTemplateColumns).toMatch(/^\d+px 8px 1fr$/);
  });

  it('should respond to ArrowLeft key by narrowing', () => {
    const { container, resizer, behavior } = setup();

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, button: 0 });
    behavior.onMouseDown(mouseDown, false);

    const before =
      parseInt(container.style.gridTemplateColumns.split('px')[0], 10) || 400;

    const keyDown = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    resizer.dispatchEvent(keyDown);

    const after = parseInt(
      container.style.gridTemplateColumns.split('px')[0],
      10
    );
    expect(after).toBeLessThan(before);
  });

  it('should ignore non-arrow keys', () => {
    const { container, resizer, behavior } = setup();

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, button: 0 });
    behavior.onMouseDown(mouseDown, false);

    const before = container.style.gridTemplateColumns;

    const keyDown = new KeyboardEvent('keydown', { key: 'Enter' });
    resizer.dispatchEvent(keyDown);

    expect(container.style.gridTemplateColumns).toBe(before);
  });
});

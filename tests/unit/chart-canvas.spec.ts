import { describe, expect, it, vi } from 'vitest';
import { createChartCanvas } from '../../src/core/chart/chart-canvas';

describe('chart-canvas', () => {
  it('should auto-create canvas in container', () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const { state, dispose } = createChartCanvas({ container });

    expect(state.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(state.canvas.parentElement).toBe(container);
    expect(state.ctx).toBeDefined();
    expect(state.cssWidth).toBeGreaterThan(0);
    expect(state.cssHeight).toBeGreaterThan(0);
    expect(state.dpr).toBeGreaterThanOrEqual(1);
    expect(state.hairlineWidth).toBeGreaterThan(0);
    const responsiveScale = Number(state.canvas.dataset.responsiveScale);
    expect(responsiveScale).toBeGreaterThanOrEqual(0.3);
    expect(responsiveScale).toBeLessThanOrEqual(1.5);

    dispose();
    document.body.removeChild(container);
  });

  it('should use existing canvas when autoCreate is false', () => {
    const container = document.createElement('div');
    const existingCanvas = document.createElement('canvas');
    container.appendChild(existingCanvas);
    document.body.appendChild(container);

    const { state, dispose } = createChartCanvas({
      container,
      autoCreate: false
    });

    expect(state.canvas).toBe(existingCanvas);

    dispose();
    document.body.removeChild(container);
  });

  it('should throw when autoCreate is false and no canvas exists', () => {
    const container = document.createElement('div');
    expect(() => createChartCanvas({ container, autoCreate: false })).toThrow(
      'No canvas found'
    );
  });

  it('should call onResize callback', () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const onResize = vi.fn();
    const { state, dispose } = createChartCanvas({ container }, onResize);

    expect(onResize).toHaveBeenCalled();
    const callState = onResize.mock.calls[0][0];
    expect(callState.canvas).toBe(state.canvas);
    expect(callState.cssWidth).toBeGreaterThan(0);

    dispose();
    document.body.removeChild(container);
  });

  it('should remove auto-created canvas on dispose', () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const { state, dispose } = createChartCanvas({ container });
    const canvas = state.canvas;

    expect(canvas.parentElement).toBe(container);
    dispose();
    expect(canvas.parentElement).toBeNull();

    document.body.removeChild(container);
  });

  it('should not remove existing canvas on dispose when autoCreate is false', () => {
    const container = document.createElement('div');
    const existingCanvas = document.createElement('canvas');
    container.appendChild(existingCanvas);
    document.body.appendChild(container);

    const { dispose } = createChartCanvas({ container, autoCreate: false });
    dispose();

    expect(existingCanvas.parentElement).toBe(container);
    document.body.removeChild(container);
  });

  it('should compute hairlineWidth as 1/dpr', () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const originalDpr = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });

    const { state, dispose } = createChartCanvas({ container });
    expect(state.hairlineWidth).toBe(0.5);

    dispose();
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true
    });
    document.body.removeChild(container);
  });

  it('should handle minimum size of 1x1', () => {
    const container = document.createElement('div');
    container.style.width = '0px';
    container.style.height = '0px';
    document.body.appendChild(container);

    const { state, dispose } = createChartCanvas({ container });
    expect(state.cssWidth).toBeGreaterThanOrEqual(1);
    expect(state.cssHeight).toBeGreaterThanOrEqual(1);

    dispose();
    document.body.removeChild(container);
  });
});

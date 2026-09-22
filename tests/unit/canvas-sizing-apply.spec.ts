import { afterEach, describe, expect, it } from 'vitest';
import {
  applyCanvasSize,
  readElementLayoutSize,
  readRenderBoost,
  setRenderBoost,
  sizeCanvasToFill
} from '../../src/core/canvas-sizing';
import type { CanvasSizingResult } from '../../src/core/canvas-sizing';

describe('applyCanvasSize', () => {
  function makeSizing(
    overrides: Partial<CanvasSizingResult> = {}
  ): CanvasSizingResult {
    return {
      width: 800,
      height: 600,
      cssWidth: 800,
      cssHeight: 600,
      dpr: 1,
      responsiveScale: 1,
      ...overrides
    };
  }

  it('does not modify canvas width/height when called with identical sizing twice', () => {
    const canvas = document.createElement('canvas');
    const sizing = makeSizing();

    // First call sets up the canvas
    applyCanvasSize(canvas, sizing);
    canvas.width = sizing.width;
    canvas.height = sizing.height;

    // Second call with identical sizing must NOT modify width/height
    // (modifying width/height would clear the canvas — the bug we fixed)
    const widthBefore = canvas.width;
    const heightBefore = canvas.height;
    applyCanvasSize(canvas, sizing);

    expect(canvas.width).toBe(widthBefore);
    expect(canvas.height).toBe(heightBefore);
  });

  it('modifies canvas width/height when sizing changes', () => {
    const canvas = document.createElement('canvas');
    const sizing1 = makeSizing({ width: 800, height: 600 });
    const sizing2 = makeSizing({ width: 400, height: 300 });

    applyCanvasSize(canvas, sizing1);
    canvas.width = sizing1.width;
    canvas.height = sizing1.height;

    applyCanvasSize(canvas, sizing2);

    expect(canvas.width).toBe(sizing2.width);
    expect(canvas.height).toBe(sizing2.height);
  });

  it('sets responsiveScale on dataset', () => {
    const canvas = document.createElement('canvas');
    const sizing = makeSizing({ responsiveScale: 0.5 });

    applyCanvasSize(canvas, sizing);

    expect(canvas.dataset.responsiveScale).toBe('0.5');
  });

  it('applies DPR scaling to context transform', () => {
    const canvas = document.createElement('canvas');
    const sizing = makeSizing({ dpr: 2 });

    const ctx = applyCanvasSize(canvas, sizing);

    // Mock context records scale calls; we verify it was invoked
    expect(ctx).toBeDefined();
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('defaults renderBoost to 1 when dataset is missing or invalid', () => {
    const canvas = document.createElement('canvas');
    expect(readRenderBoost(canvas)).toBe(1);
    canvas.dataset.renderBoost = 'nope';
    expect(readRenderBoost(canvas)).toBe(1);
    canvas.dataset.renderBoost = '';
    expect(readRenderBoost(canvas)).toBe(1);
  });

  it('clamps setRenderBoost to [0.5, 4] without changing CSS size', () => {
    const canvas = document.createElement('canvas');
    canvas.style.width = '800px';
    canvas.style.height = '600px';
    setRenderBoost(canvas, 0.1);
    expect(canvas.dataset.renderBoost).toBe('0.5');
    expect(readRenderBoost(canvas)).toBe(0.5);
    setRenderBoost(canvas, 9);
    expect(canvas.dataset.renderBoost).toBe('4');
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');
  });

  it('multiplies backing store and ctx.scale by renderBoost', () => {
    const canvas = document.createElement('canvas');
    canvas.dataset.renderBoost = '2';
    const sizing = makeSizing({ dpr: 2, width: 800, height: 600 });
    const ctx = applyCanvasSize(canvas, sizing);
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(canvas.dataset.responsiveScale).toBe('1');
    expect(ctx.scale).toHaveBeenCalledWith(4, 4);
  });

  it('keeps responsiveScale on CSS size when boosted', () => {
    const canvas = document.createElement('canvas');
    setRenderBoost(canvas, 3);
    applyCanvasSize(
      canvas,
      makeSizing({
        width: 400,
        height: 300,
        cssWidth: 400,
        cssHeight: 300,
        dpr: 1,
        responsiveScale: 0.75
      })
    );
    expect(canvas.dataset.responsiveScale).toBe('0.75');
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);
  });
});

describe('sizeCanvasToFill layout measurement', () => {
  const originalDpr = window.devicePixelRatio;

  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true
    });
  });

  function mockLayout(el: HTMLElement, width: number, height: number): void {
    Object.defineProperty(el, 'offsetWidth', {
      configurable: true,
      value: width
    });
    Object.defineProperty(el, 'offsetHeight', {
      configurable: true,
      value: height
    });
  }

  function mockRect(el: HTMLElement, width: number, height: number): void {
    el.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width,
        height,
        right: width,
        bottom: height,
        toJSON() {}
      }) as DOMRect;
  }

  it('prefers offsetWidth/offsetHeight over a transformed getBoundingClientRect', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true
    });
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    document.body.appendChild(parent);
    mockLayout(parent, 400, 300);
    mockRect(parent, 1200, 900);
    canvas.dataset.renderBoost = '3';

    sizeCanvasToFill(canvas);

    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('300px');
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);

    sizeCanvasToFill(canvas);
    expect(canvas.style.width).toBe('400px');
    expect(canvas.width).toBe(1200);
  });

  it('falls back to getBoundingClientRect when offset size is 0', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true
    });
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    mockLayout(parent, 0, 0);
    mockRect(parent, 640, 480);

    sizeCanvasToFill(canvas);

    expect(canvas.style.width).toBe('640px');
    expect(canvas.style.height).toBe('480px');
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
  });

  it('keeps CSS at layout size while boost only scales the backing store', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    mockLayout(parent, 1440, 480);
    mockRect(parent, 4320, 1440);
    setRenderBoost(canvas, 3);

    sizeCanvasToFill(canvas);

    expect(canvas.style.width).toBe('1440px');
    expect(canvas.style.height).toBe('480px');
    expect(canvas.width).toBe(8640);
    expect(canvas.height).toBe(2880);
  });

  it('readElementLayoutSize uses offset when both axes are positive', () => {
    const el = document.createElement('div');
    mockLayout(el, 200, 100);
    mockRect(el, 600, 300);
    expect(readElementLayoutSize(el)).toEqual({ width: 200, height: 100 });
  });
});

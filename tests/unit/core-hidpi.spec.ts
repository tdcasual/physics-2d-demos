import { describe, expect, it } from 'vitest';
import {
  resolveDevicePixelRatio,
  computeHiDpiCanvasMetrics,
  applyHiDpiCanvasMetrics
} from '../../src/core/high-dpi-canvas';

describe('resolveDevicePixelRatio', () => {
  it('should return input when >= 1', () => {
    expect(resolveDevicePixelRatio(1)).toBe(1);
    expect(resolveDevicePixelRatio(2)).toBe(2);
    expect(resolveDevicePixelRatio(1.5)).toBe(1.5);
  });

  it('should return 1 for invalid input', () => {
    expect(resolveDevicePixelRatio(0)).toBe(1);
    expect(resolveDevicePixelRatio(-1)).toBe(1);
    expect(resolveDevicePixelRatio(NaN)).toBe(1);
    expect(resolveDevicePixelRatio(Infinity)).toBe(1);
  });
});

describe('computeHiDpiCanvasMetrics', () => {
  it('should compute metrics for valid input', () => {
    const m = computeHiDpiCanvasMetrics({
      cssWidth: 800,
      cssHeight: 600,
      devicePixelRatio: 2
    });
    expect(m.cssWidth).toBe(800);
    expect(m.cssHeight).toBe(600);
    expect(m.pixelRatio).toBe(2);
    expect(m.backingWidth).toBe(1600);
    expect(m.backingHeight).toBe(1200);
  });

  it('should sanitize invalid css sizes', () => {
    const m = computeHiDpiCanvasMetrics({
      cssWidth: -100,
      cssHeight: 0,
      devicePixelRatio: 1
    });
    expect(m.cssWidth).toBe(1280); // fallback
    expect(m.cssHeight).toBe(720); // fallback
  });

  it('should floor css sizes', () => {
    const m = computeHiDpiCanvasMetrics({
      cssWidth: 799.9,
      cssHeight: 599.9,
      devicePixelRatio: 1
    });
    expect(m.cssWidth).toBe(799);
    expect(m.cssHeight).toBe(599);
  });
});

describe('applyHiDpiCanvasMetrics', () => {
  it('should set canvas dimensions and transform', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const metrics = computeHiDpiCanvasMetrics({
      cssWidth: 400,
      cssHeight: 300,
      devicePixelRatio: 2
    });

    applyHiDpiCanvasMetrics(canvas, ctx, metrics);

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});

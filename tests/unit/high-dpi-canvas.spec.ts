import { describe, expect, it } from 'vitest';
import { computeHiDpiCanvasMetrics, resolveDevicePixelRatio } from '../../src/core/high-dpi-canvas';

describe('high dpi canvas metrics', () => {
  it('scales backing store by device pixel ratio', () => {
    const metrics = computeHiDpiCanvasMetrics({
      cssWidth: 960,
      cssHeight: 540,
      devicePixelRatio: 2
    });

    expect(metrics.cssWidth).toBe(960);
    expect(metrics.cssHeight).toBe(540);
    expect(metrics.pixelRatio).toBe(2);
    expect(metrics.backingWidth).toBe(1920);
    expect(metrics.backingHeight).toBe(1080);
  });

  it('falls back to dpr=1 for invalid ratios', () => {
    expect(resolveDevicePixelRatio(Number.NaN)).toBe(1);
    expect(resolveDevicePixelRatio(0)).toBe(1);
    expect(resolveDevicePixelRatio(-1)).toBe(1);
  });

  it('preserves high-dpi ratios above 2', () => {
    const metrics = computeHiDpiCanvasMetrics({
      cssWidth: 500,
      cssHeight: 300,
      devicePixelRatio: 3
    });

    expect(metrics.pixelRatio).toBe(3);
    expect(metrics.backingWidth).toBe(1500);
    expect(metrics.backingHeight).toBe(900);
  });
});

import { describe, it, expect } from 'vitest';
import {
  getResponsiveScale,
  computeFillSize,
  computeFitSize,
  getDevicePixelRatio
} from '../../src/core/canvas-sizing';

describe('canvas-sizing', () => {
  describe('getResponsiveScale', () => {
    it('returns 1.0 for reference-size canvas', () => {
      expect(getResponsiveScale(800, 600, 600)).toBe(1.0);
    });

    it('returns 1.5 for larger canvas (clamped at max)', () => {
      expect(getResponsiveScale(1920, 1080, 600)).toBe(1.5);
    });

    it('scales down for smaller canvas', () => {
      expect(getResponsiveScale(375, 250, 600)).toBeCloseTo(0.42, 1);
    });

    it('clamps at minimum 0.3 for very small canvas', () => {
      expect(getResponsiveScale(100, 100, 600)).toBe(0.3);
    });

    it('uses default reference size of 400', () => {
      expect(getResponsiveScale(600, 400)).toBeCloseTo(1.0, 1);
    });
  });

  describe('computeFillSize', () => {
    it('computes correct pixel and css dimensions', () => {
      const result = computeFillSize(800, 600);
      expect(result.cssWidth).toBe(800);
      expect(result.cssHeight).toBe(600);
      expect(result.width).toBeGreaterThanOrEqual(800);
      expect(result.height).toBeGreaterThanOrEqual(600);
      expect(result.responsiveScale).toBeGreaterThan(0);
      expect(result.responsiveScale).toBeLessThanOrEqual(1.5);
    });

    it('includes responsiveScale based on short edge', () => {
      const small = computeFillSize(375, 250);
      expect(small.responsiveScale).toBeLessThan(1.0);

      const large = computeFillSize(1920, 1080);
      expect(large.responsiveScale).toBe(1.5);
    });
  });

  describe('computeFitSize', () => {
    it('fits within container preserving aspect ratio', () => {
      const result = computeFitSize(800, 600, { aspectRatio: 16 / 9 });
      expect(result.cssWidth / result.cssHeight).toBeCloseTo(16 / 9, 1);
      expect(result.cssWidth).toBeLessThanOrEqual(800);
      expect(result.cssHeight).toBeLessThanOrEqual(600);
    });

    it('respects minimum dimensions', () => {
      const result = computeFitSize(50, 50, {
        aspectRatio: 16 / 9,
        minWidth: 100,
        minHeight: 80
      });
      expect(result.cssWidth).toBeGreaterThanOrEqual(100);
      expect(result.cssHeight).toBeGreaterThanOrEqual(80);
    });
  });

  describe('getDevicePixelRatio', () => {
    it('returns at least 1', () => {
      expect(getDevicePixelRatio()).toBeGreaterThanOrEqual(1);
    });

    it('respects maxDpr limit', () => {
      expect(getDevicePixelRatio(1)).toBe(1);
      expect(getDevicePixelRatio(2)).toBeLessThanOrEqual(2);
    });
  });
});

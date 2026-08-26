import { describe, it, expect } from 'vitest';
import { getResponsiveScale } from '../../src/core/canvas-sizing';

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
});

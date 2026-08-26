import { describe, expect, it } from 'vitest';
import {
  thinFilmReflectance,
  whiteLightFilmColor
} from '../../src/core/spectral-color';

describe('spectral-color', () => {
  describe('thinFilmReflectance', () => {
    it('returns 0 when d = 0 (destructive at all wavelengths)', () => {
      const R = thinFilmReflectance(0, 1.33, 550);
      expect(R).toBeCloseTo(0, 6);
    });

    it('returns a value between 0 and ~0.16 for soap film (n=1.33)', () => {
      for (const d of [100, 300, 500, 800, 1500]) {
        for (const lambda of [400, 500, 600, 700]) {
          const R = thinFilmReflectance(d, 1.33, lambda);
          expect(R).toBeGreaterThanOrEqual(0);
          expect(R).toBeLessThanOrEqual(0.2); // R0 ≈ 0.02 for n=1.33, max ≈ 4*R0 ≈ 0.08
        }
      }
    });

    it('increases with n (higher refractive index → more reflection)', () => {
      const R1 = thinFilmReflectance(500, 1.1, 550);
      const R2 = thinFilmReflectance(500, 1.5, 550);
      const R3 = thinFilmReflectance(500, 2.0, 550);
      expect(R2).toBeGreaterThan(R1);
      expect(R3).toBeGreaterThan(R2);
    });

    it('oscillates with thickness (periodic)', () => {
      // For λ=550nm, n=1.33: constructive when 2nd = (m+1/2)λ → d = (m+1/2)λ/(2n)
      const lambda = 550;
      const n = 1.33;
      // First constructive: d = λ/4n
      const dConstructive = lambda / (4 * n);
      const R1 = thinFilmReflectance(dConstructive, n, lambda);
      // First destructive: d = λ/2n
      const dDestructive = lambda / (2 * n);
      const R2 = thinFilmReflectance(dDestructive, n, lambda);
      expect(R1).toBeGreaterThan(R2);
    });
  });

  describe('whiteLightFilmColor', () => {
    it('returns [r, g, b] each in [0, 255]', () => {
      for (const d of [0, 100, 300, 500, 1000, 2000]) {
        const [r, g, b] = whiteLightFilmColor(d, 1.33);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(255);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(255);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(255);
      }
    });

    it('returns near-black for d=0 (no reflection)', () => {
      const [r, g, b] = whiteLightFilmColor(0, 1.33);
      expect(r + g + b).toBeLessThan(30);
    });

    it('returns different colors for different thicknesses', () => {
      const [r1, g1, b1] = whiteLightFilmColor(200, 1.33);
      const [r2, g2, b2] = whiteLightFilmColor(600, 1.33);
      const [r3, g3, b3] = whiteLightFilmColor(1000, 1.33);
      // Colors should differ (not all the same)
      const same1 = r1 === r2 && g1 === g2 && b1 === b2;
      const same2 = r2 === r3 && g2 === g3 && b2 === b3;
      expect(same1 || same2).toBe(false);
    });

    it('produces integer RGB values', () => {
      const [r, g, b] = whiteLightFilmColor(500, 1.33);
      expect(Number.isInteger(r)).toBe(true);
      expect(Number.isInteger(g)).toBe(true);
      expect(Number.isInteger(b)).toBe(true);
    });
  });
});

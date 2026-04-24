import { describe, it, expect } from 'vitest';
import { drawMotion } from '../../src/scenes/chase-meet/renderer/draw-motion';
import { drawGraphs } from '../../src/scenes/chase-meet/renderer/draw-graphs';
import { drawFallback } from '../../src/scenes/chase-meet/renderer/draw-fallback';
import {
  nearestSample,
  resizeCanvasWithDpr,
  resolveVisuals
} from '../../src/scenes/chase-meet/renderer/view-utils';
import type { ChaseMeetSnapshot, ChaseMeetSample } from '../../src/scenes/chase-meet/scene.sim';

function makeCtx(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas.getContext('2d')!;
}

function createSnapshot(): ChaseMeetSnapshot {
  return {
    state: {
      t: 2.5,
      xA: 25,
      xB: 70,
      vA: 10,
      vB: 8,
      distance: 45,
      meetMessage: ''
    },
    params: {
      totalTime: 10,
      dt: 0.02,
      x0A: 0,
      x0B: 50,
      vExprA: '10',
      vExprB: '8'
    },
    samples: [
      { t: 0, xA: 0, xB: 50, vA: 10, vB: 8 },
      { t: 1, xA: 10, xB: 58, vA: 10, vB: 8 },
      { t: 2, xA: 20, xB: 66, vA: 10, vB: 8 },
      { t: 2.5, xA: 25, xB: 70, vA: 10, vB: 8 },
      { t: 3, xA: 30, xB: 74, vA: 10, vB: 8 },
      { t: 10, xA: 100, xB: 130, vA: 10, vB: 8 }
    ],
    bounds: {
      minX: 0,
      maxX: 130,
      maxSpeed: 10
    }
  };
}

describe('chase-meet renderer', () => {
  describe('drawMotion', () => {
    it('draws motion view in dark theme without throwing', () => {
      const ctx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawMotion({
          ctx,
          cssW: 800,
          cssH: 400,
          visualScale: 1,
          snapshot,
          theme: 'dark'
        })
      ).not.toThrow();
    });

    it('draws motion view in light theme without throwing', () => {
      const ctx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawMotion({
          ctx,
          cssW: 800,
          cssH: 400,
          visualScale: 1,
          snapshot,
          theme: 'light'
        })
      ).not.toThrow();
    });
  });

  describe('drawGraphs', () => {
    it('draws graph views in dark theme without throwing', () => {
      const xCtx = makeCtx();
      const vCtx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawGraphs({
          xCtx,
          vCtx,
          xW: 800,
          xH: 300,
          vW: 800,
          vH: 300,
          visualScale: 1,
          snapshot,
          theme: 'dark'
        })
      ).not.toThrow();
    });

    it('draws graph views in light theme without throwing', () => {
      const xCtx = makeCtx();
      const vCtx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawGraphs({
          xCtx,
          vCtx,
          xW: 800,
          xH: 300,
          vW: 800,
          vH: 300,
          visualScale: 1,
          snapshot,
          theme: 'light'
        })
      ).not.toThrow();
    });
  });

  describe('drawFallback', () => {
    it('draws fallback in dark theme without throwing', () => {
      const ctx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawFallback(ctx, 800, 600, snapshot, 'dark')
      ).not.toThrow();
    });

    it('draws fallback in light theme without throwing', () => {
      const ctx = makeCtx();
      const snapshot = createSnapshot();
      expect(() =>
        drawFallback(ctx, 800, 600, snapshot, 'light')
      ).not.toThrow();
    });
  });

  describe('view-utils', () => {
    describe('nearestSample', () => {
      const samples: ChaseMeetSample[] = [
        { t: 0, xA: 0, xB: 10, vA: 5, vB: 3 },
        { t: 1, xA: 5, xB: 13, vA: 5, vB: 3 },
        { t: 2, xA: 10, xB: 16, vA: 5, vB: 3 },
        { t: 5, xA: 25, xB: 25, vA: 5, vB: 3 }
      ];

      it('returns exact match when t equals a sample time', () => {
        const result = nearestSample(samples, 2);
        expect(result.t).toBe(2);
      });

      it('returns nearest sample when t is between two samples', () => {
        const result = nearestSample(samples, 1.4);
        expect(result.t).toBe(1);
      });

      it('returns first sample when t is before all samples', () => {
        const result = nearestSample(samples, -1);
        expect(result.t).toBe(0);
      });

      it('returns last sample when t is after all samples', () => {
        const result = nearestSample(samples, 10);
        expect(result.t).toBe(5);
      });
    });

    describe('resizeCanvasWithDpr', () => {
      it('resizes canvas and sets responsive scale', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        resizeCanvasWithDpr(canvas, ctx, 400, 300, 2);
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
        expect(canvas.style.width).toBe('400px');
        expect(canvas.style.height).toBe('300px');
        expect(canvas.dataset.responsiveScale).toBeDefined();
      });

      it('does not resize when dimensions already match', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        resizeCanvasWithDpr(canvas, ctx, 400, 300, 1);
        const firstWidth = canvas.width;
        const firstHeight = canvas.height;
        resizeCanvasWithDpr(canvas, ctx, 400, 300, 1);
        expect(canvas.width).toBe(firstWidth);
        expect(canvas.height).toBe(firstHeight);
      });

      it('clamps very small dimensions to at least 1 pixel', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        resizeCanvasWithDpr(canvas, ctx, 0.1, 0.1, 1);
        expect(canvas.width).toBeGreaterThanOrEqual(1);
        expect(canvas.height).toBeGreaterThanOrEqual(1);
      });
    });

    describe('resolveVisuals', () => {
      it('returns visuals for normal mode', () => {
        const visuals = resolveVisuals('normal');
        expect(visuals.scale).toBeGreaterThan(0);
        expect(visuals.primaryFontPx).toBeGreaterThan(0);
        expect(visuals.markerRadiusPx).toBeGreaterThan(0);
      });

      it('returns visuals for presentation mode', () => {
        const visuals = resolveVisuals('presentation');
        expect(visuals.scale).toBeGreaterThan(0);
        expect(visuals.primaryFontPx).toBeGreaterThan(0);
        expect(visuals.markerRadiusPx).toBeGreaterThan(0);
      });

      it('applies responsive scaling when canvas dimensions are provided', () => {
        const normal = resolveVisuals('normal');
        const responsive = resolveVisuals('normal', 400, 300);
        expect(responsive.scale).not.toBe(normal.scale);
        expect(responsive.scale).toBeLessThan(normal.scale);
      });

      it('falls back to base values when canvas dimensions are zero', () => {
        const normal = resolveVisuals('normal');
        const zeroDim = resolveVisuals('normal', 0, 0);
        expect(zeroDim.scale).toBe(normal.scale);
      });

      it('scales down for small canvas short edge', () => {
        const large = resolveVisuals('normal', 1000, 800);
        const small = resolveVisuals('normal', 200, 150);
        expect(small.scale).toBeLessThan(large.scale);
      });
    });
  });
});

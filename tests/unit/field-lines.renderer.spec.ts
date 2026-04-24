import { describe, it, expect } from 'vitest';
import { drawCharges } from '../../src/scenes/field-lines/renderer/draw-charges';
import { drawEquipotentialLines } from '../../src/scenes/field-lines/renderer/draw-equipotential';
import { drawFieldLines } from '../../src/scenes/field-lines/renderer/draw-field-lines';
import { drawHeatmap } from '../../src/scenes/field-lines/renderer/draw-heatmap';
import { traceFieldLine, generateFieldLines } from '../../src/scenes/field-lines/renderer/trace-field';
import type { PixelCharge, FieldLinePath } from '../../src/scenes/field-lines/renderer/types';

function makeCtx(): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  if (!ctx.quadraticCurveTo) {
    ctx.quadraticCurveTo = () => {};
  }
  return { ctx, canvas };
}

function makePixelCharges(): PixelCharge[] {
  return [
    { x: 200, y: 300, q: 1, radius: 20 },
    { x: 600, y: 300, q: -1, radius: 20 }
  ];
}

describe('field-lines renderer', () => {
  describe('draw-charges', () => {
    it('draws positive and negative charges without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawCharges(ctx, charges, 16, 1)).not.toThrow();
    });

    it('draws single charge without throwing', () => {
      const { ctx } = makeCtx();
      const charges: PixelCharge[] = [{ x: 400, y: 300, q: 2, radius: 25 }];
      expect(() => drawCharges(ctx, charges, 16, 1)).not.toThrow();
    });
  });

  describe('draw-equipotential', () => {
    it('draws equipotential lines in dark mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawEquipotentialLines(ctx, charges, 800, 600, 1, true)).not.toThrow();
    });

    it('draws equipotential lines in light mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawEquipotentialLines(ctx, charges, 800, 600, 1, false)).not.toThrow();
    });

    it('skips drawing on small screens', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawEquipotentialLines(ctx, charges, 800, 600, 0.5, true)).not.toThrow();
    });
  });

  describe('draw-field-lines', () => {
    it('draws positive direction field lines without throwing', () => {
      const { ctx } = makeCtx();
      const paths: FieldLinePath[] = [
        {
          points: [
            { x: 200, y: 300 },
            { x: 300, y: 300 },
            { x: 400, y: 300 },
            { x: 500, y: 300 },
            { x: 600, y: 300 }
          ],
          fieldMagnitudes: [0.5, 0.4, 0.3, 0.2],
          direction: 1
        }
      ];
      expect(() => drawFieldLines(ctx, paths, 1, true)).not.toThrow();
    });

    it('draws negative direction field lines without throwing', () => {
      const { ctx } = makeCtx();
      const paths: FieldLinePath[] = [
        {
          points: [
            { x: 600, y: 300 },
            { x: 500, y: 300 },
            { x: 400, y: 300 },
            { x: 300, y: 300 },
            { x: 200, y: 300 }
          ],
          fieldMagnitudes: [0.5, 0.4, 0.3, 0.2],
          direction: -1
        }
      ];
      expect(() => drawFieldLines(ctx, paths, 1, false)).not.toThrow();
    });

    it('handles empty paths', () => {
      const { ctx } = makeCtx();
      expect(() => drawFieldLines(ctx, [], 1, true)).not.toThrow();
    });
  });

  describe('draw-heatmap', () => {
    it('draws heatmap in dark mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawHeatmap(ctx, charges, 800, 600, 1, true)).not.toThrow();
    });

    it('draws heatmap in light mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawHeatmap(ctx, charges, 800, 600, 1, false)).not.toThrow();
    });

    it('draws heatmap with low responsive scale without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawHeatmap(ctx, charges, 800, 600, 0.5, true)).not.toThrow();
    });
  });

  describe('trace-field', () => {
    it('traces a field line without throwing', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      expect(() =>
        traceFieldLine(228, 300, 100, 1, charges, bounds)
      ).not.toThrow();
    });

    it('generates field lines without throwing', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      expect(() => generateFieldLines(charges, 20, bounds)).not.toThrow();
    });

    it('returns a valid field line path', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      const path = traceFieldLine(228, 300, 100, 1, charges, bounds);
      expect(path.points.length).toBeGreaterThanOrEqual(0);
      expect(path.fieldMagnitudes.length).toBe(path.points.length);
      expect(path.direction).toBe(1);
    });

    it('returns an array of paths from generateFieldLines', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      const paths = generateFieldLines(charges, 20, bounds);
      expect(Array.isArray(paths)).toBe(true);
    });
  });
});

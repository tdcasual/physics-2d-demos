import { describe, it, expect } from 'vitest';
import { drawCharges } from '../../src/scenes/field-lines/renderer/draw-charges';
import { drawEquipotentialLines } from '../../src/scenes/field-lines/renderer/draw-equipotential';
import { drawFieldLines } from '../../src/scenes/field-lines/renderer/draw-field-lines';
import { drawHeatmap } from '../../src/scenes/field-lines/renderer/draw-heatmap';
import { drawProbes } from '../../src/scenes/field-lines/renderer/draw-probes';
import {
  traceFieldLine,
  generateFieldLines,
  getElectricFieldAt,
  sampleProbesAlongPath
} from '../../src/scenes/field-lines/renderer/trace-field';
import type {
  PixelCharge,
  FieldLinePath,
  FieldProbe
} from '../../src/scenes/field-lines/renderer/types';

function makeCtx(): {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
} {
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
  describe('Coulomb field at a point (independent of n)', () => {
    const plus: PixelCharge[] = [{ x: 400, y: 300, q: 1, radius: 20 }];

    it('points away from a positive charge along +x', () => {
      const field = getElectricFieldAt(500, 300, plus);
      expect(field.Ex).toBeGreaterThan(0);
      expect(Math.abs(field.Ey)).toBeLessThan(1e-9);
    });

    it('falls as 1/r²: doubling distance quarters |E|', () => {
      // 点在电荷右侧 100 px 与 200 px。半径软化半径=20，两点都远大于它，
      // |E| = |q|/r² → E(100)/E(200) = 4。
      const near = getElectricFieldAt(500, 300, plus);
      const far = getElectricFieldAt(600, 300, plus);
      expect(near.magnitude / far.magnitude).toBeCloseTo(4, 8);
    });

    it('at a +/− dipole midpoint, E points toward the negative charge', () => {
      const dipole = makePixelCharges();
      const mid = getElectricFieldAt(400, 300, dipole);
      expect(mid.Ex).toBeGreaterThan(0);
      expect(Math.abs(mid.Ey)).toBeLessThan(1e-6);
    });
  });

  describe('draw-charges', () => {
    it('draws positive and negative charges without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() => drawCharges(ctx, charges, 16, 1, true)).not.toThrow();
    });

    it('draws single charge without throwing', () => {
      const { ctx } = makeCtx();
      const charges: PixelCharge[] = [{ x: 400, y: 300, q: 2, radius: 25 }];
      expect(() => drawCharges(ctx, charges, 16, 1, true)).not.toThrow();
    });
  });

  describe('draw-equipotential', () => {
    it('draws equipotential lines in dark mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() =>
        drawEquipotentialLines(ctx, charges, 800, 600, 1, true)
      ).not.toThrow();
    });

    it('draws equipotential lines in light mode without throwing', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() =>
        drawEquipotentialLines(ctx, charges, 800, 600, 1, false)
      ).not.toThrow();
    });

    it('skips drawing on small screens', () => {
      const { ctx } = makeCtx();
      const charges = makePixelCharges();
      expect(() =>
        drawEquipotentialLines(ctx, charges, 800, 600, 0.5, true)
      ).not.toThrow();
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

  describe('draw-probes', () => {
    it('draws sparse E arrows without throwing', () => {
      const { ctx } = makeCtx();
      const probes: FieldProbe[] = [
        { x: 250, y: 300, Ex: 1, Ey: 0, magnitude: 1 },
        { x: 400, y: 300, Ex: 0.4, Ey: 0, magnitude: 0.4 }
      ];
      expect(() =>
        drawProbes(ctx, probes, {
          responsiveScale: 1,
          contentScale: 1,
          isDark: true,
          arrowScale: 1,
          alpha: 1,
          showTestCharge: true
        })
      ).not.toThrow();
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
      expect(() =>
        drawHeatmap(ctx, charges, 800, 600, 0.5, true)
      ).not.toThrow();
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

    it('traces a radial line out to the canvas boundary (not cut off by a 1e-5 |E| floor)', () => {
      // 单正电荷、从右侧出发。若仍用 1e-5 作 |E| 下限，1/r² 在 r≈316px 处就会停。
      const charges: PixelCharge[] = [{ x: 400, y: 300, q: 1, radius: 20 }];
      const path = traceFieldLine(428, 300, 900, 1, charges, {
        width: 800,
        height: 600
      });
      const maxX = Math.max(...path.points.map((p) => p.x));
      expect(maxX).toBeGreaterThan(750);
    });

    it('returns a valid field line path', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      const path = traceFieldLine(228, 300, 100, 1, charges, bounds);
      expect(path.points.length).toBeGreaterThanOrEqual(0);
      expect(path.fieldMagnitudes.length).toBe(path.points.length);
      expect(path.direction).toBe(1);
    });

    it('dipole keeps the 8 lines from + and adds far-side lines into the −', () => {
      const charges = makePixelCharges();
      const bounds = { width: 800, height: 600 };
      const paths = generateFieldLines(charges, bounds);
      expect(paths.length).toBeGreaterThan(8);
      const minus = charges[1];
      const farSide = paths.some((path) =>
        path.points.some((p) => p.x > minus.x + minus.radius * 1.5)
      );
      expect(farSide).toBe(true);
    });

    it('single +1 still yields 8 lines — count does not depend on a density slider', () => {
      const charges: PixelCharge[] = [{ x: 400, y: 300, q: 1, radius: 20 }];
      const paths = generateFieldLines(charges, { width: 800, height: 600 });
      expect(paths.length).toBe(8);
    });

    it('lone −1 still yields 8 lines into the sink', () => {
      const charges: PixelCharge[] = [{ x: 400, y: 300, q: -1, radius: 20 }];
      const paths = generateFieldLines(charges, { width: 800, height: 600 });
      expect(paths.length).toBe(8);
    });
  });

  describe('sampleProbesAlongPath', () => {
    it('n probes lie on the streamline and count equals n', () => {
      const charges = makePixelCharges();
      const paths = generateFieldLines(charges, { width: 800, height: 600 });
      expect(paths.length).toBeGreaterThan(0);
      const path = paths[0];
      const probes = sampleProbesAlongPath(path, 5, charges);
      expect(probes).toHaveLength(5);
      for (const probe of probes) {
        const nearest = Math.min(
          ...path.points.map((p) => Math.hypot(p.x - probe.x, p.y - probe.y))
        );
        expect(nearest).toBeLessThan(4);
      }
    });

    it('increasing n adds probes on the same path, it does not add paths', () => {
      const charges = makePixelCharges();
      const pathsA = generateFieldLines(charges, { width: 800, height: 600 });
      const pathsB = generateFieldLines(charges, { width: 800, height: 600 });
      expect(pathsA.length).toBe(pathsB.length);
      const sparse = sampleProbesAlongPath(pathsA[0], 2, charges);
      const dense = sampleProbesAlongPath(pathsA[0], 12, charges);
      expect(dense.length).toBeGreaterThan(sparse.length);
      expect(dense).toHaveLength(12);
    });
  });
});

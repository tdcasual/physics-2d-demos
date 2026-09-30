import { describe, it, expect } from 'vitest';
import { drawCircuit } from '../../src/scenes/emf-analogy/renderer/draw-circuit';
import { drawWaterAnalogy } from '../../src/scenes/emf-analogy/renderer/draw-water-analogy';
import {
  resetWaterParticlePools,
  snapshotWaterParticles
} from '../../src/scenes/emf-analogy/renderer/draw-pipe-system';
import type { EmfAnalogySnapshot } from '../../src/scenes/emf-analogy/scene.sim';

function makeCtx(): {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  // happy-dom does not implement arcTo or ellipse
  if (!ctx.arcTo) {
    ctx.arcTo = () => {};
  }
  if (!ctx.ellipse) {
    ctx.ellipse = () => {};
  }
  return { ctx, canvas };
}

function createSnapshot(
  isSystemOn: boolean,
  externalR: number,
  currentI: number
): EmfAnalogySnapshot {
  return {
    state: {
      emf: 1.5,
      internalR: 0.5,
      externalR,
      currentI,
      internalDrop: currentI * 0.5,
      terminalVoltage: 1.5 - currentI * 0.5,
      isSystemOn,
      tapOpening: 0.5,
      phase: 0
    }
  };
}

describe('emf-analogy renderer', () => {
  describe('draw-circuit', () => {
    it('draws circuit when system is off (no current)', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(false, Infinity, 0);
      expect(() =>
        drawCircuit({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'dark',
          phase: 0,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws circuit when system is on with current', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, 2.0, 0.6);
      expect(() =>
        drawCircuit({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'light',
          phase: 0.5,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws circuit with infinite external resistance', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, Infinity, 0);
      expect(() =>
        drawCircuit({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'dark',
          phase: 0,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws circuit with zero external resistance (short circuit)', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, 0, 3.0);
      expect(() =>
        drawCircuit({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'light',
          phase: 0.3,
          responsiveScale: 1
        })
      ).not.toThrow();
    });
  });

  describe('draw-water-analogy', () => {
    it('draws water analogy when system is off', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(false, Infinity, 0);
      expect(() =>
        drawWaterAnalogy({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'dark',
          phase: 0,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws water analogy when system is on with current', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, 2.0, 0.6);
      expect(() =>
        drawWaterAnalogy({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'light',
          phase: 0.5,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws water analogy with infinite external resistance', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, Infinity, 0);
      expect(() =>
        drawWaterAnalogy({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'dark',
          phase: 0,
          responsiveScale: 1
        })
      ).not.toThrow();
    });

    it('draws water analogy with zero external resistance', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot(true, 0, 3.0);
      expect(() =>
        drawWaterAnalogy({
          ctx,
          width: 800,
          height: 600,
          snapshot,
          theme: 'light',
          phase: 0.3,
          responsiveScale: 1
        })
      ).not.toThrow();
    });
  });

  describe('water particle PRNG', () => {
    it('snapshotWaterParticles is byte-identical across two independent fills', () => {
      resetWaterParticlePools();
      const first = snapshotWaterParticles('pipe-pump-turbine', 12);
      const second = snapshotWaterParticles('pipe-pump-turbine', 12);
      expect(first).toEqual(second);
      expect(first).toHaveLength(12);
      for (const p of first) {
        expect(p.t).toBeGreaterThanOrEqual(0);
        expect(p.t).toBeLessThan(1);
        expect(p.yOffset).toBeGreaterThanOrEqual(-0.3);
        expect(p.yOffset).toBeLessThanOrEqual(0.3);
        expect(p.speedOffset).toBeGreaterThanOrEqual(0.8);
        expect(p.speedOffset).toBeLessThanOrEqual(1.2);
        expect(p.size).toBeGreaterThanOrEqual(0.5);
        expect(p.size).toBeLessThanOrEqual(1.3);
      }
    });

    it('distinct pool keys produce distinct particle sequences', () => {
      resetWaterParticlePools();
      const a = snapshotWaterParticles('pipe-pump-turbine', 8);
      const b = snapshotWaterParticles('pipe-mesh-pump', 8);
      expect(a).not.toEqual(b);
    });
  });
});

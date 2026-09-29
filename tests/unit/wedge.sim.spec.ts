import { describe, expect, it } from 'vitest';
import {
  createWedgeSim,
  type WedgeParams
} from '../../src/scenes/wedge/scene.sim';

const DEG_TO_RAD = Math.PI / 180;

const defaultParams: WedgeParams = {
  lambda: 650,
  theta: 0.05,
  L: 5.0,
  step: 'geometry'
};

describe('wedge sim', () => {
  describe('thickness', () => {
    it('equals x * tan(θ) * 1e6 nm', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      const x = s.cursorX * defaultParams.L * 10; // mm
      const expected = x * Math.tan(defaultParams.theta * DEG_TO_RAD) * 1e6;
      expect(s.thickness).toBe(expected);
    });

    it('increases with cursorX', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setCursorX(0.2);
      const t1 = sim.getState().thickness;
      sim.setCursorX(0.8);
      const t2 = sim.getState().thickness;
      expect(t2).toBeGreaterThan(t1);
    });

    it('increases with theta', () => {
      const sim1 = createWedgeSim({ ...defaultParams, theta: 0.03 });
      const sim2 = createWedgeSim({ ...defaultParams, theta: 0.08 });
      sim1.setCursorX(0.5);
      sim2.setCursorX(0.5);
      expect(sim2.getState().thickness).toBeGreaterThan(
        sim1.getState().thickness
      );
    });
  });

  describe('pathDiff', () => {
    it('equals 2 * thickness + λ/2', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      expect(s.pathDiff).toBe(2 * s.thickness + defaultParams.lambda / 2);
    });

    it('λ/2 offset at zero thickness', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setCursorX(0);
      const s = sim.getState();
      expect(s.pathDiff).toBe(defaultParams.lambda / 2);
    });
  });

  describe('fringeSpacing', () => {
    it('equals λ / (2 sin θ) in mm', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      const expected =
        (defaultParams.lambda * 1e-6) /
        (2 * Math.sin(defaultParams.theta * DEG_TO_RAD));
      expect(s.fringeSpacing).toBeCloseTo(expected, 6);
    });

    it('inversely proportional to theta', () => {
      const sim1 = createWedgeSim({ ...defaultParams, theta: 0.03 });
      const sim2 = createWedgeSim({ ...defaultParams, theta: 0.06 });
      expect(sim1.getState().fringeSpacing).toBeGreaterThan(
        sim2.getState().fringeSpacing
      );
    });

    it('proportional to lambda', () => {
      const sim1 = createWedgeSim({ ...defaultParams, lambda: 400 });
      const sim2 = createWedgeSim({ ...defaultParams, lambda: 700 });
      expect(sim2.getState().fringeSpacing).toBeGreaterThan(
        sim1.getState().fringeSpacing
      );
    });
  });

  describe('intensity and isBright', () => {
    it('intensity = sin²(2πd/λ)', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      const phase = (2 * Math.PI * s.thickness) / defaultParams.lambda;
      const expected = Math.sin(phase) ** 2;
      expect(s.intensity).toBeCloseTo(expected, 6);
    });

    it('intensity is between 0 and 1', () => {
      for (const cursorX of [0, 0.25, 0.5, 0.75, 1.0]) {
        const sim = createWedgeSim(defaultParams);
        sim.setCursorX(cursorX);
        const { intensity } = sim.getState();
        expect(intensity).toBeGreaterThanOrEqual(0);
        expect(intensity).toBeLessThanOrEqual(1);
      }
    });

    it('isBright when intensity > 0.5', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      expect(s.isBright).toBe(s.intensity > 0.5);
    });
  });

  describe('phaseDiff', () => {
    it('equals 2π * pathDiff / λ', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      const expected = (2 * Math.PI * s.pathDiff) / defaultParams.lambda;
      expect(s.phaseDiff).toBeCloseTo(expected, 4);
    });
  });

  describe('order', () => {
    it('equals pathDiff / lambda', () => {
      const sim = createWedgeSim(defaultParams);
      const s = sim.getState();
      expect(s.order).toBeCloseTo(s.pathDiff / defaultParams.lambda, 6);
    });
  });

  describe('setCursorX', () => {
    it('clamps to [0, 1]', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setCursorX(-0.5);
      expect(sim.getState().cursorX).toBe(0);
      sim.setCursorX(1.5);
      expect(sim.getState().cursorX).toBe(1);
    });
  });

  describe('setParams', () => {
    it('updates a single parameter', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setParams({ lambda: 500 });
      expect(sim.getState().params.lambda).toBe(500);
    });

    it('updates multiple parameters', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setParams({ lambda: 500, theta: 0.08 });
      expect(sim.getState().params.lambda).toBe(500);
      expect(sim.getState().params.theta).toBe(0.08);
    });

    it('recalculates state after update', () => {
      const sim = createWedgeSim(defaultParams);
      const before = sim.getState().fringeSpacing;
      sim.setParams({ theta: 0.1 });
      const after = sim.getState().fringeSpacing;
      expect(after).toBeLessThan(before);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setParams({ lambda: 400, theta: 0.1 });
      sim.setCursorX(0.9);
      sim.reset();
      const s = sim.getState();
      expect(s.params.lambda).toBe(650);
      expect(s.params.theta).toBe(0.05);
      expect(s.cursorX).toBe(0.3);
    });

    it('resets time', () => {
      const sim = createWedgeSim(defaultParams);
      sim.step(1);
      sim.reset();
      expect(sim.getState().time).toBe(0);
    });
  });

  describe('step', () => {
    it('advances time', () => {
      const sim = createWedgeSim(defaultParams);
      const before = sim.getState().time;
      sim.step(1 / 60);
      expect(sim.getState().time).toBeGreaterThan(before);
    });

    it('does not change params', () => {
      const sim = createWedgeSim(defaultParams);
      sim.step(1);
      expect(sim.getState().params).toEqual(defaultParams);
    });
  });

  describe('boundary values', () => {
    it('lambda at 400nm', () => {
      const sim = createWedgeSim({ ...defaultParams, lambda: 400 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.fringeSpacing)).toBe(true);
    });

    it('lambda at 700nm', () => {
      const sim = createWedgeSim({ ...defaultParams, lambda: 700 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.fringeSpacing)).toBe(true);
    });

    it('theta at min (0.01°)', () => {
      const sim = createWedgeSim({ ...defaultParams, theta: 0.01 });
      const s = sim.getState();
      expect(Number.isFinite(s.fringeSpacing)).toBe(true);
      expect(s.fringeSpacing).toBeGreaterThan(0);
    });

    it('theta at max (0.15°)', () => {
      const sim = createWedgeSim({ ...defaultParams, theta: 0.15 });
      const s = sim.getState();
      expect(Number.isFinite(s.fringeSpacing)).toBe(true);
    });

    it('cursorX at 0', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setCursorX(0);
      expect(sim.getState().thickness).toBe(0);
    });

    it('cursorX at 1', () => {
      const sim = createWedgeSim(defaultParams);
      sim.setCursorX(1);
      const s = sim.getState();
      expect(s.thickness).toBeGreaterThan(0);
      expect(Number.isFinite(s.pathDiff)).toBe(true);
    });
  });
});

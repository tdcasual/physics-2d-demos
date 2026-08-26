import { describe, expect, it } from 'vitest';
import {
  createThinFilmSim,
  thicknessAtY,
  type ThinFilmParams
} from '../../src/scenes/thin-film/scene.sim';

const defaultParams: ThinFilmParams = {
  lambda: 550,
  dTop: 100,
  dBottom: 800,
  n: 1.33,
  whiteLight: false,
  step: 'geometry'
};

describe('thin-film sim', () => {
  describe('thicknessAtY', () => {
    it('returns dTop at y=0', () => {
      expect(thicknessAtY(100, 800, 0)).toBe(100);
    });

    it('returns dBottom at y=1', () => {
      expect(thicknessAtY(100, 800, 1)).toBe(800);
    });

    it('returns midpoint at y=0.5', () => {
      expect(thicknessAtY(100, 800, 0.5)).toBe(450);
    });

    it('works with equal dTop and dBottom', () => {
      expect(thicknessAtY(500, 500, 0.3)).toBe(500);
      expect(thicknessAtY(500, 500, 0.7)).toBe(500);
    });
  });

  describe('localThickness at cursor', () => {
    it('equals dTop when cursorY = 0', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(0);
      expect(sim.getState().localThickness).toBe(100);
    });

    it('equals dBottom when cursorY = 1', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(1);
      expect(sim.getState().localThickness).toBe(800);
    });

    it('equals midpoint when cursorY = 0.5', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(0.5);
      expect(sim.getState().localThickness).toBe(450);
    });

    it('clamps cursorY to [0, 1]', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(-1);
      expect(sim.getState().cursorY).toBe(0);
      sim.setCursorY(2);
      expect(sim.getState().cursorY).toBe(1);
    });
  });

  describe('pathDiff', () => {
    it('equals 2nd + λ/2 at near-normal incidence', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(0.5);
      const s = sim.getState();
      const d = 450; // midpoint of 100 and 800
      const expected = 2 * 1.33 * d + 550 / 2;
      expect(s.pathDiff).toBeCloseTo(expected, 2);
    });

    it('increases with dBottom (thicker film at cursor)', () => {
      const sim1 = createThinFilmSim({ ...defaultParams, dBottom: 400 });
      const sim2 = createThinFilmSim({ ...defaultParams, dBottom: 1200 });
      sim1.setCursorY(0.5);
      sim2.setCursorY(0.5);
      expect(sim2.getState().pathDiff).toBeGreaterThan(
        sim1.getState().pathDiff
      );
    });

    it('increases with n', () => {
      const sim1 = createThinFilmSim({ ...defaultParams, n: 1.1 });
      const sim2 = createThinFilmSim({ ...defaultParams, n: 2.0 });
      sim1.setCursorY(0.5);
      sim2.setCursorY(0.5);
      expect(sim2.getState().pathDiff).toBeGreaterThan(
        sim1.getState().pathDiff
      );
    });

    it('λ/2 offset is always present', () => {
      const sim = createThinFilmSim({ ...defaultParams, dTop: 0, dBottom: 0 });
      const s = sim.getState();
      expect(s.pathDiff).toBeCloseTo(s.params.lambda / 2, 2);
    });
  });

  describe('phaseDiff', () => {
    it('equals 2π·pathDiff/λ', () => {
      const sim = createThinFilmSim(defaultParams);
      const s = sim.getState();
      const expected = (2 * Math.PI * s.pathDiff) / defaultParams.lambda;
      expect(s.phaseDiff).toBeCloseTo(expected, 4);
    });
  });

  describe('reflectivity', () => {
    it('is between 0 and 1', () => {
      const cases = [
        { lambda: 400, dTop: 50, dBottom: 50, n: 1.0 },
        { lambda: 700, dTop: 2000, dBottom: 2000, n: 2.5 },
        { lambda: 550, dTop: 100, dBottom: 800, n: 1.5 }
      ];
      for (const p of cases) {
        const sim = createThinFilmSim({ ...defaultParams, ...p });
        const { reflectivity } = sim.getState();
        expect(reflectivity).toBeGreaterThanOrEqual(0);
        expect(reflectivity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('isConstructive', () => {
    it('is true when reflectivity > 0.5', () => {
      const sim = createThinFilmSim(defaultParams);
      const s = sim.getState();
      expect(s.isConstructive).toBe(s.reflectivity > 0.5);
    });
  });

  describe('order', () => {
    it('equals pathDiff / lambda', () => {
      const sim = createThinFilmSim(defaultParams);
      const s = sim.getState();
      expect(s.order).toBeCloseTo(s.pathDiff / defaultParams.lambda, 6);
    });
  });

  describe('setParams', () => {
    it('updates a single parameter', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setParams({ lambda: 500 });
      expect(sim.getState().params.lambda).toBe(500);
      expect(sim.getState().params.dTop).toBe(100);
    });

    it('updates multiple parameters', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setParams({ lambda: 500, n: 2.0 });
      expect(sim.getState().params.lambda).toBe(500);
      expect(sim.getState().params.n).toBe(2.0);
    });

    it('returns the updated params', () => {
      const sim = createThinFilmSim(defaultParams);
      const result = sim.setParams({ lambda: 500 });
      expect(result.lambda).toBe(500);
    });

    it('recalculates state after update', () => {
      const sim = createThinFilmSim(defaultParams);
      const before = sim.getState().pathDiff;
      sim.setParams({ dBottom: 2000 });
      const after = sim.getState().pathDiff;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('setCursorY', () => {
    it('changes the local thickness', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(0);
      const thin = sim.getState().localThickness;
      sim.setCursorY(1);
      const thick = sim.getState().localThickness;
      expect(thick).toBeGreaterThan(thin);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setParams({ lambda: 400, dTop: 50, dBottom: 2000, n: 2.0 });
      sim.reset();
      const s = sim.getState();
      expect(s.params.lambda).toBe(550);
      expect(s.params.dTop).toBe(100);
      expect(s.params.dBottom).toBe(800);
      expect(s.params.n).toBe(1.33);
    });

    it('resets cursorY to 0.5', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setCursorY(0.1);
      sim.reset();
      expect(sim.getState().cursorY).toBe(0.5);
    });

    it('resets time to 0', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.step(1);
      sim.step(1);
      sim.reset();
      expect(sim.getState().time).toBe(0);
    });
  });

  describe('step', () => {
    it('advances time', () => {
      const sim = createThinFilmSim(defaultParams);
      const before = sim.getState().time;
      sim.step(1 / 60);
      const after = sim.getState().time;
      expect(after).toBeGreaterThan(before);
    });

    it('does not change params', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.step(1);
      expect(sim.getState().params).toEqual(defaultParams);
    });
  });

  describe('boundary values', () => {
    it('lambda at min (400nm)', () => {
      const sim = createThinFilmSim({ ...defaultParams, lambda: 400 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('lambda at max (700nm)', () => {
      const sim = createThinFilmSim({ ...defaultParams, lambda: 700 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('dTop at min (50nm)', () => {
      const sim = createThinFilmSim({
        ...defaultParams,
        dTop: 50,
        dBottom: 50
      });
      sim.setCursorY(0);
      const s = sim.getState();
      expect(s.pathDiff).toBeGreaterThan(0);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('dBottom at max (2000nm)', () => {
      const sim = createThinFilmSim({ ...defaultParams, dBottom: 2000 });
      const s = sim.getState();
      expect(s.pathDiff).toBeGreaterThan(0);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('n = 1.0 (same as air)', () => {
      const sim = createThinFilmSim({ ...defaultParams, n: 1.0 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('n = 2.5 (high index)', () => {
      const sim = createThinFilmSim({ ...defaultParams, n: 2.5 });
      const s = sim.getState();
      expect(Number.isFinite(s.pathDiff)).toBe(true);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });
  });
});

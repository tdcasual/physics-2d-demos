import { describe, expect, it } from 'vitest';
import {
  createThinFilmSim,
  type ThinFilmParams
} from '../../src/scenes/thin-film/scene.sim';

const DEG_TO_RAD = Math.PI / 180;

const defaultParams: ThinFilmParams = {
  lambda: 650,
  d: 500,
  n: 1.5,
  incidence: 30,
  step: 'geometry',
};

describe('thin-film sim', () => {
  describe('snellLaw (via refraction)', () => {
    it('normal incidence yields 0° refraction', () => {
      const sim = createThinFilmSim({ ...defaultParams, incidence: 0 });
      expect(sim.getState().refraction).toBeCloseTo(0, 6);
    });

    it('computes refraction for n=1.5, i=30°', () => {
      const sim = createThinFilmSim({ ...defaultParams, n: 1.5, incidence: 30 });
      const expected = Math.asin(Math.sin(30 * DEG_TO_RAD) / 1.5) / DEG_TO_RAD;
      expect(sim.getState().refraction).toBeCloseTo(expected, 4);
    });

    it('refraction < incidence when n > 1', () => {
      const sim = createThinFilmSim({ ...defaultParams, incidence: 45 });
      const { refraction } = sim.getState();
      expect(refraction).toBeLessThan(45);
      expect(refraction).toBeGreaterThan(0);
    });

    it('at i=0, refraction is exactly 0 regardless of n', () => {
      for (const n of [1.0, 1.33, 1.5, 2.0]) {
        const sim = createThinFilmSim({ ...defaultParams, n, incidence: 0 });
        expect(sim.getState().refraction).toBeCloseTo(0, 6);
      }
    });
  });

  describe('pathDiff', () => {
    it('equals 2nd·cos r + λ/2', () => {
      const sim = createThinFilmSim(defaultParams);
      const s = sim.getState();
      const rRad = s.refraction * DEG_TO_RAD;
      const expected = 2 * defaultParams.n * defaultParams.d * Math.cos(rRad) + defaultParams.lambda / 2;
      expect(s.pathDiff).toBeCloseTo(expected, 2);
    });

    it('increases with d', () => {
      const sim1 = createThinFilmSim({ ...defaultParams, d: 300 });
      const sim2 = createThinFilmSim({ ...defaultParams, d: 600 });
      expect(sim2.getState().pathDiff).toBeGreaterThan(sim1.getState().pathDiff);
    });

    it('increases with n', () => {
      const sim1 = createThinFilmSim({ ...defaultParams, n: 1.3 });
      const sim2 = createThinFilmSim({ ...defaultParams, n: 2.0 });
      expect(sim2.getState().pathDiff).toBeGreaterThan(sim1.getState().pathDiff);
    });

    it('λ/2 offset is always present', () => {
      const sim = createThinFilmSim({ ...defaultParams, d: 0 });
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
    it('equals cos²(π·pathDiff/λ)', () => {
      const sim = createThinFilmSim(defaultParams);
      const s = sim.getState();
      const phase = (Math.PI * s.pathDiff) / defaultParams.lambda;
      const expected = Math.cos(phase) ** 2;
      expect(s.reflectivity).toBeCloseTo(expected, 6);
    });

    it('is between 0 and 1', () => {
      const cases = [
        { lambda: 400, d: 100, n: 1.0, incidence: 0 },
        { lambda: 700, d: 2000, n: 2.5, incidence: 80 },
        { lambda: 550, d: 500, n: 1.5, incidence: 45 },
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
      expect(sim.getState().params.d).toBe(500);
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
      sim.setParams({ d: 1000 });
      const after = sim.getState().pathDiff;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createThinFilmSim(defaultParams);
      sim.setParams({ lambda: 400, d: 1000, n: 2.0, incidence: 60 });
      sim.reset();
      const s = sim.getState();
      expect(s.params.lambda).toBe(650);
      expect(s.params.d).toBe(500);
      expect(s.params.n).toBe(1.5);
      expect(s.params.incidence).toBe(30);
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

    it('d at min (100nm)', () => {
      const sim = createThinFilmSim({ ...defaultParams, d: 100 });
      const s = sim.getState();
      expect(s.pathDiff).toBeGreaterThan(0);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('d at max (2000nm)', () => {
      const sim = createThinFilmSim({ ...defaultParams, d: 2000 });
      const s = sim.getState();
      expect(s.pathDiff).toBeGreaterThan(0);
      expect(Number.isFinite(s.reflectivity)).toBe(true);
    });

    it('incidence at 0°', () => {
      const sim = createThinFilmSim({ ...defaultParams, incidence: 0 });
      expect(sim.getState().refraction).toBeCloseTo(0, 6);
    });

    it('incidence at 80°', () => {
      const sim = createThinFilmSim({ ...defaultParams, incidence: 80 });
      const s = sim.getState();
      expect(s.refraction).toBeLessThan(80);
      expect(Number.isFinite(s.pathDiff)).toBe(true);
    });

    it('n = 1.0 (same as air)', () => {
      const sim = createThinFilmSim({ ...defaultParams, n: 1.0 });
      const s = sim.getState();
      expect(s.refraction).toBeCloseTo(defaultParams.incidence, 4);
      expect(Number.isFinite(s.pathDiff)).toBe(true);
    });

    it('n = 2.5 (high index)', () => {
      const sim = createThinFilmSim({ ...defaultParams, n: 2.5 });
      const s = sim.getState();
      expect(s.refraction).toBeLessThan(defaultParams.incidence);
      expect(Number.isFinite(s.pathDiff)).toBe(true);
    });
  });
});

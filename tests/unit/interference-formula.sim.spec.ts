import { describe, expect, it } from 'vitest';
import {
  createInterferenceFormulaSim,
  type InterferenceFormulaParams
} from '../../src/scenes/interference-formula/scene.sim';

const defaultParams: InterferenceFormulaParams = {
  lambda: 650,
  L: 1.0,
  d: 0.5,
  step: 'geometry',
};

describe('interference-formula sim', () => {
  describe('computeDeltaX (via getState)', () => {
    it('computes Δx = λL/d with unit conversion (nm→m, mm→m)', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const state = sim.getState();
      // λ=650nm=650e-9m, L=1.0m, d=0.5mm=0.5e-3m
      // Δx = 650e-9 * 1.0 / 0.5e-3 = 1.3e-3 m = 1.3 mm
      expect(state.deltaX).toBeCloseTo(1.3e-3, 8);
    });

    it('scales linearly with lambda', () => {
      const sim1 = createInterferenceFormulaSim({ ...defaultParams, lambda: 400 });
      const sim2 = createInterferenceFormulaSim({ ...defaultParams, lambda: 800 });
      expect(sim2.getState().deltaX).toBeCloseTo(sim1.getState().deltaX * 2, 10);
    });

    it('scales linearly with L', () => {
      const sim1 = createInterferenceFormulaSim({ ...defaultParams, L: 1.0 });
      const sim2 = createInterferenceFormulaSim({ ...defaultParams, L: 2.0 });
      expect(sim2.getState().deltaX).toBeCloseTo(sim1.getState().deltaX * 2, 10);
    });

    it('scales inversely with d', () => {
      const sim1 = createInterferenceFormulaSim({ ...defaultParams, d: 0.5 });
      const sim2 = createInterferenceFormulaSim({ ...defaultParams, d: 1.0 });
      expect(sim2.getState().deltaX).toBeCloseTo(sim1.getState().deltaX / 2, 10);
    });

    it.each([
      { lambda: 400, L: 0.5, d: 1.0, expected: 2e-4 },
      { lambda: 700, L: 3.0, d: 0.1, expected: 21e-3 },
      { lambda: 550, L: 2.0, d: 0.8, expected: 1.375e-3 },
    ])('Δx($lambda, $L, $d) = $expected', ({ lambda, L, d, expected }) => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, lambda, L, d });
      expect(sim.getState().deltaX).toBeCloseTo(expected, 8);
    });
  });

  describe('computeFringePositions (via getState)', () => {
    it('returns 21 positions (m = -10..+10)', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const { fringePositions } = sim.getState();
      expect(fringePositions).toHaveLength(21);
    });

    it('center fringe is at 0', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const { fringePositions } = sim.getState();
      expect(fringePositions[10]).toBe(0);
    });

    it('positions are symmetric around center', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const { fringePositions } = sim.getState();
      for (let i = 0; i < 10; i++) {
        expect(fringePositions[i]).toBeCloseTo(-fringePositions[20 - i], 12);
      }
    });

    it('spacing equals deltaX', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const { fringePositions, deltaX } = sim.getState();
      for (let i = 1; i < fringePositions.length; i++) {
        expect(fringePositions[i] - fringePositions[i - 1]).toBeCloseTo(deltaX, 12);
      }
    });
  });

  describe('setParams', () => {
    it('updates a single parameter', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      sim.setParams({ lambda: 500 });
      expect(sim.getState().params.lambda).toBe(500);
      expect(sim.getState().params.L).toBe(1.0);
    });

    it('updates multiple parameters', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      sim.setParams({ lambda: 500, L: 2.0 });
      expect(sim.getState().params.lambda).toBe(500);
      expect(sim.getState().params.L).toBe(2.0);
    });

    it('returns the updated params', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const result = sim.setParams({ lambda: 500 });
      expect(result.lambda).toBe(500);
    });

    it('recalculates deltaX after update', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const before = sim.getState().deltaX;
      sim.setParams({ lambda: 400 });
      const after = sim.getState().deltaX;
      expect(after).toBeLessThan(before);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      sim.setParams({ lambda: 400, L: 2.0, d: 1.0 });
      sim.reset();
      const state = sim.getState();
      expect(state.params.lambda).toBe(650);
      expect(state.params.L).toBe(1.0);
      expect(state.params.d).toBe(0.5);
    });

    it('recalculates deltaX to initial value', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const initialDeltaX = sim.getState().deltaX;
      sim.setParams({ lambda: 400 });
      sim.reset();
      expect(sim.getState().deltaX).toBeCloseTo(initialDeltaX, 12);
    });
  });

  describe('step', () => {
    it('is a no-op (static scene)', () => {
      const sim = createInterferenceFormulaSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after.deltaX).toBe(before.deltaX);
      expect(after.params).toEqual(before.params);
    });
  });

  describe('boundary values', () => {
    it('lambda at min (400nm)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, lambda: 400 });
      const { deltaX } = sim.getState();
      expect(deltaX).toBeGreaterThan(0);
      expect(Number.isFinite(deltaX)).toBe(true);
    });

    it('lambda at max (700nm)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, lambda: 700 });
      const { deltaX } = sim.getState();
      expect(deltaX).toBeGreaterThan(0);
      expect(Number.isFinite(deltaX)).toBe(true);
    });

    it('L at min (0.5m)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, L: 0.5 });
      expect(sim.getState().deltaX).toBeGreaterThan(0);
    });

    it('L at max (3.0m)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, L: 3.0 });
      expect(sim.getState().deltaX).toBeGreaterThan(0);
    });

    it('d at min (0.1mm)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, d: 0.1 });
      const { deltaX } = sim.getState();
      expect(deltaX).toBeGreaterThan(0);
      expect(Number.isFinite(deltaX)).toBe(true);
    });

    it('d at max (1.0mm)', () => {
      const sim = createInterferenceFormulaSim({ ...defaultParams, d: 1.0 });
      expect(sim.getState().deltaX).toBeGreaterThan(0);
    });
  });
});

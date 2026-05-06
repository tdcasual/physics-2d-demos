import { describe, expect, it } from 'vitest';
import {
  createMicrometerSim,
  type MicrometerParams
} from '../../src/scenes/micrometer/scene.sim';

const defaultParams: MicrometerParams = {
  reading: 4.593,
};

describe('micrometer sim', () => {
  describe('computeState decomposition', () => {
    it('mainScaleReading is 0.5mm multiple floor', () => {
      const sim = createMicrometerSim({ reading: 4.593 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(4.5);
    });

    it('drumReading = (reading - mainScale) / 0.01', () => {
      const sim = createMicrometerSim({ reading: 4.593 });
      const s = sim.getState();
      expect(s.drumReading).toBeCloseTo(9.3, 1);
    });

    it('drumRotation = reading / 0.5', () => {
      const sim = createMicrometerSim({ reading: 4.593 });
      const s = sim.getState();
      expect(s.drumRotation).toBeCloseTo(4.593 / 0.5, 4);
    });

    it('totalReading equals reading', () => {
      const sim = createMicrometerSim({ reading: 4.593 });
      const s = sim.getState();
      expect(s.totalReading).toBeCloseTo(4.593, 4);
    });

    it('hasHalfMm is true when remainder >= 0.5', () => {
      const sim = createMicrometerSim({ reading: 4.7 });
      expect(sim.getState().hasHalfMm).toBe(true);
    });

    it('hasHalfMm is true at exact 0.5 boundary', () => {
      const sim = createMicrometerSim({ reading: 4.5 });
      expect(sim.getState().hasHalfMm).toBe(true);
    });
  });

  describe('known values', () => {
    it('reading=3.000 → main=3.0, drum=0', () => {
      const sim = createMicrometerSim({ reading: 3.0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(3.0);
      expect(s.drumReading).toBeCloseTo(0, 4);
    });

    it('reading=5.240 → main=5.0, drum=24.0', () => {
      const sim = createMicrometerSim({ reading: 5.24 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(5.0);
      expect(s.drumReading).toBeCloseTo(24.0, 1);
    });

    it('reading=0.008 → main=0, drum=0.8', () => {
      const sim = createMicrometerSim({ reading: 0.008 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(0);
      expect(s.drumReading).toBeCloseTo(0.8, 1);
    });
  });

  describe('setParams', () => {
    it('updates reading', () => {
      const sim = createMicrometerSim(defaultParams);
      sim.setParams({ reading: 7.123 });
      expect(sim.getState().reading).toBeCloseTo(7.123, 4);
    });

    it('returns updated params', () => {
      const sim = createMicrometerSim(defaultParams);
      const result = sim.setParams({ reading: 2.0 });
      expect(result.reading).toBe(2.0);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createMicrometerSim(defaultParams);
      sim.setParams({ reading: 1.0 });
      sim.reset();
      expect(sim.getState().reading).toBeCloseTo(4.593, 4);
    });
  });

  describe('step', () => {
    it('is a no-op (static scene)', () => {
      const sim = createMicrometerSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after.reading).toBe(before.reading);
    });
  });

  describe('boundary values', () => {
    it('reading=0', () => {
      const sim = createMicrometerSim({ reading: 0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(0);
      expect(s.drumReading).toBeCloseTo(0, 4);
      expect(s.totalReading).toBe(0);
    });

    it('reading=10 (max)', () => {
      const sim = createMicrometerSim({ reading: 10 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(10);
      expect(s.totalReading).toBe(10);
    });

    it('reading clamped above 10', () => {
      const sim = createMicrometerSim({ reading: 15 });
      expect(sim.getState().reading).toBeLessThanOrEqual(10);
    });

    it('reading clamped below 0', () => {
      const sim = createMicrometerSim({ reading: -5 });
      expect(sim.getState().reading).toBeGreaterThanOrEqual(0);
    });
  });
});

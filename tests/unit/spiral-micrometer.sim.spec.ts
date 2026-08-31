import { describe, expect, it } from 'vitest';
import {
  createSpiralMicrometerSim,
  type SpiralMicrometerParams
} from '../../src/instruments/spiral-micrometer/instrument.sim';
import { spiralMicrometerMeta } from '../../src/instruments/spiral-micrometer/instrument.meta';

const defaultParams: SpiralMicrometerParams =
  spiralMicrometerMeta.defaultParams;

describe('spiral-micrometer sim', () => {
  describe('computeState decomposition', () => {
    it('mainScaleReading is 0.5mm multiple floor', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.593 });
      expect(sim.getState().mainScaleReading).toBe(4.5);
    });

    it('drumReading = (reading - mainScale) / 0.01', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.593 });
      expect(sim.getState().drumReading).toBeCloseTo(9.3, 1);
    });

    it('drumRotation = reading / 0.5', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.593 });
      expect(sim.getState().drumRotation).toBeCloseTo(4.593 / 0.5, 4);
    });

    it('currentReading equals reading and zeroOffset is 0', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.593 });
      const s = sim.getState();
      expect(s.currentReading).toBeCloseTo(4.593, 4);
      expect(s.zeroOffset).toBe(0);
    });

    it('hasHalfMm is true when remainder >= 0.5', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.7 });
      expect(sim.getState().hasHalfMm).toBe(true);
    });

    it('hasHalfMm is true at exact 0.5 boundary', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.5 });
      expect(sim.getState().hasHalfMm).toBe(true);
    });

    it('hasHalfMm is false at exact integer', () => {
      const sim = createSpiralMicrometerSim({ reading: 3.0 });
      expect(sim.getState().hasHalfMm).toBe(false);
    });

    it('hasHalfMm is false when remainder < 0.5', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.3 });
      expect(sim.getState().hasHalfMm).toBe(false);
    });

    it('0.5mm floor: 4.4999 stays on the lower mark', () => {
      const sim = createSpiralMicrometerSim({ reading: 4.4999 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(4.0);
      expect(s.hasHalfMm).toBe(false);
      expect(s.drumReading).toBeCloseTo(49.99, 1);
    });
  });

  describe('known values', () => {
    it('meta default 6.725 → main=6.5, drum=22.5, half line visible', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(6.5);
      expect(s.drumReading).toBeCloseTo(22.5, 1);
      expect(s.hasHalfMm).toBe(true);
    });

    it('reading=3.000 → main=3.0, drum=0', () => {
      const sim = createSpiralMicrometerSim({ reading: 3.0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(3.0);
      expect(s.drumReading).toBeCloseTo(0, 4);
    });

    it('reading=0.008 → main=0, drum=0.8', () => {
      const sim = createSpiralMicrometerSim({ reading: 0.008 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(0);
      expect(s.drumReading).toBeCloseTo(0.8, 1);
    });
  });

  describe('setParams', () => {
    it('updates reading', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      sim.setParams({ reading: 7.123 });
      expect(sim.getState().reading).toBeCloseTo(7.123, 4);
    });

    it('ignores non-number reading', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      sim.setParams({ reading: 'oops' as unknown as number });
      expect(sim.getState().reading).toBeCloseTo(defaultParams.reading, 4);
    });

    it('empty update keeps reading unchanged', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      sim.setParams({});
      expect(sim.getState().reading).toBeCloseTo(defaultParams.reading, 4);
    });
  });

  describe('reset', () => {
    it('restores initial reading', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      sim.setParams({ reading: 1.0 });
      sim.reset();
      expect(sim.getState().reading).toBeCloseTo(defaultParams.reading, 4);
    });
  });

  describe('step', () => {
    it('is a no-op (static instrument)', () => {
      const sim = createSpiralMicrometerSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after.reading).toBe(before.reading);
    });
  });

  describe('boundary values', () => {
    it('reading=0', () => {
      const sim = createSpiralMicrometerSim({ reading: 0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(0);
      expect(s.drumReading).toBeCloseTo(0, 4);
      expect(s.currentReading).toBe(0);
      expect(s.hasHalfMm).toBe(false);
    });

    it('reading=25 (max range)', () => {
      const sim = createSpiralMicrometerSim({ reading: 25 });
      const s = sim.getState();
      expect(s.reading).toBe(25);
      expect(s.mainScaleReading).toBe(25);
      expect(s.currentReading).toBe(25);
    });

    it('reading clamped above 25', () => {
      const sim = createSpiralMicrometerSim({ reading: 30 });
      expect(sim.getState().reading).toBe(25);
    });

    it('reading clamped below 0', () => {
      const sim = createSpiralMicrometerSim({ reading: -5 });
      expect(sim.getState().reading).toBe(0);
    });
  });
});

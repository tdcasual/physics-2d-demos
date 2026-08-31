import { describe, expect, it } from 'vitest';
import {
  createVernierCaliperSim,
  type CaliperPrecision,
  type VernierCaliperParams
} from '../../src/instruments/vernier-caliper/instrument.sim';
import { vernierCaliperMeta } from '../../src/instruments/vernier-caliper/instrument.meta';

const defaultParams: VernierCaliperParams = vernierCaliperMeta.defaultParams;

describe('vernier-caliper instrument sim', () => {
  describe('precision mapping', () => {
    it.each([
      { precision: 0.1 as CaliperPrecision, divisions: 10, length: 9 },
      { precision: 0.05 as CaliperPrecision, divisions: 20, length: 19 },
      { precision: 0.02 as CaliperPrecision, divisions: 50, length: 49 }
    ])(
      'precision $precision → $divisions divisions, length $length',
      ({ precision, divisions, length }) => {
        const sim = createVernierCaliperSim({ precision, objectType: 0 });
        const s = sim.getState();
        expect(s.vernierDivisions).toBe(divisions);
        expect(s.vernierLength).toBe(length);
      }
    );

    it('unknown precision falls back to 50-division config in state', () => {
      const sim = createVernierCaliperSim({
        precision: 0.03 as CaliperPrecision,
        objectType: 0
      });
      const s = sim.getState();
      expect(s.vernierDivisions).toBe(50);
      expect(s.vernierLength).toBe(49);
    });
  });

  describe('reading decomposition', () => {
    it('mainScaleReading is the integer-mm floor of the jaw position', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 0 });
      const s = sim.getState();
      expect(s.jawPosition).toBe(5.24);
      expect(s.mainScaleReading).toBe(5);
    });

    it('totalReading = mainScaleReading + vernierAlignment × precision', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 0 });
      const s = sim.getState();
      expect(s.totalReading).toBeCloseTo(
        s.mainScaleReading + s.vernierAlignment * 0.02,
        6
      );
      expect(s.currentReading).toBeCloseTo(s.totalReading, 6);
    });

    it('vernierAlignment stays within [0, divisions)', () => {
      for (const precision of [0.1, 0.05, 0.02] as CaliperPrecision[]) {
        for (const objectType of [0, 1, 2]) {
          const sim = createVernierCaliperSim({ precision, objectType });
          const s = sim.getState();
          expect(s.vernierAlignment).toBeGreaterThanOrEqual(0);
          expect(s.vernierAlignment).toBeLessThan(s.vernierDivisions);
        }
      }
    });
  });

  describe('known values', () => {
    it('0.02mm precision, 小球 5.24 → main=5, k=12, total=5.24', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 0 });
      const s = sim.getState();
      expect(s.objectName).toBe('小球直径');
      expect(s.mainScaleReading).toBe(5);
      expect(s.vernierAlignment).toBe(12);
      expect(s.totalReading).toBeCloseTo(5.24, 6);
    });

    it('0.02mm precision, 金属块 12.36 → main=12, k=18, total=12.36', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 1 });
      const s = sim.getState();
      expect(s.objectName).toBe('金属块长度');
      expect(s.mainScaleReading).toBe(12);
      expect(s.vernierAlignment).toBe(18);
      expect(s.totalReading).toBeCloseTo(12.36, 6);
    });

    it('0.02mm precision, 管内径 8.5 → main=8, k=25, total=8.5', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 2 });
      const s = sim.getState();
      expect(s.objectName).toBe('管内径');
      expect(s.mainScaleReading).toBe(8);
      expect(s.vernierAlignment).toBe(25);
      expect(s.totalReading).toBeCloseTo(8.5, 6);
    });

    it('0.1mm precision rounds 5.24 → 5.2', () => {
      const sim = createVernierCaliperSim({ precision: 0.1, objectType: 0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(5);
      expect(s.totalReading).toBeCloseTo(5.2, 6);
    });

    it('0.05mm precision rounds 5.24 → 5.25', () => {
      const sim = createVernierCaliperSim({ precision: 0.05, objectType: 0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(5);
      expect(s.totalReading).toBeCloseTo(5.25, 6);
    });
  });

  describe('objectType handling', () => {
    it('clamps negative objectType to 0', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: -1 });
      const s = sim.getState();
      expect(s.objectName).toBe('小球直径');
      expect(s.params.objectType).toBe(0);
    });

    it('clamps objectType above 2 to 2', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 5 });
      const s = sim.getState();
      expect(s.objectName).toBe('管内径');
      expect(s.params.objectType).toBe(2);
    });

    it('rounds fractional objectType before clamping', () => {
      const sim = createVernierCaliperSim({ precision: 0.02, objectType: 1.6 });
      const s = sim.getState();
      expect(s.objectName).toBe('管内径');
      expect(s.params.objectType).toBe(2);
    });
  });

  describe('setParams', () => {
    it('updates precision and objectType', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ precision: 0.1, objectType: 1 });
      const s = sim.getState();
      expect(s.params.precision).toBe(0.1);
      expect(s.objectName).toBe('金属块长度');
    });

    it('snaps arbitrary precision to the nearest valid step', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ precision: 0.03 as CaliperPrecision });
      expect(sim.getState().params.precision).toBe(0.02);
      sim.setParams({ precision: 0.07 as CaliperPrecision });
      expect(sim.getState().params.precision).toBe(0.05);
      sim.setParams({ precision: 0.08 as CaliperPrecision });
      expect(sim.getState().params.precision).toBe(0.1);
    });

    it('coerces string inputs from controls to numbers', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({
        precision: '0.1' as unknown as CaliperPrecision,
        objectType: '2' as unknown as number
      });
      const s = sim.getState();
      expect(s.params.precision).toBe(0.1);
      expect(s.params.objectType).toBe(2);
    });

    it('partial update leaves untouched keys unchanged', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ objectType: 1 });
      const s = sim.getState();
      expect(s.params.precision).toBe(defaultParams.precision);
      expect(s.objectName).toBe('金属块长度');
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ precision: 0.1, objectType: 2 });
      sim.reset();
      const s = sim.getState();
      expect(s.params.precision).toBe(defaultParams.precision);
      expect(s.params.objectType).toBe(defaultParams.objectType);
      expect(s.objectName).toBe('小球直径');
    });
  });

  describe('step', () => {
    it('is a no-op (static instrument)', () => {
      const sim = createVernierCaliperSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after.totalReading).toBe(before.totalReading);
    });
  });
});

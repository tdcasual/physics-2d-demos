import { describe, expect, it } from 'vitest';
import {
  createVernierCaliperSim,
  type CaliperParams,
  type CaliperPrecision
} from '../../src/scenes/vernier-caliper/scene.sim';

const defaultParams: CaliperParams = {
  precision: 0.02,
  objectType: 0,
};

describe('vernier-caliper sim', () => {
  describe('object mapping', () => {
    it('objectType=0 → ball, size=5.24', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, objectType: 0 });
      const s = sim.getState();
      expect(s.objectName).toBe('小球直径');
      expect(s.objectSize).toBe(5.24);
    });

    it('objectType=1 → block, size=12.36', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, objectType: 1 });
      const s = sim.getState();
      expect(s.objectName).toBe('金属块长度');
      expect(s.objectSize).toBe(12.36);
    });

    it('objectType=2 → tube, size=8.50', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, objectType: 2 });
      const s = sim.getState();
      expect(s.objectName).toBe('管内径');
      expect(s.objectSize).toBe(8.50);
    });
  });

  describe('precision config', () => {
    it('precision=0.02 → 50 divisions, length=49', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, precision: 0.02 });
      const s = sim.getState();
      expect(s.vernierDivisions).toBe(50);
      expect(s.vernierLength).toBe(49);
    });

    it('precision=0.05 → 20 divisions, length=19', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, precision: 0.05 });
      const s = sim.getState();
      expect(s.vernierDivisions).toBe(20);
      expect(s.vernierLength).toBe(19);
    });

    it('precision=0.1 → 10 divisions, length=9', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, precision: 0.1 });
      const s = sim.getState();
      expect(s.vernierDivisions).toBe(10);
      expect(s.vernierLength).toBe(9);
    });
  });

  describe('reading computation', () => {
    it('mainScaleReading = floor(objectSize)', () => {
      const sim = createVernierCaliperSim({ ...defaultParams, objectType: 0 });
      const s = sim.getState();
      expect(s.mainScaleReading).toBe(Math.floor(5.24));
    });

    it('totalReading = mainScale + alignment * precision', () => {
      const sim = createVernierCaliperSim(defaultParams);
      const s = sim.getState();
      const expected = s.mainScaleReading + s.vernierAlignment * s.params.precision;
      expect(s.totalReading).toBeCloseTo(expected, 6);
    });

    it('totalReading is close to objectSize', () => {
      const sim = createVernierCaliperSim(defaultParams);
      const s = sim.getState();
      expect(Math.abs(s.totalReading - s.objectSize)).toBeLessThan(s.params.precision * 2);
    });

    it('vernierAlignment is in valid range', () => {
      for (const precision of [0.02, 0.05, 0.1] as CaliperPrecision[]) {
        for (const objectType of [0, 1, 2]) {
          const sim = createVernierCaliperSim({ precision, objectType });
          const s = sim.getState();
          expect(s.vernierAlignment).toBeGreaterThanOrEqual(0);
          expect(s.vernierAlignment).toBeLessThan(s.vernierDivisions);
        }
      }
    });
  });

  describe('setParams', () => {
    it('updates precision', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ precision: 0.05 });
      expect(sim.getState().params.precision).toBe(0.05);
      expect(sim.getState().vernierDivisions).toBe(20);
    });

    it('updates objectType', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ objectType: 2 });
      expect(sim.getState().objectName).toBe('管内径');
    });

    it('returns updated params', () => {
      const sim = createVernierCaliperSim(defaultParams);
      const result = sim.setParams({ precision: 0.1 });
      expect(result.precision).toBe(0.1);
    });
  });

  describe('reset', () => {
    it('restores initial params', () => {
      const sim = createVernierCaliperSim(defaultParams);
      sim.setParams({ precision: 0.1, objectType: 2 });
      sim.reset();
      const s = sim.getState();
      expect(s.params.precision).toBe(0.02);
      expect(s.params.objectType).toBe(0);
    });
  });

  describe('step', () => {
    it('is a no-op (static scene)', () => {
      const sim = createVernierCaliperSim(defaultParams);
      const before = sim.getState();
      sim.step(1 / 60);
      const after = sim.getState();
      expect(after.totalReading).toBe(before.totalReading);
    });
  });
});

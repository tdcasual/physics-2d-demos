import { describe, expect, it } from 'vitest';
import {
  centralWidthMm,
  createSingleSlitSim,
  diffractionIntensity,
  firstMinimumMm
} from '../../src/scenes/single-slit/scene.sim';

describe('single-slit sim', () => {
  it('computes the first dark fringe and central width', () => {
    expect(firstMinimumMm(670, 0.22, 2.4)).toBeCloseTo(7.31, 2);
    expect(centralWidthMm(670, 0.22, 2.4)).toBeCloseTo(14.62, 2);
  });

  it('has a central maximum and a first minimum', () => {
    expect(diffractionIntensity(0, 670, 0.22, 2.4)).toBeCloseTo(1, 6);
    expect(diffractionIntensity(7.31, 670, 0.22, 2.4)).toBeLessThan(0.001);
  });

  it('scans, pauses, and clamps the detector', () => {
    const sim = createSingleSlitSim({ detectorX: 0, autoScan: true });
    const before = sim.getState().params.detectorX;
    sim.step(0.1);
    expect(sim.getState().params.detectorX).toBeGreaterThan(before);
    sim.setParams({ autoScan: false });
    const paused = sim.getState().params.detectorX;
    sim.step(1);
    expect(sim.getState().params.detectorX).toBe(paused);
    const clamped = createSingleSlitSim({ detectorX: 99, autoScan: false });
    expect(clamped.getParams().detectorX).toBe(32);
  });
});

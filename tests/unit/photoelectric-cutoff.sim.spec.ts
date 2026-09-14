import { describe, expect, it } from 'vitest';
import {
  calculatePhotoelectric,
  createPhotoelectricSim
} from '../../src/scenes/photoelectric-cutoff/scene.sim';

describe('photoelectric cutoff simulation', () => {
  it('computes the stopping voltage from photon energy', () => {
    const s = calculatePhotoelectric({
      wavelength: 500,
      intensity: 50,
      cathode: 'sodium',
      voltage: 0
    });
    expect(s.photonEnergy).toBeCloseTo(2.48, 8);
    expect(s.workFunction).toBeCloseTo(2.28, 8);
    expect(s.stoppingVoltage).toBeCloseTo(0.2, 8);
  });
  it('cuts the current at the reverse stopping voltage', () => {
    const base = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: 0
    });
    const stopped = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: -base.stoppingVoltage
    });
    expect(stopped.current).toBeCloseTo(0, 8);
    expect(stopped.stoppingVoltage).toBeGreaterThan(0);
  });
  it('responds to wavelength, intensity, and reset', () => {
    const sim = createPhotoelectricSim({ wavelength: 600, intensity: 40 });
    const before = sim.getState();
    sim.setParams({ wavelength: 400, intensity: 80 });
    const after = sim.getState();
    expect(after.stoppingVoltage).toBeGreaterThan(before.stoppingVoltage);
    expect(after.saturationCurrent).toBeGreaterThan(before.saturationCurrent);
    sim.reset();
    expect(sim.getParams().wavelength).toBe(600);
  });
});

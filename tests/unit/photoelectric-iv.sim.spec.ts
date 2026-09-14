import { describe, expect, it } from 'vitest';
import {
  calculatePhotoelectric,
  createPhotoelectricSim
} from '../../src/scenes/photoelectric-iv/scene.sim';

describe('photoelectric I-U simulation', () => {
  it('computes photon energy, stopping voltage, and saturation current', () => {
    const s = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: 0
    });
    expect(s.photonEnergy).toBeCloseTo(3.017, 3);
    expect(s.workFunction).toBeCloseTo(2.28, 8);
    expect(s.maxKineticEnergy).toBeCloseTo(0.737, 3);
    expect(s.saturationCurrent).toBeCloseTo(64, 8);
  });
  it('turns off below threshold and at stopping voltage', () => {
    expect(
      calculatePhotoelectric({
        wavelength: 550,
        intensity: 80,
        cathode: 'calcium',
        voltage: 0
      }).effectOn
    ).toBe(false);
    const stopping = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: 0
    }).stoppingVoltage;
    const s = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: -stopping
    });
    expect(s.current).toBeCloseTo(0, 8);
  });
  it('increases current with voltage and intensity', () => {
    const low = calculatePhotoelectric({
      wavelength: 411,
      intensity: 40,
      cathode: 'sodium',
      voltage: 0.5
    });
    const high = calculatePhotoelectric({
      wavelength: 411,
      intensity: 80,
      cathode: 'sodium',
      voltage: 0.5
    });
    expect(high.current).toBeGreaterThan(low.current);
  });
  it('supports parameter updates and reset', () => {
    const sim = createPhotoelectricSim({ cathode: 'cesium', wavelength: 500 });
    sim.setParams({ wavelength: 400 });
    expect(sim.getParams().wavelength).toBe(400);
    sim.reset();
    expect(sim.getParams().wavelength).toBe(500);
  });
});

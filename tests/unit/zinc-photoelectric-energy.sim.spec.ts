import { describe, expect, it } from 'vitest';
import {
  calculateZincPhotoelectric,
  createZincPhotoelectricSim
} from '../../src/scenes/zinc-photoelectric-energy/scene.sim';

describe('zinc photoelectric energy simulation', () => {
  it('splits photon energy into work function and kinetic energy', () => {
    const s = calculateZincPhotoelectric({
      wavelength: 247,
      intensity: 80,
      chargeState: 'rubbed'
    });
    expect(s.photonEnergy).toBeCloseTo(5.0202, 3);
    expect(s.workFunction).toBeCloseTo(4.3, 8);
    expect(s.maxKineticEnergy).toBeCloseTo(0.7202, 3);
    expect(s.effectOn).toBe(true);
  });
  it('blocks emission above the threshold wavelength', () => {
    const s = calculateZincPhotoelectric({
      wavelength: 650,
      intensity: 100,
      chargeState: 'rubbed'
    });
    expect(s.effectOn).toBe(false);
    expect(s.electronCount).toBe(0);
  });
  it('changes charge state and resets selected parameters', () => {
    const sim = createZincPhotoelectricSim({ wavelength: 300, intensity: 40 });
    sim.setParams({ chargeState: 'grounded', wavelength: 200 });
    expect(sim.getState().chargeState).toBe('grounded');
    sim.reset();
    expect(sim.getParams().wavelength).toBe(300);
    expect(sim.getParams().intensity).toBe(40);
  });
});

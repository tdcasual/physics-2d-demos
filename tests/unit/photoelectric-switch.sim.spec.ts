import { describe, expect, it } from 'vitest';
import {
  createPhotoelectricSim,
  photoelectricAt,
  photoelectricConstants as C,
  type PhotoelectricParams
} from '../../src/scenes/photoelectric-switch/scene.sim';

const base: PhotoelectricParams = {
  material: 'cesium',
  frequency: C.defaultFrequency,
  intensity: C.defaultIntensity,
  autoRun: true,
  showVectors: true
};

describe('Photoelectric switch simulation', () => {
  it('uses the work function to establish the threshold', () => {
    const cesium = photoelectricAt(base);
    const zinc = photoelectricAt({ ...base, material: 'zinc' });
    expect(cesium.effectActive).toBe(true);
    expect(zinc.effectActive).toBe(false);
    expect(zinc.thresholdFrequency).toBeGreaterThan(cesium.thresholdFrequency);
  });

  it('increases current with light intensity and opens the relay at high current', () => {
    const low = photoelectricAt(base);
    const high = photoelectricAt({ ...base, intensity: 100 });
    expect(high.photoCurrent).toBeGreaterThan(low.photoCurrent);
    expect(low.lampOn).toBe(true);
    expect(high.lampOn).toBe(false);
    expect(high.relayState).toBe('open');
  });

  it('pauses, changes material and resets parameters', () => {
    const sim = createPhotoelectricSim(base);
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.setParams({ autoRun: false, material: 'zinc' });
    const paused = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(paused);
    sim.reset();
    expect(sim.getState().material).toBe('cesium');
    expect(sim.getState().frequency).toBe(C.defaultFrequency);
  });
});

import { describe, expect, it } from 'vitest';
import { createSatelliteSim } from '../../src/scenes/satellite-transfer/scene.sim';

describe('satellite-transfer sim', () => {
  it('uses the circular-orbit relation v = √(μ/r)', () => {
    const state = createSatelliteSim({
      orbit: 'low',
      autoRun: false
    }).getState();
    expect(state.radius).toBe(160);
    expect(state.speed).toBeCloseTo(Math.sqrt(72 / 160) * 10, 6);
    expect(state.acceleration).toBeCloseTo((72 / 160 ** 2) * 10, 6);
  });

  it('shows lower speed and acceleration on the high orbit', () => {
    const sim = createSatelliteSim({ orbit: 'low', autoRun: false });
    const low = sim.getState();
    sim.setParams({ orbit: 'high' });
    const high = sim.getState();
    expect(high.radius).toBeGreaterThan(low.radius);
    expect(high.speed).toBeLessThan(low.speed);
    expect(high.acceleration).toBeLessThan(low.acceleration);
  });

  it('clamps the probe and advances only when autoplay is enabled', () => {
    const sim = createSatelliteSim({ progress: 130, autoRun: true });
    expect(sim.getState().progress).toBe(100);
    sim.step(0.05);
    expect(sim.getState().progress).toBeCloseTo(0.4167, 3);
    sim.setParams({ autoRun: false, progress: 40 });
    sim.step(1);
    expect(sim.getState().progress).toBe(40);
  });
});

import { describe, expect, it } from 'vitest';
import { createEnergySim } from '../../src/scenes/elastic-energy/scene.sim';

describe('elastic-energy sim', () => {
  it('starts with equal-mass exchange preset', () => {
    const sim = createEnergySim();
    const state = sim.getState();
    expect(state.massA).toBe(1);
    expect(state.massB).toBe(1);
    expect(state.velocityA).toBe(4);
    expect(state.velocityB).toBe(0);
    expect(state.totalMomentum).toBeCloseTo(4);
    expect(state.totalEnergy).toBeCloseTo(8);
  });
  it('conserves momentum and kinetic energy through a collision', () => {
    const sim = createEnergySim();
    const before = sim.getState();
    for (let i = 0; i < 100; i += 1) {
      sim.step(0.05);
      if (sim.getState().collided) break;
    }
    const after = sim.getState();
    expect(after.collided).toBe(true);
    expect(after.totalMomentum).toBeCloseTo(before.totalMomentum, 8);
    expect(after.totalEnergy).toBeCloseTo(before.totalEnergy, 8);
    expect(after.velocityA).toBeCloseTo(0, 8);
    expect(after.velocityB).toBeCloseTo(4, 8);
  });
  it('supports mass-ratio preset and slow-motion', () => {
    const sim = createEnergySim();
    sim.setPreset('light-heavy');
    sim.setParams({ slowMotion: true });
    const before = sim.getState();
    sim.step(0.05);
    expect(sim.getState().time).toBeCloseTo(0.0125);
    expect(before.massB).toBe(3);
    expect(before.slowMotion).toBe(true);
  });
  it('replays the selected preset instead of reverting to equal mass', () => {
    const sim = createEnergySim();
    sim.setPreset('heavy-light');
    sim.step(0.1);
    sim.reset();
    const state = sim.getState();
    expect(state.preset).toBe('heavy-light');
    expect(state.massA).toBe(3);
    expect(state.massB).toBe(1);
    expect(state.velocityB).toBe(1);
  });
});

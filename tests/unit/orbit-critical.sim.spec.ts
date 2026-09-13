import { describe, expect, it } from 'vitest';
import { createOrbitCriticalSim } from '../../src/scenes/orbit-critical/scene.sim';

describe('orbit-critical simulation', () => {
  it('computes speed and rope critical bottom speed', () => {
    const sim = createOrbitCriticalSim({
      bottomSpeed: 7,
      radius: 1,
      gravity: 10,
      angle: 180,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.speed).toBeCloseTo(7, 6);
    expect(state.criticalBottomSpeed).toBeCloseTo(Math.sqrt(50), 6);
  });
  it('distinguishes rope and rod constraints', () => {
    const sim = createOrbitCriticalSim({
      bottomSpeed: 4,
      radius: 1,
      gravity: 10,
      autoRun: false
    });
    expect(sim.getState().status).toContain('脱轨');
    sim.setParams({ model: 'rod' });
    expect(['杆受压', '杆受拉']).toContain(sim.getState().status);
  });
  it('clamps input values', () => {
    const sim = createOrbitCriticalSim({
      bottomSpeed: 99,
      radius: 0,
      gravity: 99,
      angle: 999
    });
    expect(sim.getParams()).toMatchObject({
      bottomSpeed: 12,
      radius: 0.5,
      gravity: 15,
      angle: 180
    });
  });
});

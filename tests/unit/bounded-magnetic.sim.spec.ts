import { describe, expect, it } from 'vitest';
import {
  createBoundedMagneticSim,
  cyclotronRadius
} from '../../src/scenes/bounded-magnetic/scene.sim';
describe('bounded-magnetic simulation', () => {
  it('uses the cyclotron radius relation', () => {
    expect(cyclotronRadius(2, 4, 1, 2)).toBeCloseTo(4, 8);
  });
  it('builds a bounded trajectory and exposes deflection', () => {
    const sim = createBoundedMagneticSim({ autoRun: false, shape: 'circle' });
    const state = sim.getState();
    expect(state.trajectory.length).toBeGreaterThan(1);
    expect(state.status).toContain('圆形');
  });
  it('clamps shape and geometry controls', () => {
    const sim = createBoundedMagneticSim({
      entryAngle: 99,
      orbitRadius: 1,
      fieldSize: 999
    });
    expect(sim.getParams()).toMatchObject({
      entryAngle: 45,
      orbitRadius: 60,
      fieldSize: 240
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  airTrackMomentumAt,
  createAirTrackMomentumSim
} from '../../src/scenes/air-track-momentum/scene.sim';

describe('air-track-momentum simulation', () => {
  it('keeps the 1D elastic collision momentum', () => {
    const state = airTrackMomentumAt(
      {
        preset: 'equalElastic',
        massA: 1,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0
      },
      4
    );
    expect(state.totalMomentum).toBeCloseTo(state.totalMomentumAfter, 8);
  });
  it('uses the half-sine contact force for impulse mode', () => {
    const state = airTrackMomentumAt(
      {
        mode: 'theorem',
        preset: 'equalElastic',
        massA: 1,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0
      },
      1.15
    );
    expect(state.force).toBeGreaterThan(0);
    expect(state.impulse).toBeGreaterThan(0);
  });
  it('supports non-elastic collision presets', () => {
    const state = airTrackMomentumAt(
      { preset: 'inelastic', massA: 2, massB: 1, velocityA: 1.5, velocityB: 0 },
      4
    );
    expect(state.vAAfter).toBeCloseTo(state.vBAfter, 8);
    expect(state.totalMomentum).toBeCloseTo(state.totalMomentumAfter, 8);
  });
  it('relaunches and resets', () => {
    const sim = createAirTrackMomentumSim({ autoRun: true });
    sim.step(0.4);
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.relaunch();
    expect(sim.getState().time).toBe(0);
    sim.setParams({ massA: 2 });
    sim.reset();
    expect(sim.getParams().massA).toBe(1);
  });
});

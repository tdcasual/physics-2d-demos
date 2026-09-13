import { describe, expect, it } from 'vitest';
import {
  createDisplacementTimeSim,
  displacementAt,
  velocityAt
} from '../../src/scenes/displacement-time/scene.sim';

describe('displacement-time simulation', () => {
  it('matches the kinematics equations', () => {
    expect(velocityAt(5, 4, 3.73)).toBeCloseTo(19.92, 2);
    expect(displacementAt(5, 4, 3.73)).toBeCloseTo(46.48, 2);
  });

  it('updates time and freezes while paused', () => {
    const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 6);
    expect(sim.getState().displacement).toBeCloseTo(7, 6);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 6);
  });

  it('clamps parameters and wraps the four-second timeline', () => {
    const sim = createDisplacementTimeSim({ v0: 99, acceleration: -99 });
    expect(sim.getParams().v0).toBe(20);
    expect(sim.getParams().acceleration).toBe(-6);
    sim.step(4.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 6);
  });
});

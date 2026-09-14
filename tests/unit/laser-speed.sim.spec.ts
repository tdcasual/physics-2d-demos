import { describe, expect, it } from 'vitest';
import {
  createLaserSpeedSim,
  laserSpeedConstants,
  pulseDuration
} from '../../src/scenes/laser-speed/scene.sim';

describe('laser-speed simulation', () => {
  it('solves the two-way light travel time with a moving target', () => {
    const sim = createLaserSpeedSim({ velocity: 20, interval: 1 });
    const state = sim.getState();
    expect(state.pulse1.returnTime).toBeCloseTo(1.111, 2);
    expect(state.pulse1.hitDistance).toBeCloseTo(111.111, 2);
    expect(state.pulse2.returnTime - state.pulse2.emissionTime).toBeCloseTo(
      1.333,
      2
    );
    expect(state.pulse2.hitDistance).toBeCloseTo(133.333, 2);
    expect(state.inferredVelocity).toBeCloseTo(20, 8);
  });

  it('pauses and advances the animation without changing measurements', () => {
    const sim = createLaserSpeedSim({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 4);
    expect(sim.getState().inferredVelocity).toBeCloseTo(20, 8);
  });

  it('normalizes controls and keeps the scaled light speed explicit', () => {
    const sim = createLaserSpeedSim({ velocity: -4, interval: 9 });
    const params = sim.getParams();
    expect(params.velocity).toBe(laserSpeedConstants.minVelocity);
    expect(params.interval).toBe(laserSpeedConstants.maxInterval);
    expect(pulseDuration(0, 20)).toBeCloseTo(1.111, 2);
  });
});

import { describe, expect, it } from 'vitest';
import {
  centripetalAcceleration,
  centripetalForce,
  createCentripetalSim,
  period,
  tangentialSpeed
} from '../../src/scenes/centripetal-motion/scene.sim';

describe('centripetal-motion simulation', () => {
  it('derives v, a and F from r, m and omega', () => {
    const sim = createCentripetalSim({
      mass: 2,
      radius: 2.5,
      angularVelocity: 1.5,
      autoRun: false
    });
    const state = sim.getState();
    expect(tangentialSpeed(state.params)).toBeCloseTo(3.75);
    expect(centripetalAcceleration(state.params)).toBeCloseTo(5.625);
    expect(centripetalForce(state.params)).toBeCloseTo(11.25);
    expect(period(state.params)).toBeCloseTo((2 * Math.PI) / 1.5);
  });

  it('advances angle without changing uniform speed', () => {
    const sim = createCentripetalSim({ angularVelocity: 2, autoRun: true });
    const before = sim.getState();
    sim.step(0.5);
    const after = sim.getState();
    expect(after.angle - before.angle).toBeCloseTo(1);
    expect(after.speed).toBeCloseTo(before.speed);
  });

  it('normalizes out-of-range controls', () => {
    const sim = createCentripetalSim({
      mass: 99,
      radius: -1,
      angularVelocity: 99
    });
    expect(sim.getParams()).toMatchObject({
      mass: 5,
      radius: 1,
      angularVelocity: 3
    });
  });

  it('holds motion when autoRun is off', () => {
    const sim = createCentripetalSim({ autoRun: false });
    const before = sim.getState();
    sim.step(1);
    expect(sim.getState().angle).toBe(before.angle);
  });
});

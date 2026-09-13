import { describe, expect, it } from 'vitest';
import {
  createUvtSim,
  uvtDisplacement,
  uvtVelocity
} from '../../src/scenes/uniformly-varied-motion/scene.sim';
describe('uniformly varied motion sim', () => {
  it('matches v-t and displacement formulas', () => {
    expect(uvtVelocity(10, -2, 5)).toBeCloseTo(0, 8);
    expect(uvtDisplacement(10, -2, 5)).toBeCloseTo(25, 8);
  });
  it('reports the same values in state', () => {
    const sim = createUvtSim({ v0: 10, acceleration: -2 });
    sim.step(5);
    expect(sim.getState()).toMatchObject({
      velocity: 0,
      displacement: 25,
      stopped: true
    });
  });
  it('pauses and clamps controls', () => {
    const sim = createUvtSim({ v0: 99, acceleration: -99 });
    expect(sim.getParams()).toMatchObject({ v0: 20, acceleration: -4 });
    sim.setParams({ autoRun: false });
    sim.step(2);
    expect(sim.getState().time).toBe(0);
  });
});

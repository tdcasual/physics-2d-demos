import { describe, expect, it } from 'vitest';
import { createInclineSpringSim } from '../../src/scenes/incline-spring/scene.sim';

describe('incline-spring sim', () => {
  it('computes the incline normal and gravity components', () => {
    const state = createInclineSpringSim({
      mass: 2,
      friction: 0.2,
      autoRun: false
    }).getState();
    expect(state.gravityAlong).toBeCloseTo(9.8, 6);
    expect(state.normalForce).toBeCloseTo(2 * 9.8 * Math.cos(Math.PI / 6), 6);
    expect(state.springEnergy).toBeGreaterThan(0);
  });
  it('smooth mode removes friction heating', () => {
    const sim = createInclineSpringSim({ mode: 'smooth', autoRun: true });
    sim.step(0.05);
    expect(sim.getState().frictionHeat).toBe(0);
  });
  it('clamps parameters and advances the block only while autoplay is on', () => {
    const sim = createInclineSpringSim({
      friction: 2,
      stiffness: 1,
      mass: 9,
      position: -1,
      autoRun: false
    });
    expect(sim.getParams()).toMatchObject({
      friction: 0.6,
      stiffness: 40,
      mass: 4,
      position: 0.55
    });
    const before = sim.getState().position;
    sim.step(1);
    expect(sim.getState().position).toBe(before);
  });
});

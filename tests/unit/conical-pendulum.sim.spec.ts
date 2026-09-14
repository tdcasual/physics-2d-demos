import { describe, expect, it } from 'vitest';
import {
  conicalPendulumAt,
  conicalPendulumConstants as C,
  createConicalPendulumSim
} from '../../src/scenes/conical-pendulum/scene.sim';

describe('conical-pendulum simulation', () => {
  it('derives the geometric quantities', () => {
    const state = conicalPendulumAt({
      height: 3,
      theta: 57,
      autoRun: true,
      showVectors: true
    });
    expect(state.radius).toBeCloseTo(3 * Math.tan((57 * Math.PI) / 180), 8);
    expect(state.stringLength).toBeCloseTo(
      3 / Math.cos((57 * Math.PI) / 180),
      8
    );
  });

  it('keeps gravity fixed and links forces to the angle', () => {
    const state = conicalPendulumAt({
      height: 3,
      theta: 57,
      autoRun: true,
      showVectors: true
    });
    expect(state.g).toBe(C.g);
    expect(state.mass).toBe(C.mass);
    expect(state.centripetalForce).toBeCloseTo(
      C.mass * C.g * Math.tan((57 * Math.PI) / 180),
      8
    );
    expect(state.tension).toBeCloseTo(
      (C.mass * C.g) / Math.cos((57 * Math.PI) / 180),
      8
    );
  });

  it('uses height rather than string length for the period', () => {
    const low = conicalPendulumAt({
      height: 2,
      theta: 40,
      autoRun: true,
      showVectors: true
    });
    const high = conicalPendulumAt({
      height: 4,
      theta: 40,
      autoRun: true,
      showVectors: true
    });
    expect(low.omega).toBeCloseTo(Math.sqrt(C.g / 2), 8);
    expect(high.period / low.period).toBeCloseTo(Math.sqrt(2), 8);
  });

  it('pauses, advances and resets', () => {
    const sim = createConicalPendulumSim({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.setParams({ autoRun: false });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().height).toBe(C.defaultHeight);
  });
});

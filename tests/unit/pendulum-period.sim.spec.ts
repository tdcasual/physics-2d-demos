import { describe, expect, it } from 'vitest';
import { createPendulumSim } from '../../src/scenes/pendulum-period/scene.sim';

describe('pendulum-period simulation', () => {
  it('computes the small-angle period and force balance', () => {
    const sim = createPendulumSim({
      length: 0.8,
      gravity: 9.8,
      mass: 0.1,
      amplitude: 5,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.period).toBeCloseTo(1.795, 3);
    expect(state.smallAngleValid).toBe(true);
    expect(state.tension).toBeCloseTo(0.98 * Math.cos((5 * Math.PI) / 180), 2);
    expect(state.radialGravity).toBeCloseTo(
      0.98 * Math.cos((5 * Math.PI) / 180),
      2
    );
  });

  it('links photogate periods back to the chosen gravity', () => {
    const sim = createPendulumSim({
      length: 0.8,
      gravity: 9.8,
      amplitude: 5,
      autoRun: true
    });
    sim.startPhotogate();
    for (let i = 0; i < 180; i += 1) sim.step(0.05);
    const state = sim.getState();
    expect(state.measurementCycles).toBeGreaterThanOrEqual(2);
    expect(state.measuredPeriod).not.toBeNull();
    expect(state.measuredGravity).toBeCloseTo(9.8, 1);
  });

  it('clamps controls and pauses when autoplay is disabled', () => {
    const sim = createPendulumSim({
      length: 9,
      gravity: 99,
      mass: 2,
      amplitude: 99,
      autoRun: false
    });
    const params = sim.getParams();
    expect(params.length).toBe(1.5);
    expect(params.gravity).toBe(12);
    expect(params.mass).toBe(0.3);
    expect(params.amplitude).toBe(12);
    expect(sim.getState().smallAngleValid).toBe(false);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});

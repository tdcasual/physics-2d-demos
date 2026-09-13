import { describe, expect, it } from 'vitest';
import { createElectricPendulumSim } from '../../src/scenes/electric-pendulum/scene.sim';
describe('electric-pendulum simulation', () => {
  it('maps voltage to static angle and field force', () => {
    const sim = createElectricPendulumSim({ mode: 'balance', voltage: 0.5 });
    const state = sim.getState();
    expect(state.fieldRatio).toBe(0.5);
    expect(state.electricForce).toBe(0.5);
    expect((state.theta * 180) / Math.PI).toBeCloseTo(0, 5);
  });
  it('oscillate mode advances with time', () => {
    const sim = createElectricPendulumSim({ mode: 'oscillate' });
    const before = sim.getState();
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(before.time);
  });
});

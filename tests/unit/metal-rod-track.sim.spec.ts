import { describe, expect, it } from 'vitest';
import {
  accelerationAt,
  createMetalRodSim,
  dragCoefficient
} from '../../src/scenes/metal-rod-track/scene.sim';

describe('metal-rod-track simulation', () => {
  it('follows motional-emf and magnetic-drag relations', () => {
    const sim = createMetalRodSim({
      magneticField: 1,
      resistance: 2,
      mass: 1,
      initialVelocity: 20,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.emf).toBeCloseTo(30, 6);
    expect(state.current).toBeCloseTo(15, 6);
    expect(state.magneticForce).toBeCloseTo(22.5, 6);
    expect(state.acceleration).toBeCloseTo(-22.5, 6);
  });

  it('clamps parameters and switches to driven mode', () => {
    const sim = createMetalRodSim({
      magneticField: 9,
      resistance: 0,
      mass: 0,
      initialVelocity: 40
    });
    expect(sim.getParams()).toMatchObject({
      magneticField: 2,
      resistance: 0.5,
      mass: 0.2,
      initialVelocity: 24
    });
    sim.setParams({ mode: 'pull' });
    expect(accelerationAt(sim.getParams(), 0)).toBeGreaterThan(0);
  });

  it('exposes the drag coefficient used by the force balance', () => {
    expect(
      dragCoefficient({
        mode: 'coast',
        magneticField: 1,
        resistance: 2,
        mass: 1,
        initialVelocity: 20,
        autoRun: true
      })
    ).toBeCloseTo(1.125, 6);
  });
});

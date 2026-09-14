import { describe, expect, it } from 'vitest';
import {
  calculateEarthGravity,
  createEarthGravitySim
} from '../../src/scenes/earth-gravity/scene.sim';

describe('earth-gravity simulation', () => {
  it('computes the reference values near latitude 35.2°', () => {
    const state = calculateEarthGravity(35.2, 1);
    expect(state.gravitationalForce).toBeCloseTo(9.8, 6);
    expect(state.centripetalForce).toBeCloseTo(0.0275, 3);
    expect(state.weight).toBeCloseTo(9.7775, 3);
    expect(state.angle).toBeCloseTo(0.093, 2);
  });

  it('scales all forces with mass and reduces the radius toward the pole', () => {
    const equator = calculateEarthGravity(0, 2);
    const pole = calculateEarthGravity(90, 2);
    expect(equator.radius).toBeGreaterThan(pole.radius);
    expect(equator.gravitationalForce).toBeCloseTo(19.6, 6);
    expect(pole.centripetalForce).toBeCloseTo(0, 8);
  });

  it('pauses, changes parameters, and resets deterministically', () => {
    const sim = createEarthGravitySim({ autoRun: false });
    sim.step(2);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ latitude: 60, autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 4);
    sim.reset();
    expect(sim.getParams().latitude).toBeCloseTo(35.2, 4);
  });
});

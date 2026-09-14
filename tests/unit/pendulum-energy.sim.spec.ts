import { describe, expect, it } from 'vitest';
import {
  createPendulumEnergySim,
  pendulumEnergyAt,
  pendulumEnergyConstants
} from '../../src/scenes/pendulum-energy/scene.sim';

describe('pendulum energy simulation', () => {
  it('starts at the release point with maximum potential energy', () => {
    const state = pendulumEnergyAt(
      {
        amplitude: 45,
        length: 2.5,
        gravity: 9.8,
        mass: 0.1,
        airDrag: false,
        autoRun: true
      },
      0
    );
    expect(state.speed).toBeCloseTo(0, 8);
    expect(state.potentialEnergy).toBeCloseTo(state.initialEnergy, 8);
  });

  it('converts potential energy into kinetic energy at the bottom', () => {
    const params = {
      amplitude: 45,
      length: 2.5,
      gravity: 9.8,
      mass: 0.1,
      airDrag: false,
      autoRun: true
    } as const;
    const state = pendulumEnergyAt(
      params,
      0.5 * Math.PI * Math.sqrt(params.length / params.gravity)
    );
    expect(state.kineticEnergy).toBeGreaterThan(state.potentialEnergy);
    expect(state.mechanicalEnergy).toBeCloseTo(state.initialEnergy, 8);
  });

  it('reduces mechanical energy only when air drag is enabled', () => {
    const sim = createPendulumEnergySim({ airDrag: true });
    sim.step(pendulumEnergyConstants.maxTime / 2);
    expect(sim.getState().mechanicalEnergy).toBeLessThan(
      sim.getState().initialEnergy
    );
    sim.reset();
    expect(sim.getState().mechanicalEnergy).toBeCloseTo(
      sim.getState().initialEnergy,
      8
    );
  });
});

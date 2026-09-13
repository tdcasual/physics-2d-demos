import { describe, expect, it } from 'vitest';
import {
  createPotentialGraphSim,
  potentialAt
} from '../../src/scenes/potential-energy-graphs/scene.sim';

describe('potential-energy-graphs simulation', () => {
  it('links phi-x slope to field and probe quantities', () => {
    const values = potentialAt('segments', 7.58);
    expect(values.field).toBeCloseTo(1.5, 6);
    const sim = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      probeCharge: 1,
      chargeMagnitude: 1,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.slope).toBeCloseTo(-1.5, 6);
    expect(state.potentialEnergy).toBeCloseTo(state.potential, 6);
    expect(state.force).toBeCloseTo(1.5, 6);
  });

  it('reverses energy and force for a negative probe charge', () => {
    const sim = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      probeCharge: -1,
      chargeMagnitude: 2,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.potentialEnergy).toBeLessThan(0);
    expect(state.force).toBeCloseTo(-3, 6);
  });

  it('advances an automatic probe scan', () => {
    const sim = createPotentialGraphSim({ autoRun: true });
    const before = sim.getState().probePosition;
    sim.step(1);
    expect(sim.getState().probePosition).toBeGreaterThan(before);
  });
});

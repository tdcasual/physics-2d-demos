import { describe, expect, it } from 'vitest';
import {
  createMolecularSim,
  molecularForces
} from '../../src/scenes/molecular-potential/scene.sim';

describe('molecular-potential simulation', () => {
  it('has zero net force and minimum potential at r0', () => {
    const values = molecularForces(1);
    expect(values.net).toBeCloseTo(0, 8);
    expect(values.potential).toBeCloseTo(-1, 8);
  });

  it('switches from repulsion to attraction across equilibrium', () => {
    expect(molecularForces(0.8).net).toBeGreaterThan(0);
    expect(molecularForces(1.4).net).toBeLessThan(0);
  });

  it('thermal motion stays in the configured distance range', () => {
    const sim = createMolecularSim({ distanceRatio: 1, autoRun: true });
    for (let i = 0; i < 180; i += 1) {
      sim.step(1 / 60);
      const state = sim.getState();
      expect(state.distanceRatio).toBeGreaterThanOrEqual(0.55);
      expect(state.distanceRatio).toBeLessThanOrEqual(3.6);
    }
  });
});

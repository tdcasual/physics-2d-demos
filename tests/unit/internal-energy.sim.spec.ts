import { describe, expect, it } from 'vitest';
import {
  createInternalEnergySim,
  type InternalEnergyParams,
  type InternalEnergyExperiment
} from '../../src/scenes/internal-energy/scene.sim';

describe('internal-energy simulation', () => {
  it.each([
    ['compress', 24, 0],
    ['expand', -18, 0],
    ['heat', 0, 40],
    ['law', 15, 0]
  ] as Array<[InternalEnergyExperiment, number, number]>)(
    '%s follows ΔU = W + Q',
    (experiment, expectedWork, expectedHeat) => {
      const sim = createInternalEnergySim({
        experiment,
        autoRun: false
      } satisfies Partial<InternalEnergyParams>);
      const state = sim.getState();
      expect(state.work).toBeCloseTo(expectedWork * 0.55, 5);
      expect(state.heat).toBeCloseTo(expectedHeat * 0.55, 5);
      expect(state.deltaU).toBeCloseTo(state.work + state.heat, 5);
    }
  );

  it('animates particles and keeps parameters bounded', () => {
    const sim = createInternalEnergySim({
      autoRun: true,
      compression: 9,
      heatInput: -2
    });
    const before = sim.getState();
    sim.step(0.5);
    const after = sim.getState();
    expect(after.params.compression).toBe(1);
    expect(after.params.heatInput).toBe(0);
    expect(after.particles).toHaveLength(30);
    expect(after.progress).toBeGreaterThan(before.progress);
  });
});

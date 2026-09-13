import { describe, expect, it } from 'vitest';
import { createParallelCapacitorSim } from '../../src/scenes/parallel-capacitor/scene.sim';
describe('parallel-capacitor simulation', () => {
  it('increases capacitance with area and dielectric', () => {
    const sim = createParallelCapacitorSim({ area: 1, dielectric: 3 });
    expect(sim.getState().capacitanceRatio).toBeGreaterThan(1);
  });
  it('increases voltage when plate distance grows under constant charge', () => {
    const sim = createParallelCapacitorSim({ distance: 6 });
    expect(sim.getState().voltageRatio).toBeGreaterThan(1);
  });
});

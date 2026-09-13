import { describe, expect, it } from 'vitest';
import {
  bindingEnergyAt,
  createBindingEnergySim
} from '../../src/scenes/binding-energy/scene.sim';
describe('binding-energy sim', () => {
  it('peaks near iron', () => {
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(238));
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(4));
  });
  it('computes total binding energy', () => {
    const sim = createBindingEnergySim({ A: 238, autoRun: false });
    expect(sim.getState().total).toBeCloseTo(1801.66, 1);
  });
  it('clamps and pauses', () => {
    const sim = createBindingEnergySim({ A: 999, autoRun: false });
    expect(sim.getParams().A).toBe(238);
    sim.step(2);
    expect(sim.getState().time).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  closedPowerMeasures,
  createClosedPowerSim
} from '../../src/scenes/closed-power/scene.sim';

describe('closed-power simulation', () => {
  it('computes current and power split for the reference values', () => {
    const state = closedPowerMeasures({
      emf: 8,
      internalResistance: 3,
      externalResistance: 20
    });
    expect(state.current).toBeCloseTo(8 / 23, 6);
    expect(state.outputPower).toBeCloseTo(20 * (8 / 23) ** 2, 6);
    expect(state.internalPower).toBeCloseTo(3 * (8 / 23) ** 2, 6);
  });

  it('places the output-power maximum at R = r', () => {
    const matched = closedPowerMeasures({
      emf: 8,
      internalResistance: 3,
      externalResistance: 3
    });
    const lower = closedPowerMeasures({
      emf: 8,
      internalResistance: 3,
      externalResistance: 1
    });
    const higher = closedPowerMeasures({
      emf: 8,
      internalResistance: 3,
      externalResistance: 10
    });
    expect(matched.matched).toBe(true);
    expect(matched.outputPower).toBeCloseTo(matched.maxOutputPower, 6);
    expect(lower.outputPower).toBeLessThan(matched.outputPower);
    expect(higher.outputPower).toBeLessThan(matched.outputPower);
  });

  it('normalizes parameters and pauses when autoplay is disabled', () => {
    const sim = createClosedPowerSim({
      emf: 99,
      internalResistance: 0,
      externalResistance: 99
    });
    expect(sim.getParams().emf).toBe(16);
    expect(sim.getParams().internalResistance).toBe(1);
    expect(sim.getParams().externalResistance).toBe(20);
    sim.setParams({ autoRun: false });
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});

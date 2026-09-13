import { describe, expect, it } from 'vitest';
import { createResistorSim } from '../../src/scenes/resistor-measurement/scene.sim';

describe('resistor measurement simulation', () => {
  it('external ammeter connection reads below the target resistance', () => {
    const sim = createResistorSim({
      autoRun: false,
      meterMode: 'external',
      targetResistance: 25
    });
    const state = sim.getState();
    expect(state.measuredResistance).toBeLessThan(
      state.params.targetResistance
    );
    expect(state.errorPercent).toBeLessThan(0);
  });

  it('internal ammeter connection reads above the target resistance', () => {
    const sim = createResistorSim({
      autoRun: false,
      meterMode: 'internal',
      targetResistance: 25
    });
    const state = sim.getState();
    expect(state.measuredResistance).toBeGreaterThan(
      state.params.targetResistance
    );
    expect(state.errorPercent).toBeGreaterThan(0);
  });

  it('divider output rises with slider position and pause freezes time', () => {
    const sim = createResistorSim({
      autoRun: false,
      circuitMode: 'divider',
      rheostatPosition: 0.2
    });
    const low = sim.getState().voltageAcrossTarget;
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ rheostatPosition: 0.8, autoRun: true });
    expect(sim.getState().voltageAcrossTarget).toBeGreaterThan(low);
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
  });
});

import { describe, expect, it } from 'vitest';
import { createHalfDeflectionSim } from '../../src/scenes/half-deflection/scene.sim';

describe('half-deflection simulation', () => {
  it('starts at full scale with S₂ open', () => {
    const sim = createHalfDeflectionSim();
    const state = sim.getState();
    expect(state.meterReading).toBeCloseTo(state.fullScale, 6);
    expect(state.params.auxiliarySwitch).toBe(false);
  });

  it('reaches half deflection when R₂ equals the meter resistance', () => {
    const sim = createHalfDeflectionSim({
      auxiliarySwitch: true,
      boxResistance: 100
    });
    const state = sim.getState();
    expect(state.meterReading).toBeCloseTo(state.halfTarget, 6);
    expect(state.estimate).toBe(100);
  });

  it('records and clears measurement rows', () => {
    const sim = createHalfDeflectionSim();
    sim.record('满偏');
    sim.setParams({ auxiliarySwitch: true });
    sim.record('半偏');
    expect(sim.getState().records).toHaveLength(2);
    sim.clearRecords();
    expect(sim.getState().records).toHaveLength(0);
  });
});

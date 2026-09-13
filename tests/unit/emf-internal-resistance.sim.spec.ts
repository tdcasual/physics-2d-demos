import { describe, expect, it } from 'vitest';
import { createEmfInternalSim } from '../../src/scenes/emf-internal-resistance/scene.sim';

describe('emf-internal-resistance simulation', () => {
  it('satisfies the closed-circuit relation U + Ir = E', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 1.5,
      internalResistance: 0.5,
      rheostatResistance: 5,
      switchClosed: true,
      autoRun: false
    });
    const state = sim.getState();
    expect(
      state.terminalVoltage + state.current * state.internalResistance
    ).toBeCloseTo(1.5, 6);
    expect(state.terminalVoltage).toBeCloseTo(1.36, 2);
    expect(state.current).toBeCloseTo(0.27, 2);
  });

  it('records varied loads and fits E and r', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      switchClosed: true
    });
    [2, 4, 7, 10].forEach((rheostatResistance) => {
      sim.setParams({ rheostatResistance });
      expect(sim.recordPoint()).toBe(true);
    });
    const fit = sim.fitRecords();
    expect(fit?.emf).toBeCloseTo(3, 5);
    expect(fit?.internalResistance).toBeCloseTo(1, 5);
  });

  it('shows the qualitative shunt error and guards an open switch', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      systematicError: true,
      switchClosed: false
    });
    expect(sim.recordPoint()).toBe(false);
    expect(sim.getState().current).toBe(0);
    sim.toggleSwitch();
    [2, 4, 7, 10].forEach((rheostatResistance) => {
      sim.setParams({ rheostatResistance });
      sim.recordPoint();
    });
    const fit = sim.fitRecords();
    expect(fit?.emf ?? 0).toBeLessThan(3);
    expect(fit?.internalResistance ?? 0).toBeLessThan(1);
  });
});

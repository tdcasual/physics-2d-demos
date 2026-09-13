import { describe, expect, it } from 'vitest';
import {
  closedCircuitMeasures,
  createClosedCircuitSim
} from '../../src/scenes/closed-circuit/scene.sim';

describe('closed-circuit simulation', () => {
  it('conserves source voltage', () => {
    const state = closedCircuitMeasures({
      emf: 12,
      internalResistance: 4,
      externalResistance: 4
    });
    expect(state.current).toBeCloseTo(1.5, 6);
    expect(state.terminalVoltage + state.internalDrop).toBeCloseTo(12, 6);
  });
  it('maximizes output power when R equals r', () => {
    const state = closedCircuitMeasures({
      emf: 12,
      internalResistance: 4,
      externalResistance: 4
    });
    expect(state.outputPower).toBeCloseTo(state.maxOutputPower, 6);
    expect(state.maxPowerResistance).toBe(4);
  });
  it('normalizes parameters and pauses autoplay', () => {
    const sim = createClosedCircuitSim({ externalResistance: 99 });
    expect(sim.getParams().externalResistance).toBe(20);
    const before = sim.getState().time;
    sim.step(0.4);
    expect(sim.getState().time).toBeGreaterThan(before);
    sim.setParams({ autoRun: false });
    const paused = sim.getState().time;
    sim.step(0.4);
    expect(sim.getState().time).toBe(paused);
  });
});

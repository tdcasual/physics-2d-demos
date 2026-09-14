import { describe, expect, it } from 'vitest';
import { createFeederSim } from '../../src/scenes/auto-water-feeder/scene.sim';

describe('auto-water-feeder simulation', () => {
  it('links water depth to buoyancy and spring balance', () => {
    const sim = createFeederSim({ waterDepth: 0.9, autoRun: false });
    const state = sim.getState();
    expect(state.buoyantForce).toBeCloseTo(105.84, 2);
    expect(state.springForce).toBeCloseTo(state.buoyantForce - state.weight, 2);
    expect(state.displacement).toBeGreaterThan(0);
  });

  it('converts sensor resistance to a voltage readout', () => {
    const sim = createFeederSim({ waterDepth: 1.2, autoRun: false });
    const state = sim.getState();
    expect(state.circuitCurrent).toBeCloseTo(
      state.supplyVoltage / (state.sensorResistance + 4),
      6
    );
    expect(state.meterVoltage).toBeCloseTo(state.circuitCurrent * 4, 6);
  });

  it('clamps parameters and pauses autoplay', () => {
    const sim = createFeederSim({
      waterDepth: 9,
      springConst: 1,
      sensorGain: 99,
      supplyVoltage: 99,
      autoRun: false
    });
    const params = sim.getParams();
    expect(params.waterDepth).toBe(2.2);
    expect(params.springConst).toBe(8);
    expect(params.sensorGain).toBe(5);
    expect(params.supplyVoltage).toBe(18);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});

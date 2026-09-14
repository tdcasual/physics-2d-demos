import { describe, expect, it } from 'vitest';
import {
  capacitorAt,
  capacitorTau,
  createCapacitorSim
} from '../../src/scenes/capacitor-charge-discharge/scene.sim';

describe('capacitor charge/discharge simulation', () => {
  it('computes the reference time constant and 1τ charge level', () => {
    expect(capacitorTau(20, 200)).toBeCloseTo(4, 6);
    const state = capacitorAt(1, 6, 20, 200, 4);
    expect(state.voltageAcross).toBeCloseTo(3.793, 3);
    expect(state.currentMilliamp).toBeCloseTo(0.11, 3);
    expect(state.chargeMicrocoulomb).toBeCloseTo(758.5, 1);
  });

  it('reverses current during discharge and preserves Q=C·Uc', () => {
    const state = capacitorAt(2, 6, 20, 200, 4);
    expect(state.currentMilliamp).toBeLessThan(0);
    expect(state.chargeMicrocoulomb).toBeCloseTo(200 * state.voltageAcross, 6);
  });

  it('stops at five time constants and resets', () => {
    const sim = createCapacitorSim({ mode: 1 });
    sim.step(100);
    expect(sim.getState().progress).toBe(5);
    expect(sim.getState().voltageAcross).toBeGreaterThan(5.9);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});

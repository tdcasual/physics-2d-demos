import { describe, expect, it } from 'vitest';
import { createLightbulbSim } from '../../src/scenes/lightbulb-iv-curve/scene.sim';

describe('lightbulb-iv-curve simulation', () => {
  it('models the hot-filament non-linear I-U relationship', () => {
    const sim = createLightbulbSim({ voltage: 2.9, autoRun: false });
    const state = sim.getState();
    expect(state.resistance).toBeCloseTo(11.887, 3);
    expect(state.current).toBeCloseTo(0.244, 3);
    expect(state.power).toBeCloseTo(0.7075, 3);
    expect(state.idealCurrent).toBeGreaterThan(state.current);
    const endpoint = state.curve[state.curve.length - 1];
    expect(endpoint.current).toBeLessThan(endpoint.voltage / 6);
  });

  it('records and resets measured points', () => {
    const sim = createLightbulbSim({ voltage: 1.5, autoRun: false });
    expect(sim.getState().recorded).toHaveLength(0);
    sim.recordPoint();
    expect(sim.getState().recorded).toHaveLength(1);
    sim.resetCurve();
    expect(sim.getState().recorded).toHaveLength(0);
  });

  it('sweeps voltage only while auto-run is enabled and clamps inputs', () => {
    const sim = createLightbulbSim({ voltage: 9, autoRun: true });
    expect(sim.getParams().voltage).toBe(3.6);
    sim.step(1);
    expect(sim.getState().voltage).toBeGreaterThanOrEqual(0);
    expect(sim.getState().voltage).toBeLessThanOrEqual(3.6);
    sim.setParams({ autoRun: false, voltage: -1 });
    expect(sim.getParams().voltage).toBe(0);
    const before = sim.getState().voltage;
    sim.step(1);
    expect(sim.getState().voltage).toBe(before);
  });
});

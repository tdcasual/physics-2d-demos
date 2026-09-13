import { describe, expect, it } from 'vitest';
import { createTickerTimerSim } from '../../src/scenes/ticker-timer/scene.sim';

describe('ticker timer simulation', () => {
  it('blocks releasing tape before power is on', () => {
    const sim = createTickerTimerSim();
    expect(sim.releaseTape()).toBe(false);
    expect(sim.getState().error).toContain('先接通电源');
    expect(sim.getState().dots).toHaveLength(0);
  });

  it('records equal-time dots and recovers acceleration', () => {
    const sim = createTickerTimerSim({ autoRun: true, acceleration: 2.5 });
    sim.powerOn();
    expect(sim.releaseTape()).toBe(true);
    sim.step(0.6);
    const state = sim.getState();
    expect(state.dots.length).toBeGreaterThan(3);
    expect(state.deltaS).not.toBeNull();
    expect(state.measuredAcceleration).toBeCloseTo(2.5, 6);
  });

  it('supports uniform and reverse acceleration presets', () => {
    const sim = createTickerTimerSim({ model: 'uniform' });
    expect(sim.getParams().acceleration).toBe(0);
    sim.setParams({ model: 'ud' });
    expect(sim.getParams().acceleration).toBe(-2.5);
    sim.setParams({ acceleration: 99, initialVelocity: -2 });
    expect(sim.getParams().acceleration).toBe(5);
    expect(sim.getParams().initialVelocity).toBe(0);
  });
});

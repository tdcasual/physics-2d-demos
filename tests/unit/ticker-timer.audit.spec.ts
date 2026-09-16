import { describe, expect, it } from 'vitest';
import {
  createTickerTimerSim,
  tickerTimerConstants
} from '../../src/scenes/ticker-timer/scene.sim';

describe('ticker-timer audit invariants', () => {
  it('accepts URL-style boolean values and keeps autoRun=0 paused', () => {
    const sim = createTickerTimerSim({
      autoRun: '0' as unknown as boolean,
      voltageOn: '1' as unknown as boolean
    });
    expect(sim.getParams().autoRun).toBe(false);
    expect(sim.getParams().voltageOn).toBe(true);
    expect(sim.releaseTape()).toBe(true);
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().dots).toHaveLength(1);
  });

  it('emits dots at the fixed 20 ms cadence', () => {
    const sim = createTickerTimerSim({ autoRun: true });
    sim.powerOn();
    sim.releaseTape();
    sim.step(tickerTimerConstants.tickPeriod * 4.1);
    const dots = sim.getState().dots;
    expect(dots.map((dot) => dot.t)).toEqual([0, 0.02, 0.04, 0.06, 0.08]);
  });

  it('reset restores the session initial parameters rather than hard-coded defaults', () => {
    const sim = createTickerTimerSim({
      model: 'uniform',
      initialVelocity: 1.2,
      acceleration: 1.4,
      autoRun: false,
      voltageOn: true
    });
    sim.setParams({ model: 'ud' });
    sim.powerOn();
    sim.releaseTape();
    sim.step(0.2);
    sim.reset();
    expect(sim.getParams()).toEqual({
      model: 'uniform',
      initialVelocity: 1.2,
      acceleration: 0,
      autoRun: false,
      voltageOn: true
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().released).toBe(false);
  });
});

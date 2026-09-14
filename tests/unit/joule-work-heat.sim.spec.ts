import { describe, expect, it } from 'vitest';
import {
  createJouleSim,
  jouleConstants
} from '../../src/scenes/joule-work-heat/scene.sim';

describe('joule-work-heat simulation', () => {
  it('computes the mechanical work and equivalent temperature rise', () => {
    const sim = createJouleSim({
      mode: 0,
      mass: 42,
      height: 15,
      waterMass: 2,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.mechanicalWork).toBeCloseTo(6300, 5);
    expect(state.activeWork).toBe(0);
    sim.setParams({ autoRun: true });
    for (
      let index = 0;
      index < jouleConstants.mechanicalDuration / 0.05;
      index += 1
    )
      sim.step(0.05);
    expect(sim.getState().activeWork).toBeCloseTo(6300, 2);
    expect(sim.getState().temperatureRise).toBeCloseTo(0.75, 2);
  });

  it('calculates electric work and matches it to mechanical work', () => {
    const sim = createJouleSim({
      mode: 1,
      mass: 42,
      height: 15,
      voltage: 12,
      current: 2,
      autoRun: true
    });
    sim.matchWork();
    const state = sim.getState();
    expect(state.duration).toBeCloseTo(262.5, 2);
    for (let index = 0; index < state.duration / 0.05; index += 1)
      sim.step(0.05);
    expect(sim.getState().activeWork).toBeCloseTo(state.mechanicalWork, 1);
  });

  it('clamps controls and pauses without mutating time', () => {
    const sim = createJouleSim({
      mass: 999,
      height: -2,
      waterMass: 99,
      voltage: 99,
      current: -4,
      duration: 999,
      autoRun: false
    });
    expect(sim.getParams().mass).toBe(60);
    expect(sim.getParams().height).toBe(5);
    expect(sim.getParams().waterMass).toBe(4);
    expect(sim.getParams().voltage).toBe(24);
    expect(sim.getParams().current).toBe(0.5);
    expect(sim.getParams().duration).toBe(300);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createCyclotronSim,
  cyclotronMaxEnergy,
  cyclotronPeriodRatio,
  cyclotronRadius
} from '../../src/scenes/cyclotron/scene.sim';

describe('cyclotron sim', () => {
  it('matches the reference maximum-energy scaling', () => {
    expect(cyclotronMaxEnergy('proton', 3)).toBeCloseTo(360, 8);
    expect(cyclotronMaxEnergy('deuteron', 3)).toBeCloseTo(180, 8);
    expect(cyclotronMaxEnergy('alpha', 3)).toBeCloseTo(360, 8);
  });

  it('keeps the cyclotron period ratio independent of voltage', () => {
    expect(cyclotronPeriodRatio('proton', 3)).toBeCloseTo(1 / 3, 8);
    expect(cyclotronPeriodRatio('deuteron', 3)).toBeCloseTo(2 / 3, 8);
    const sim = createCyclotronSim({ U: 10 });
    const before = sim.getState().periodRatio;
    sim.setParams({ U: 50 });
    expect(sim.getState().periodRatio).toBe(before);
  });

  it('gains qU per gap crossing and clamps at the dee edge', () => {
    const sim = createCyclotronSim({ particle: 'proton', B: 3, U: 30 });
    sim.step(0.34 / 3);
    expect(sim.getState().crossings).toBe(1);
    expect(sim.getState().energy).toBe(30);
    sim.step(20);
    const state = sim.getState();
    expect(state.energy).toBe(state.maxEnergy);
    expect(state.radius).toBeCloseTo(230, 8);
    expect(state.exitSide).toBe('right');
  });

  it('clamps controls and pauses when autoRun is off', () => {
    const sim = createCyclotronSim();
    sim.setParams({ B: 99, U: -1 });
    expect(sim.getParams()).toMatchObject({ B: 3, U: 10 });
    sim.setParams({ autoRun: false });
    sim.step(4);
    expect(sim.getState().t).toBe(0);
    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(cyclotronRadius(0, 360)).toBe(0);
  });
});

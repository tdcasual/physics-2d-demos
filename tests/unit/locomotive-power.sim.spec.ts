import { describe, expect, it } from 'vitest';
import {
  createLocomotiveSim,
  locomotiveAt,
  locomotiveConstants as C,
  type LocomotiveParams
} from '../../src/scenes/locomotive-power/scene.sim';

const base: LocomotiveParams = {
  mode: 'power',
  ratedPower: 18,
  acceleration: 1,
  dragForce: 1200,
  autoRun: true
};

describe('locomotive power simulation', () => {
  it('keeps rated power and approaches the terminal speed', () => {
    const early = locomotiveAt(base, 2);
    const late = locomotiveAt(base, 30);
    expect(early.actualPower).toBeCloseTo(base.ratedPower, 5);
    expect(late.velocity).toBeGreaterThan(early.velocity);
    expect(late.velocity).toBeLessThanOrEqual(late.terminalSpeed + 0.1);
  });

  it('uses constant acceleration mode with linear velocity growth', () => {
    const state = locomotiveAt(
      { ...base, mode: 'acceleration', acceleration: 1.2 },
      5
    );
    expect(state.accelerationNow).toBeCloseTo(1.2, 6);
    expect(state.velocity).toBeCloseTo(C.initialVelocity + 1.2 * 5, 2);
    expect(state.actualPower).toBeGreaterThan(0);
  });

  it('pauses and resets without losing the selected model defaults', () => {
    const sim = createLocomotiveSim(base);
    const initial = sim.getState();
    sim.setParams({ autoRun: false });
    sim.step(2);
    expect(sim.getState().time).toBeCloseTo(initial.time, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().mode).toBe('power');
  });
});

import { describe, expect, it } from 'vitest';
import {
  createImpulseMomentumSim,
  forceAt
} from '../../src/scenes/impulse-momentum/scene.sim';

describe('impulse-momentum simulation', () => {
  it('constant force area equals momentum change', () => {
    const sim = createImpulseMomentumSim({
      forceModel: 'constant',
      mass: 2,
      initialVelocity: 0,
      peakForce: 10,
      autoRun: true
    });
    sim.step(2.15);
    const state = sim.getState();
    expect(state.impulse).toBeCloseTo(21.5, 2);
    expect(state.momentumChange).toBeCloseTo(state.impulse, 6);
    expect(state.velocity).toBeCloseTo(10.75, 2);
  });

  it('triangle force has the expected positive area', () => {
    const sim = createImpulseMomentumSim({
      forceModel: 'triangle',
      mass: 2,
      peakForce: 10,
      autoRun: true
    });
    sim.step(4);
    expect(sim.getState().impulse).toBeCloseTo(20, 2);
    expect(forceAt('triangle', 2, 10)).toBeCloseTo(10, 6);
  });

  it('mass and initial velocity change the velocity response', () => {
    const sim = createImpulseMomentumSim({
      forceModel: 'constant',
      mass: 4,
      initialVelocity: -2,
      peakForce: 8,
      autoRun: true
    });
    sim.step(1);
    const state = sim.getState();
    expect(state.initialMomentum).toBeCloseTo(-8, 6);
    expect(state.impulse).toBeCloseTo(8, 2);
    expect(state.velocity).toBeCloseTo(0, 2);
  });
});

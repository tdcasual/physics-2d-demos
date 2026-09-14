import { describe, expect, it } from 'vitest';
import {
  createLenzLawSim,
  lenzLawAt,
  lenzLawConstants as C,
  type LenzParams
} from '../../src/scenes/lenz-law/scene.sim';

const base: LenzParams = {
  motion: 'approach',
  speed: C.defaultSpeed,
  magnetStrength: C.defaultStrength,
  autoRun: true,
  showVectors: true
};

describe('Lenz law simulation', () => {
  it('models approach as increasing flux, opposition and repulsion', () => {
    const state = lenzLawAt(base, 0.3);
    expect(state.fluxRate).toBeGreaterThan(0);
    expect(state.inducedField).toBe('opposes');
    expect(state.leftPole).toBe('N');
    expect(state.forceDirection).toBe('away');
    expect(state.emf).toBeGreaterThan(0);
  });

  it('flips the response for receding motion', () => {
    const state = lenzLawAt({ ...base, motion: 'recede' }, 0.3);
    expect(state.fluxRate).toBeLessThan(0);
    expect(state.inducedField).toBe('supports');
    expect(state.leftPole).toBe('S');
    expect(state.forceDirection).toBe('toward');
  });

  it('pauses, changes motion and resets the apparatus', () => {
    const sim = createLenzLawSim(base);
    const initial = sim.getState().distance;
    sim.step(0.5);
    expect(sim.getState().distance).toBeLessThan(initial);
    sim.setParams({ autoRun: false, motion: 'recede' });
    const paused = sim.getState().distance;
    sim.step(1);
    expect(sim.getState().distance).toBe(paused);
    sim.reset();
    expect(sim.getState().motion).toBe('approach');
    expect(sim.getState().distance).toBeCloseTo(C.defaultDistanceApproach, 8);
  });
});

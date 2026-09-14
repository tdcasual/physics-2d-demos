import { describe, expect, it } from 'vitest';
import {
  brownianAt,
  createBrownianSim
} from '../../src/scenes/brownian-motion/scene.sim';
describe('brownian motion simulation', () => {
  it('increases molecular speed and collision activity with temperature', () => {
    const low = brownianAt(
      {
        temperature: 10,
        particleRadius: 15,
        showMolecules: true,
        showTrail: true,
        showForce: true,
        autoRun: true,
        slowMode: false
      },
      2
    );
    const high = brownianAt({ ...low, temperature: 80 }, 2);
    expect(high.molecularSpeed).toBeGreaterThan(low.molecularSpeed);
    expect(high.instantCollisions).toBeGreaterThanOrEqual(
      low.instantCollisions
    );
  });
  it('keeps the Brownian particle inside the chamber', () => {
    const state = brownianAt(
      {
        temperature: 60,
        particleRadius: 24,
        showMolecules: true,
        showTrail: true,
        showForce: true,
        autoRun: true,
        slowMode: false
      },
      16
    );
    expect(
      Math.hypot(state.particleX - 470, state.particleY - 382)
    ).toBeLessThan(348);
  });
  it('can hide the trail without changing the particle model', () => {
    const withTrail = brownianAt(
      {
        temperature: 40,
        particleRadius: 15,
        showMolecules: true,
        showTrail: true,
        showForce: true,
        autoRun: true,
        slowMode: false
      },
      3
    );
    const hidden = brownianAt({ ...withTrail, showTrail: false }, 3);
    expect(withTrail.trail.length).toBeGreaterThan(0);
    expect(hidden.trail).toHaveLength(0);
    expect(hidden.particleX).toBeCloseTo(withTrail.particleX, 8);
  });
  it('resets time and parameters', () => {
    const sim = createBrownianSim({ temperature: 75, particleRadius: 24 });
    sim.step(0.1);
    sim.reset();
    expect(sim.getParams().temperature).toBe(15);
    expect(sim.getState().time).toBe(0);
  });
});

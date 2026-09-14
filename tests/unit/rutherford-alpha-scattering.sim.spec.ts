import { describe, expect, it } from 'vitest';
import { createRutherfordSim } from '../../src/scenes/rutherford-alpha-scattering/scene.sim';

describe('rutherford-alpha-scattering simulation', () => {
  it('starts with a dense nuclear-model beam and quantitative counters', () => {
    const sim = createRutherfordSim({ model: 1, autoRun: false });
    const state = sim.getState();
    expect(state.model).toBe(1);
    expect(state.particles.length).toBeGreaterThan(20);
    expect(state.totalCount).toBeGreaterThan(500);
    expect(state.largeAngle).toBeGreaterThan(0);
    expect(state.backscatter).toBeGreaterThan(0);
  });

  it('uses a straight beam for the plum-pudding hypothesis', () => {
    const sim = createRutherfordSim({ model: 0, autoRun: true });
    const before = sim.getState().particles[0];
    sim.step(0.05);
    const after = sim.getState().particles[0];
    expect(after.vy).toBe(0);
    expect(after.y).toBe(before.y);
    expect(sim.getState().largeAngle).toBe(0);
  });

  it('toggles models, fires a burst, and pauses deterministically', () => {
    const sim = createRutherfordSim({ model: 1, autoRun: false });
    const count = sim.getState().totalCount;
    sim.fireBeam();
    expect(sim.getState().totalCount).toBeGreaterThan(count);
    expect(sim.toggleModel()).toBe(0);
    expect(sim.getState().largeAngle).toBe(0);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});

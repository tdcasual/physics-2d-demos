import { describe, expect, it } from 'vitest';
import { createGlassSim } from '../../src/scenes/parallel-glass-refraction/scene.sim';

describe('parallel-glass-refraction simulation', () => {
  it('obeys Snell law and equal exit angle', () => {
    const sim = createGlassSim({ incidentAngle: 48, refractiveIndex: 1.5 });
    const state = sim.getState();
    const r = (state.refractedRadians * 180) / Math.PI;
    expect(r).toBeCloseTo(29.7, 1);
    expect(state.incidentAngle).toBeCloseTo(48, 6);
  });

  it('computes lateral shift from the standard relation', () => {
    const sim = createGlassSim({
      incidentAngle: 48,
      refractiveIndex: 1.5,
      thickness: 5
    });
    const state = sim.getState();
    expect(state.lateralShift).toBeCloseTo(1.81, 2);
  });

  it('clamps controls and advances only when animation is enabled', () => {
    const sim = createGlassSim({
      incidentAngle: 120,
      refractiveIndex: 0.2,
      thickness: 99,
      autoRun: false
    });
    expect(sim.getState().incidentAngle).toBe(80);
    expect(sim.getState().refractiveIndex).toBe(1.1);
    expect(sim.getState().thickness).toBe(8);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.05, 6);
  });
});

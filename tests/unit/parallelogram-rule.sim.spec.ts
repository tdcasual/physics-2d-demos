import { describe, expect, it } from 'vitest';
import {
  createParallelogramSim,
  resultantMagnitude,
  resultantVector
} from '../../src/scenes/parallelogram-rule/scene.sim';

describe('parallelogram rule simulation', () => {
  it('calculates the vector magnitude from the included angle', () => {
    expect(resultantMagnitude(1.8, 1.8, 90)).toBeCloseTo(1.8 * Math.sqrt(2), 8);
    const result = resultantVector(1.8, 1.8, 90);
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(1.8 * Math.sqrt(2), 8);
  });

  it('exposes equivalent comparison readings', () => {
    const sim = createParallelogramSim({ stage: 'compare' });
    const state = sim.getState();
    expect(state.samePoint).toBe(true);
    expect(state.measuredMagnitude).toBeCloseTo(
      state.theoreticalMagnitude * 1.002,
      8
    );
  });

  it('clamps unsafe parameters', () => {
    const sim = createParallelogramSim({ f1: 99, f2: -1, angle: 999 });
    expect(sim.getParams()).toMatchObject({ f1: 4, f2: 0.5, angle: 160 });
  });
});

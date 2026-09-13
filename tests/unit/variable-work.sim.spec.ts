import { describe, expect, it } from 'vitest';
import {
  createVariableWorkSim,
  workForce,
  workValue
} from '../../src/scenes/variable-work/scene.sim';

describe('variable-work simulation', () => {
  it('uses triangle area for the linear force model', () => {
    const params = {
      mode: 'linear' as const,
      mass: 2,
      k: 2,
      microsteps: 0,
      autoRun: false
    };
    expect(workForce(params, 2.5)).toBeCloseTo(5, 6);
    expect(workValue(params, 2.5)).toBeCloseTo(6.25, 6);
  });
  it('creates rectangle approximations when microsteps are enabled', () => {
    const sim = createVariableWorkSim({ autoRun: false, microsteps: 8 });
    expect(sim.getState().rectangles).toHaveLength(8);
  });
  it('advances and resets the model', () => {
    const sim = createVariableWorkSim({ autoRun: true });
    const before = sim.getState().time;
    sim.step(0.2);
    expect(sim.getState().time).toBeGreaterThan(before);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});

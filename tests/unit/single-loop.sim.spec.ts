import { describe, expect, it } from 'vitest';
import {
  createSingleLoopSim,
  currentAtPosition,
  dampingRate,
  velocityAtPosition
} from '../../src/scenes/single-loop/scene.sim';

describe('single-loop simulation', () => {
  it('has no induced current in the uniform interior region', () => {
    const sim = createSingleLoopSim({
      autoRun: false,
      initialVelocity: 10,
      fieldStrength: 1.5,
      mass: 2,
      resistance: 2
    });
    sim.setParams({ autoRun: false });
    const state = sim.getState();
    expect(state.region).toBe('before');
    expect(currentAtPosition(sim.getParams(), 1.5)).toBe(0);
    expect(velocityAtPosition(sim.getParams(), 2)).toBeCloseTo(
      10 - dampingRate(sim.getParams()),
      6
    );
  });

  it('enters with positive current and exits with reversed current', () => {
    const params = {
      initialVelocity: 10,
      fieldStrength: 1.5,
      mass: 2,
      resistance: 2,
      autoRun: false,
      showCurrent: true
    };
    expect(currentAtPosition(params, -0.5)).toBeGreaterThan(0);
    expect(currentAtPosition(params, 3.5)).toBeLessThan(0);
  });

  it('increasing B or reducing m and R steepens the v-x slope', () => {
    const mild = createSingleLoopSim({
      autoRun: false,
      fieldStrength: 1,
      mass: 2,
      resistance: 4
    });
    const strong = createSingleLoopSim({
      autoRun: false,
      fieldStrength: 2,
      mass: 1,
      resistance: 1
    });
    expect(dampingRate(strong.getParams())).toBeGreaterThan(
      dampingRate(mild.getParams())
    );
    expect(velocityAtPosition(strong.getParams(), -0.5)).toBeLessThan(
      velocityAtPosition(mild.getParams(), -0.5)
    );
  });
});

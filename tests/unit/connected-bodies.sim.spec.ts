import { describe, expect, it } from 'vitest';
import { createConnectedBodiesSim } from '../../src/scenes/connected-bodies/scene.sim';
describe('connected-bodies simulation', () => {
  it('keeps the initial state balanced', () => {
    const state = createConnectedBodiesSim().getState();
    expect(state.params.cut).toBe('none');
    expect(state.accelerationA).toBe(0);
    expect(state.accelerationB).toBe(0);
    expect(state.upperForce).toBe(30);
    expect(state.lowerForce).toBe(10);
  });
  it('models a lower-string cut as a sudden acceleration change', () => {
    const sim = createConnectedBodiesSim({ massA: 2, massB: 1 });
    sim.cut('lower');
    const state = sim.getState();
    expect(state.accelerationA).toBe(5);
    expect(state.accelerationB).toBe(-10);
    expect(state.lowerForce).toBe(0);
  });
});

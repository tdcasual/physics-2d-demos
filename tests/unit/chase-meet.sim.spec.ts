import { describe, expect, it } from 'vitest';
import { createChaseMeetSim } from '../../src/scenes/chase-meet/scene.sim';

describe('chase-meet sim', () => {
  it('distance shrinks when pursuer speed is greater than target speed', () => {
    const sim = createChaseMeetSim({
      totalTime: 10,
      dt: 0.02,
      x0A: 0,
      x0B: 100,
      vExprA: '12',
      vExprB: '8'
    });
    const before = sim.getState().distance;
    sim.step(1 / 60);
    const after = sim.getState().distance;
    expect(after).toBeLessThan(before);
  });
});

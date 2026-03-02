import { describe, expect, it } from 'vitest';
import { createProjectileSim } from '../../src/scenes/projectile/scene.sim';

describe('projectile sim', () => {
  it('moves x forward after one positive dt step', () => {
    const sim = createProjectileSim({ speed: 10, angleDeg: 45, gravity: 9.8 });
    const before = sim.getState().x;
    sim.step(1 / 60);
    const after = sim.getState().x;
    expect(after).toBeGreaterThan(before);
  });
});

import { describe, expect, it } from 'vitest';
import {
  bulletBlockCommonSpeed,
  bulletBlockMaxDepth,
  createBulletBlockSim
} from '../../src/scenes/bullet-block/scene.sim';

describe('bullet block simulation', () => {
  it('conserves momentum in the ideal common-speed model', () => {
    expect(bulletBlockCommonSpeed(25, 1, 5)).toBeCloseTo(25 / 6, 8);
  });

  it('computes penetration depth from relative kinetic energy', () => {
    expect(bulletBlockMaxDepth(25, 1, 5, 50)).toBeCloseTo(5.208333, 5);
  });

  it('clamps parameters and enters the impact phase after approach', () => {
    const sim = createBulletBlockSim({
      speed: 99,
      bulletMass: -1,
      blockMass: 99,
      resistance: 0
    });
    expect(sim.getParams()).toMatchObject({
      speed: 45,
      bulletMass: 0.2,
      blockMass: 12,
      resistance: 5
    });
    sim.step(0.2);
    expect(sim.getState().phase).toBe('approach');
    sim.step(0.2);
    expect(['embed', 'coast']).toContain(sim.getState().phase);
  });
});

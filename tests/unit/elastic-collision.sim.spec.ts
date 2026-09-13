import { describe, expect, it } from 'vitest';
import { createCollisionSim } from '../../src/scenes/elastic-collision/scene.sim';

describe('elastic-collision simulation', () => {
  it('starts with cover defaults and calculates conservation values', () => {
    const s = createCollisionSim().getState();
    expect(s.massA).toBe(5);
    expect(s.velocityA).toBe(5);
    expect(s.massB).toBe(4);
    expect(s.velocityB).toBe(-5);
    expect(s.totalMomentum).toBe(5);
    expect(s.totalEnergy).toBe(112.5);
  });
  it('applies the one-dimensional elastic collision equations', () => {
    const sim = createCollisionSim({ positionA: -1, positionB: 1 });
    sim.step(0.05);
    sim.step(0.05);
    sim.step(0.05);
    const s = sim.getState();
    expect(s.collided).toBe(true);
    expect(s.collisionCount).toBe(1);
    expect(s.velocityA).toBeCloseTo(-3.8889, 3);
    expect(s.velocityB).toBeCloseTo(6.1111, 3);
    expect(s.totalMomentum).toBeCloseTo(5, 6);
    expect(s.totalEnergy).toBeCloseTo(112.5, 6);
  });
  it('can update parameters and reset the experiment', () => {
    const sim = createCollisionSim();
    sim.setParams({ massA: 2, velocityA: 3, velocityB: 0 });
    expect(sim.getState().massA).toBe(2);
    sim.reset();
    expect(sim.getState().massA).toBe(5);
    expect(sim.getState().collided).toBe(false);
  });
});

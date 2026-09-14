import { describe, expect, it } from 'vitest';
import {
  calculateMomentumComparison,
  createMomentumComparisonSim,
  momentumComparisonSample
} from '../../src/scenes/momentum-conservation-comparison/scene.sim';

describe('momentum-conservation-comparison simulation', () => {
  it('conserves total momentum for all restitution presets', () => {
    for (const collision of ['elastic', 'partial', 'inelastic'] as const) {
      const result = calculateMomentumComparison({
        massA: 2,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0,
        collision
      });
      expect(result.totalMomentumAfter).toBeCloseTo(
        result.totalMomentumBefore,
        10
      );
    }
  });

  it('matches standard elastic and fully inelastic outcomes', () => {
    const elastic = calculateMomentumComparison({
      massA: 1,
      massB: 1,
      velocityA: 2,
      velocityB: 0,
      collision: 'elastic'
    });
    expect(elastic.vAAfter).toBeCloseTo(0, 10);
    expect(elastic.vBAfter).toBeCloseTo(2, 10);
    const inelastic = calculateMomentumComparison({
      massA: 1,
      massB: 1,
      velocityA: 2,
      velocityB: 0,
      collision: 'inelastic'
    });
    expect(inelastic.vAAfter).toBeCloseTo(1, 10);
    expect(inelastic.vBAfter).toBeCloseTo(1, 10);
  });

  it('transitions from before to contact to after', () => {
    const before = momentumComparisonSample(
      {
        massA: 2,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0,
        collision: 'elastic'
      },
      0.2
    );
    const contact = momentumComparisonSample(
      {
        massA: 2,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0,
        collision: 'elastic'
      },
      0.56
    );
    const after = momentumComparisonSample(
      {
        massA: 2,
        massB: 1,
        velocityA: 1.5,
        velocityB: 0,
        collision: 'elastic'
      },
      0.9
    );
    expect(before.status).toBe('碰撞前');
    expect(contact.status).toBe('碰撞中');
    expect(after.status).toBe('碰撞后');
  });

  it('supports scheme changes, parameter normalization, pause, and reset', () => {
    const sim = createMomentumComparisonSim({
      massA: 99,
      massB: 0,
      velocityA: 9,
      velocityB: -9
    });
    expect(sim.getParams().massA).toBe(4);
    expect(sim.getParams().massB).toBe(0.5);
    expect(sim.getParams().velocityA).toBe(2);
    expect(sim.getParams().velocityB).toBe(-2);
    sim.setParams({ scheme: 'pendulum', autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.2);
    expect(sim.getState().time).toBeGreaterThan(0);
    expect(sim.getState().scheme).toBe('pendulum');
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});

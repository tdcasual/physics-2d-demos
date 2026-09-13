import { describe, expect, it } from 'vitest';
import {
  createProjectileDataSim,
  projectileDataDeltaY2,
  projectileDataPoint
} from '../../src/scenes/projectile-data-analysis/scene.sim';

describe('projectile data analysis simulation', () => {
  it('uses x=v₀t and y=½gt² for strobe points', () => {
    const point = projectileDataPoint(2, 10, 0.15, 2);
    expect(point.x).toBeCloseTo(0.6, 8);
    expect(point.y).toBeCloseTo(0.45, 8);
    expect(point.deltaY).toBeCloseTo(0.3375, 8);
  });

  it('recovers horizontal spacing and vertical second difference', () => {
    expect(projectileDataDeltaY2(10, 0.15)).toBeCloseTo(0.225, 8);
    const sim = createProjectileDataSim({ v0: 2, gravity: 10, period: 0.15 });
    const state = sim.getState();
    expect(state.deltaX).toBeCloseTo(0.3, 8);
    expect(state.restoredV0).toBeCloseTo(2, 8);
  });

  it('clamps unsafe parameters and advances the sample cursor', () => {
    const sim = createProjectileDataSim({ v0: 99, gravity: -1, period: 9 });
    expect(sim.getParams()).toMatchObject({ v0: 5, gravity: 1.6, period: 0.3 });
    sim.step(0.3);
    expect(sim.getState().currentIndex).toBe(1);
  });
});

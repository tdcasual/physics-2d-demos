import { describe, expect, it } from 'vitest';
import {
  createThreeForcesSim,
  threeForcesValues
} from '../../src/scenes/three-forces/scene.sim';

describe('three-forces sim', () => {
  it('decomposes gravity on a 30 degree incline', () => {
    const values = threeForcesValues({
      tab: 'gravity',
      mass: 3,
      inclineAngle: 30,
      mu: 0.4,
      springX: 0.2,
      autoRun: true,
      showComponents: true
    });
    expect(values.gravity).toBeCloseTo(30, 8);
    expect(values.downslope).toBeCloseTo(15, 8);
    expect(values.normal).toBeCloseTo(25.98, 2);
  });
  it('detects static and sliding friction states', () => {
    const still = createThreeForcesSim({
      tab: 'friction',
      mass: 3,
      inclineAngle: 30,
      mu: 0.7
    });
    expect(still.getState().status).toBe('静止平衡');
    const slide = createThreeForcesSim({
      tab: 'friction',
      mass: 3,
      inclineAngle: 30,
      mu: 0.2
    });
    expect(slide.getState().status).toBe('沿斜面下滑');
  });
  it('clamps parameters and computes spring force', () => {
    const sim = createThreeForcesSim({ tab: 'spring', mass: 3, springX: 0.2 });
    expect(sim.getState().springForce).toBeCloseTo(8, 8);
    sim.setParams({ mass: 99, inclineAngle: -1 });
    expect(sim.getParams()).toMatchObject({ mass: 6, inclineAngle: 10 });
  });
});

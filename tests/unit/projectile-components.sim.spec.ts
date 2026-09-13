import { describe, expect, it } from 'vitest';
import {
  createProjectileComponentsSim,
  projectileComponentsPoint,
  projectileFlightTime
} from '../../src/scenes/projectile-components/scene.sim';

describe('projectile-components simulation', () => {
  it('keeps horizontal motion uniform and vertical motion accelerated', () => {
    const point = projectileComponentsPoint(
      { speed: 15, initialHeight: 45, gravity: 10 },
      3
    );
    expect(point.x).toBeCloseTo(45, 6);
    expect(point.verticalDisplacement).toBeCloseTo(45, 6);
    expect(point.height).toBeCloseTo(0, 6);
    expect(point.vy).toBeCloseTo(30, 6);
  });

  it('computes flight time from initial height and gravity', () => {
    expect(projectileFlightTime(45, 10)).toBeCloseTo(3, 6);
    expect(projectileFlightTime(20, 5)).toBeCloseTo(2.828427, 5);
  });

  it('builds evenly spaced strobe samples including landing', () => {
    const sim = createProjectileComponentsSim({
      speed: 15,
      initialHeight: 45,
      gravity: 10,
      samplePeriod: 0.5,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.points).toHaveLength(7);
    expect(state.points[3].time).toBeCloseTo(1.5, 6);
    expect(state.points[3].x).toBeCloseTo(22.5, 6);
    expect(state.points.at(-1)?.time).toBeCloseTo(3, 6);
  });

  it('pauses, clamps parameters, and loops after the animation cycle', () => {
    const sim = createProjectileComponentsSim({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true, speed: 100, initialHeight: 5 });
    expect(sim.getParams().speed).toBe(25);
    sim.step(10);
    expect(sim.getState().time).toBe(0);
  });
});

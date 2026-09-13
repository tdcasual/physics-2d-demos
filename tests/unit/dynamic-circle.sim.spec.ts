import { describe, expect, it } from 'vitest';
import {
  circleCenter,
  createDynamicCircleSim,
  orbitPoint,
  orbitRadius,
  vectorFromAngle
} from '../../src/scenes/dynamic-circle/scene.sim';

describe('dynamic-circle sim', () => {
  it('uses R = v / |B| and places the center perpendicular to velocity', () => {
    expect(orbitRadius(11.5, 0.1)).toBeCloseTo(115, 8);
    expect(circleCenter({ x: 250, y: 330 }, 115, -90, 0.1)).toEqual({
      x: 135,
      y: 330
    });
    expect(orbitPoint({ x: 250, y: 330 }, 115, -90, 0.1, 0)).toEqual({
      x: 250,
      y: 330
    });
  });

  it('reproduces the initial rotating-circle tangent', () => {
    const point = orbitPoint({ x: 300, y: 330 }, 150, 0, 0.1, 1.5);
    expect(point.x).toBeCloseTo(301.499975, 5);
    expect(point.y).toBeCloseTo(329.9925, 5);
  });

  it('reverses curvature when B reverses', () => {
    const inward = orbitPoint({ x: 300, y: 330 }, 150, 0, 0.1, 30);
    const outward = orbitPoint({ x: 300, y: 330 }, 150, 0, -0.1, 30);
    expect(inward.y).toBeLessThan(330);
    expect(outward.y).toBeGreaterThan(330);
    expect(vectorFromAngle(5, 90).x).toBeCloseTo(0, 8);
  });

  it('sweeps one control variable per model and keeps values bounded', () => {
    const sim = createDynamicCircleSim({ tab: 'scaling', autoSweep: true });
    sim.step(1);
    expect(sim.getParams().v).toBeGreaterThanOrEqual(4);
    expect(sim.getParams().v).toBeLessThanOrEqual(25);
    sim.setTab('rotating');
    sim.step(1);
    expect(sim.getParams().theta).toBeGreaterThanOrEqual(-90);
    expect(sim.getParams().theta).toBeLessThanOrEqual(90);
    sim.setTab('translating');
    sim.step(1);
    expect(sim.getParams().y0).toBeGreaterThanOrEqual(150);
    expect(sim.getParams().y0).toBeLessThanOrEqual(510);
  });

  it('clamps controls and reset returns the reference defaults', () => {
    const sim = createDynamicCircleSim();
    sim.setParams({ B: 4, v: 99, y0: -1, circleR: 999 });
    expect(sim.getParams()).toMatchObject({
      B: 0.25,
      v: 25,
      y0: 150,
      circleR: 200
    });
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      tab: 'scaling',
      boundary: 'straight',
      B: 0.1,
      v: 11.5,
      theta: -90
    });
    expect(sim.getState().t).toBe(0);
  });
});

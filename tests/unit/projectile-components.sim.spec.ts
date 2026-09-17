import { describe, expect, it } from 'vitest';
import {
  asBool,
  createProjectileComponentsSim,
  projectileComponentsPoint,
  projectileFlightTime,
  projectileRange,
  strobeTimes
} from '../../src/scenes/projectile-components/scene.sim';
import {
  plotLayout,
  vectorMarks,
  worldToScreen
} from '../../src/scenes/projectile-components/scene.view';

describe('projectile-components simulation', () => {
  it('keeps horizontal motion uniform and vertical motion accelerated', () => {
    // Cover default: v0=15, h0=45, g=10 → T=√(2h/g)=3, x=v0T=45, y=½gT²=45, vy=gT=30
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

  it('gives range ≈122.47 m at speed=25, h0=60, g=5', () => {
    // T=√(2×60/5)=√24≈4.898979; range=25×T≈122.4745
    expect(
      projectileRange({ speed: 25, initialHeight: 60, gravity: 5 })
    ).toBeCloseTo(122.47, 2);
  });

  it('builds evenly spaced strobe samples including landing', () => {
    const sim = createProjectileComponentsSim({
      speed: 15,
      initialHeight: 45,
      gravity: 10,
      samplePeriod: 0.5
    });
    const state = sim.getState();
    expect(state.points).toHaveLength(7);
    expect(state.points[3].time).toBeCloseTo(1.5, 6);
    expect(state.points[3].x).toBeCloseTo(22.5, 6);
    expect(state.points.at(-1)?.time).toBeCloseTo(3, 6);
  });

  it('appends a unique landing sample when Δt does not divide T', () => {
    // h0=20, g=5 → T=√8≈2.828427; Δt=0.75 → 0, 0.75, 1.50, 2.25, T
    const duration = projectileFlightTime(20, 5);
    const times = strobeTimes(duration, 0.75);
    expect(times.at(-1)).toBeCloseTo(duration, 10);
    expect(
      times.filter((stamp) => Math.abs(stamp - duration) < 1e-9)
    ).toHaveLength(1);
    expect(times.slice(0, -1)).toEqual([0, 0.75, 1.5, 2.25]);
    const unique = new Set(times.map((stamp) => stamp.toFixed(9)));
    expect(unique.size).toBe(times.length);
  });

  it('snaps the last sample to T without duplicating an exact multiple', () => {
    const times = strobeTimes(3, 0.5);
    expect(times.at(-1)).toBe(3);
    expect(times).toHaveLength(7);
    expect(new Set(times).size).toBe(7);
  });

  it('clamps illegal parameters and restarts time when kinematics change', () => {
    const sim = createProjectileComponentsSim();
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 6);
    sim.setParams({ speed: 100, initialHeight: 5, gravity: 0 });
    expect(sim.getParams().speed).toBe(25);
    expect(sim.getParams().initialHeight).toBe(20);
    expect(sim.getParams().gravity).toBe(5);
    expect(sim.getState().time).toBe(0);
  });

  it('lets the caller pause by not stepping, and loops after the hold', () => {
    const sim = createProjectileComponentsSim();
    sim.step(1.2);
    expect(sim.getState().time).toBeCloseTo(1.2, 6);
    expect(sim.getState().time).toBeCloseTo(1.2, 6);
    sim.step(10);
    expect(sim.getState().time).toBe(0);
  });

  it('reset restores constructor defaults and time', () => {
    const sim = createProjectileComponentsSim();
    sim.setParams({ speed: 25, showVectors: false });
    sim.step(2);
    sim.reset();
    expect(sim.getParams().speed).toBe(15);
    expect(sim.getParams().showVectors).toBe(true);
    expect(sim.getState().time).toBe(0);
  });

  it('parses URL-like boolean tokens', () => {
    expect(asBool(1, false)).toBe(true);
    expect(asBool(0, true)).toBe(false);
    expect(asBool('1', false)).toBe(true);
    expect(asBool('0', true)).toBe(false);
    expect(asBool('true', false)).toBe(true);
    expect(asBool('off', true)).toBe(false);
    expect(asBool('nope', true)).toBe(true);
  });

  it('maps extrema range inside the left field without clipping', () => {
    const sim = createProjectileComponentsSim({
      speed: 25,
      initialHeight: 60,
      gravity: 5
    });
    const duration = projectileFlightTime(60, 5);
    sim.step(duration);
    const state = sim.getState();
    expect(state.landed).toBe(true);
    expect(state.x).toBeCloseTo(122.47, 2);
    const layout = plotLayout(state, 760, 760, 1);
    const landing = worldToScreen(layout, state.x, state.verticalDisplacement);
    expect(landing.x).toBeGreaterThan(layout.originX);
    expect(landing.x).toBeLessThan(layout.width - 8);
    expect(landing.y).toBeLessThan(layout.height - 8);
    expect(landing.y).toBeGreaterThan(layout.originY);
  });

  it('keeps default y-axis domain at 90 m like the cover', () => {
    const sim = createProjectileComponentsSim();
    const layout = plotLayout(sim.getState(), 760, 760, 1);
    expect(layout.yExtent).toBeCloseTo(90, 6);
  });

  it('keeps landing vx/vy/v labels inside the field at extrema', () => {
    const sim = createProjectileComponentsSim({
      speed: 25,
      initialHeight: 60,
      gravity: 5
    });
    sim.step(projectileFlightTime(60, 5));
    const layout = plotLayout(sim.getState(), 760, 760, 1);
    const marks = vectorMarks(sim.getState(), layout);
    expect(marks).not.toBeNull();
    for (const point of [
      marks!.vxLabel,
      marks!.vyLabel,
      marks!.vLabel,
      marks!.vxTip,
      marks!.vyTip,
      marks!.vTip
    ]) {
      expect(point.x).toBeGreaterThanOrEqual(8);
      expect(point.x).toBeLessThanOrEqual(layout.width - 8);
      expect(point.y).toBeGreaterThanOrEqual(8);
      expect(point.y).toBeLessThanOrEqual(layout.height - 8);
    }
  });
});

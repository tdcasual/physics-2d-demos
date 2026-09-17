import { describe, expect, it } from 'vitest';
import { createCentripetalScene } from '../../src/scenes/centripetal-motion/scene.entry';
import {
  centripetalAcceleration,
  centripetalForce,
  centripetalConstants as C,
  createCentripetalSim,
  period,
  radialInwardUnit,
  tangentialSpeed,
  tangentUnit
} from '../../src/scenes/centripetal-motion/scene.sim';

describe('centripetal-motion simulation', () => {
  it('matches hand values at the default teaching point', () => {
    // m=2 kg, r=2.5 m, ω=1.5 rad/s
    // v=ωr=3.75 m/s; aₙ=ω²r=2.25×2.5=5.625 m/s²; Fₙ=maₙ=11.25 N
    // T=2π/ω=4π/3 s
    const sim = createCentripetalSim({
      mass: 2,
      radius: 2.5,
      angularVelocity: 1.5,
      autoRun: false
    });
    const state = sim.getState();
    expect(tangentialSpeed(state.params)).toBeCloseTo(3.75);
    expect(centripetalAcceleration(state.params)).toBeCloseTo(5.625);
    expect(centripetalForce(state.params)).toBeCloseTo(11.25);
    expect(period(state.params)).toBeCloseTo(4.18879, 5);
  });

  it('matches a second hand point m=1, r=2, ω=2', () => {
    // v=4 m/s, aₙ=8 m/s², Fₙ=8 N, T=π s
    const sim = createCentripetalSim({
      mass: 1,
      radius: 2,
      angularVelocity: 2,
      autoRun: false
    });
    const s = sim.getState();
    expect(s.speed).toBeCloseTo(4);
    expect(s.centripetalAcceleration).toBeCloseTo(8);
    expect(s.centripetalForce).toBeCloseTo(8);
    expect(s.period).toBeCloseTo(Math.PI);
  });

  it('doubles v and quadruples Fₙ when ω goes 1→2 at fixed m=2, r=2.5', () => {
    const slow = createCentripetalSim({
      mass: 2,
      radius: 2.5,
      angularVelocity: 1,
      autoRun: false
    }).getState();
    const fast = createCentripetalSim({
      mass: 2,
      radius: 2.5,
      angularVelocity: 2,
      autoRun: false
    }).getState();
    // v=ωr: 2.5 → 5; Fₙ=mω²r: 5 → 20
    expect(slow.speed).toBeCloseTo(2.5);
    expect(fast.speed).toBeCloseTo(5);
    expect(fast.speed / slow.speed).toBeCloseTo(2);
    expect(slow.centripetalForce).toBeCloseTo(5);
    expect(fast.centripetalForce).toBeCloseTo(20);
    expect(fast.centripetalForce / slow.centripetalForce).toBeCloseTo(4);
  });

  it('advances angle as ωΔt without changing uniform speed', () => {
    const sim = createCentripetalSim({ angularVelocity: 2, autoRun: true });
    const before = sim.getState();
    sim.step(0.5);
    const after = sim.getState();
    expect(after.angle - before.angle).toBeCloseTo(1);
    expect(after.speed).toBeCloseTo(before.speed);
  });

  it('matches the screen-space trajectory derivative (−sin θ, cos θ)', () => {
    const angles = [0, 0.4, Math.PI / 2, 2.2, Math.PI, 4.1, (3 * Math.PI) / 2];
    const dθ = 1e-5;
    for (const θ of angles) {
      const dx = (Math.cos(θ + dθ) - Math.cos(θ - dθ)) / (2 * dθ);
      const dy = (Math.sin(θ + dθ) - Math.sin(θ - dθ)) / (2 * dθ);
      const t = tangentUnit(θ);
      expect(t.x).toBeCloseTo(dx, 8);
      expect(t.y).toBeCloseTo(dy, 8);
      expect(t.x).toBeCloseTo(-Math.sin(θ), 10);
      expect(t.y).toBeCloseTo(Math.cos(θ), 10);
      const wrong = { x: Math.sin(θ), y: -Math.cos(θ) };
      expect(t.x * wrong.x + t.y * wrong.y).toBeCloseTo(-1, 10);
    }
  });

  it('keeps Fₙ radial inward and perpendicular to v at many angles', () => {
    for (let k = 0; k < 12; k += 1) {
      const θ = (k * Math.PI) / 6;
      const t = tangentUnit(θ);
      const n = radialInwardUnit(θ);
      expect(t.x * n.x + t.y * n.y).toBeCloseTo(0, 10);
      expect(n.x).toBeCloseTo(-Math.cos(θ), 10);
      expect(n.y).toBeCloseTo(-Math.sin(θ), 10);
    }
  });

  it('clamps control extrema', () => {
    const sim = createCentripetalSim({
      mass: 99,
      radius: -1,
      angularVelocity: 99
    });
    expect(sim.getParams()).toMatchObject({
      mass: C.massMax,
      radius: C.radiusMin,
      angularVelocity: C.angularVelocityMax
    });
    sim.setParams({
      mass: 0.1,
      radius: 9,
      angularVelocity: 0.1
    });
    expect(sim.getParams()).toMatchObject({
      mass: C.massMin,
      radius: C.radiusMax,
      angularVelocity: C.angularVelocityMin
    });
  });

  it('holds the angle while paused and restores defaults on reset', () => {
    const sim = createCentripetalSim({
      mass: 4,
      radius: 3,
      angularVelocity: 2.5,
      autoRun: true
    });
    sim.step(0.4);
    const moved = sim.getState();
    expect(moved.angle).not.toBeCloseTo(C.initialAngle);
    sim.setParams({ autoRun: false });
    const frozen = sim.getState().angle;
    sim.step(1);
    expect(sim.getState().angle).toBe(frozen);
    sim.reset();
    const after = sim.getState();
    expect(after.angle).toBe(C.initialAngle);
    expect(after.params).toMatchObject({
      mass: 2,
      radius: 2.5,
      angularVelocity: 1.5,
      autoRun: true
    });
    expect(after.time).toBe(0);
  });

  it('pauses and resumes through the scene transport hooks', () => {
    const scene = createCentripetalScene();
    scene.startAll();
    scene.step(0.3);
    const moved = scene.getState().angle;
    expect(moved).not.toBeCloseTo(C.initialAngle);
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.step(1);
    expect(scene.getState().angle).toBe(moved);
    scene.reset();
    expect(scene.getState().angle).toBe(C.initialAngle);
    expect(scene.getParams().autoRun).toBe(true);
    scene.dispose();
  });
});

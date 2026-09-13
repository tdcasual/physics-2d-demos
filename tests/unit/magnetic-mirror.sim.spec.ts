import { describe, expect, it } from 'vitest';
import {
  createMagneticMirrorSim,
  magneticFieldRatio,
  mirrorPointFor
} from '../../src/scenes/magnetic-mirror/scene.sim';

describe('magnetic mirror simulation', () => {
  it('uses a weak center and stronger mirror ends', () => {
    expect(magneticFieldRatio(0, 6)).toBe(1);
    expect(magneticFieldRatio(1, 6)).toBe(6);
    expect(magneticFieldRatio(-1, 6)).toBe(6);
  });

  it('computes a finite reflection point for a trapped particle', () => {
    const point = mirrorPointFor(35, 6);
    expect(point).toBeGreaterThan(0);
    expect(point).toBeLessThan(1);
  });

  it('conserves kinetic energy while exchanging parallel and perpendicular speed', () => {
    const sim = createMagneticMirrorSim({ pitchAngle: 35, mirrorRatio: 6 });
    const start = sim.getState();
    for (let i = 0; i < 180; i += 1) sim.step(0.016);
    const later = sim.getState();
    expect(later.energy).toBeCloseTo(start.energy, 8);
    expect(later.perpendicularSpeed).toBeGreaterThan(start.perpendicularSpeed);
    expect(Math.abs(later.parallelSpeed)).toBeLessThan(start.parallelSpeed);
  });

  it('pauses and clamps parameters safely', () => {
    const sim = createMagneticMirrorSim({
      pitchAngle: 999,
      mirrorRatio: 99,
      autoRun: false
    });
    const before = sim.getState();
    expect(sim.getParams().pitchAngle).toBe(85);
    expect(sim.getParams().mirrorRatio).toBe(10);
    sim.step(1);
    expect(sim.getState().position).toBe(before.position);
  });
});

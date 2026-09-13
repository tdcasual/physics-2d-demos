import { describe, expect, it } from 'vitest';
import {
  binaryStarsForce,
  binaryStarsOmega,
  binaryStarsRadii,
  createBinaryStarsSim
} from '../../src/scenes/binary-stars/scene.sim';

describe('binary stars sim', () => {
  it('keeps the center of mass at the origin', () => {
    const { r1, r2 } = binaryStarsRadii(4, 2, 30);
    expect(r1).toBeCloseTo(10, 8);
    expect(r2).toBeCloseTo(20, 8);
    expect(4 * r1).toBeCloseTo(2 * r2, 8);
  });

  it('uses one angular speed and equal mutual force', () => {
    expect(binaryStarsOmega(4, 2, 30)).toBeCloseTo(Math.sqrt(6 / 27000), 8);
    expect(binaryStarsForce(4, 2, 30)).toBeCloseTo(8 / 900, 8);
  });

  it('animates, clamps controls, and pauses when disabled', () => {
    const sim = createBinaryStarsSim({ m1: 99, m2: -1, distance: 99 });
    expect(sim.getParams()).toMatchObject({ m1: 8, m2: 1, distance: 40 });
    const before = sim.getState().t;
    sim.setParams({ autoRun: false });
    sim.step(2);
    expect(sim.getState().t).toBe(before);
    sim.setParams({ autoRun: true });
    sim.step(2);
    expect(sim.getState().t).toBeCloseTo(2, 8);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createFreeFallSim,
  freeFallAt,
  freeFallConstants as C,
  type FreeFallParams
} from '../../src/scenes/free-fall-throw/scene.sim';

const base: FreeFallParams = {
  initialSpeed: 20,
  mode: 'compare',
  timeProgress: 0,
  autoRun: true,
  showVelocity: true,
  showHeight: true
};

describe('free fall and vertical throw simulation', () => {
  it('reaches the expected apex and returns to the ground symmetrically', () => {
    const apex = freeFallAt(base, 2);
    const landing = freeFallAt(base, 4);
    expect(apex.height).toBeCloseTo(20, 6);
    expect(apex.velocity).toBeCloseTo(0, 6);
    expect(landing.height).toBeCloseTo(0, 6);
    expect(landing.velocity).toBeCloseTo(-20, 6);
  });

  it('releases the comparison ball at the apex and models free fall', () => {
    const before = freeFallAt(base, 1.9);
    const after = freeFallAt(base, 2.5);
    expect(before.bReleased).toBe(false);
    expect(before.bHeight).toBeCloseTo(20, 6);
    expect(after.bReleased).toBe(true);
    expect(after.bHeight).toBeCloseTo(18.75, 6);
    expect(after.bVelocity).toBeCloseTo(-5, 6);
  });

  it('pauses, advances and resets all presentation state', () => {
    const sim = createFreeFallSim(base);
    sim.step(0.5);
    expect(sim.getState().timeProgress).toBeGreaterThan(0);
    sim.setParams({ autoRun: false });
    const paused = sim.getState().clockTime;
    sim.step(1);
    expect(sim.getState().clockTime).toBe(paused);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().initialSpeed).toBe(C.defaultSpeed);
  });
});

import { describe, expect, it } from 'vitest';
import { createProjectileSim } from '../../src/scenes/projectile/scene.sim';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';

describe('projectile sim', () => {
  it('moves x forward after one positive dt step', () => {
    const sim = createProjectileSim({
      speed: 10,
      angleDeg: 45,
      gravity: 9.8,
      initialHeight: 0,
      windAccel: 0,
      drag: 0
    });
    const before = sim.getState().x;
    sim.step(1 / 60);
    const after = sim.getState().x;
    expect(after).toBeGreaterThan(before);
  });

  it('supports custom launch parameters and dynamic update', () => {
    const sim = createProjectileSim({
      speed: 12,
      angleDeg: 40,
      gravity: 9.8,
      initialHeight: 3,
      windAccel: 0,
      drag: 0
    });

    expect(sim.getState().y).toBeCloseTo(3, 6);

    sim.setParams({
      speed: 20,
      angleDeg: 60,
      gravity: 3.7,
      initialHeight: 5,
      windAccel: 2,
      drag: 0.05
    });

    sim.reset();
    const state = sim.getState();
    expect(state.y).toBeCloseTo(5, 6);
    expect(state.vx).toBeGreaterThan(0);
    expect(state.vy).toBeGreaterThan(0);
    expect(sim.getParams().gravity).toBeCloseTo(3.7, 6);
  });

  it('creates the scene with non-zero launch defaults from metadata', () => {
    const canvas = document.createElement('canvas');
    const scene = createProjectileScene({ canvas });

    expect(scene.getParams().speed).toBeGreaterThan(0);
    expect(scene.getParams().angleDeg).toBeGreaterThan(0);
    expect(scene.getParams().gravity).toBeGreaterThan(0);
    expect(scene.getState().vx).toBeGreaterThan(0);
    expect(scene.getState().vy).toBeGreaterThan(0);

    scene.dispose();
  });
});

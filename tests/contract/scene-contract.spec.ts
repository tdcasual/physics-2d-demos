import { describe, expect, it } from 'vitest';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';

describe('scene contract', () => {
  it('implements required lifecycle methods', () => {
    const projectileScene = createProjectileScene();
    expect(typeof projectileScene.init).toBe('function');
    expect(typeof projectileScene.reset).toBe('function');
    expect(typeof projectileScene.step).toBe('function');
    expect(typeof projectileScene.render).toBe('function');
    expect(typeof projectileScene.dispose).toBe('function');

    projectileScene.dispose();
  });
});

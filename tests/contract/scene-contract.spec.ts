import { describe, expect, it } from 'vitest';
import { projectileScene } from '../../src/scenes/projectile/scene.entry';

describe('scene contract', () => {
  it('implements required lifecycle methods', () => {
    expect(typeof projectileScene.init).toBe('function');
    expect(typeof projectileScene.reset).toBe('function');
    expect(typeof projectileScene.step).toBe('function');
    expect(typeof projectileScene.render).toBe('function');
    expect(typeof projectileScene.dispose).toBe('function');
  });
});

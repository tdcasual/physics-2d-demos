import { describe, expect, it } from 'vitest';
import { createChaseMeetScene } from '../../src/scenes/chase-meet/scene.entry';
import { createElectrificationScene } from '../../src/scenes/electrification/scene.entry';
import { createEmfAnalogyScene } from '../../src/scenes/emf-analogy/scene.entry';
import { createFieldLinesScene } from '../../src/scenes/field-lines/scene.entry';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';
import { createVtIntegralScene } from '../../src/scenes/vt-integral/scene.entry';

describe('scene contract', () => {
  it('implements required lifecycle methods', () => {
    const mockCtx = {
      setTransform: () => {},
      scale: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      strokeText: () => {},
      arc: () => {},
      rect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      closePath: () => {},
      clip: () => {},
      measureText: () => ({ width: 0 })
    } as unknown as CanvasRenderingContext2D;
    const mockCanvas = {
      getContext: () => mockCtx,
      width: 800,
      height: 600,
      style: {},
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      addEventListener: () => {},
      removeEventListener: () => {}
    } as unknown as HTMLCanvasElement;
    const projectileScene = createProjectileScene({ canvas: mockCanvas });
    expect(typeof projectileScene.init).toBe('function');
    expect(typeof projectileScene.reset).toBe('function');
    expect(typeof projectileScene.step).toBe('function');
    expect(typeof projectileScene.render).toBe('function');
    expect(typeof projectileScene.dispose).toBe('function');

    projectileScene.dispose();
  });

  it('chase-meet scene implements required lifecycle methods', () => {
    const chaseMeetScene = createChaseMeetScene();
    expect(typeof chaseMeetScene.init).toBe('function');
    expect(typeof chaseMeetScene.reset).toBe('function');
    expect(typeof chaseMeetScene.step).toBe('function');
    expect(typeof chaseMeetScene.render).toBe('function');
    expect(typeof chaseMeetScene.dispose).toBe('function');

    chaseMeetScene.dispose();
  });

  it('field-lines scene implements required lifecycle methods', () => {
    const scene = createFieldLinesScene();
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.reset).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.dispose).toBe('function');
    scene.dispose();
  });

  it('emf-analogy scene implements required lifecycle methods', () => {
    const scene = createEmfAnalogyScene();
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.reset).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.dispose).toBe('function');
    scene.dispose();
  });

  it('electrification scene implements required lifecycle methods', () => {
    const scene = createElectrificationScene();
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.reset).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.dispose).toBe('function');
    scene.dispose();
  });

  it('vt-integral scene implements required lifecycle methods', () => {
    const scene = createVtIntegralScene();
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.reset).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.dispose).toBe('function');
    scene.dispose();
  });
});

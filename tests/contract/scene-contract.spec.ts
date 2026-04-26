import { describe, expect, it } from 'vitest';
import { createChaseMeetScene } from '../../src/scenes/chase-meet/scene.entry';
import { createElectrificationScene } from '../../src/scenes/electrification/scene.entry';
import { createEmfAnalogyScene } from '../../src/scenes/emf-analogy/scene.entry';
import { createFieldLinesScene } from '../../src/scenes/field-lines/scene.entry';
import { createProjectileScene } from '../../src/scenes/projectile/scene.entry';
import { createSpringOscillatorScene } from '../../src/scenes/spring-oscillator/scene.entry';
import { createVtIntegralScene } from '../../src/scenes/vt-integral/scene.entry';

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

const scenes = [
  { name: 'projectile', create: () => createProjectileScene({ canvas: mockCanvas }) },
  { name: 'chase-meet', create: createChaseMeetScene },
  { name: 'field-lines', create: createFieldLinesScene },
  { name: 'emf-analogy', create: createEmfAnalogyScene },
  { name: 'electrification', create: createElectrificationScene },
  { name: 'vt-integral', create: createVtIntegralScene },
  { name: 'spring-oscillator', create: createSpringOscillatorScene }
];

describe('scene contract', () => {
  it.each(scenes)('$name implements required lifecycle methods', ({ create }) => {
    const scene = create();
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.reset).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.dispose).toBe('function');
    scene.dispose();
  });

  it('projectile: render before init does not throw', () => {
    const scene = createProjectileScene({ canvas: mockCanvas });
    expect(() => scene.render()).not.toThrow();
    scene.dispose();
  });

  it('projectile: dispose is idempotent', () => {
    const scene = createProjectileScene({ canvas: mockCanvas });
    scene.init();
    expect(() => {
      scene.dispose();
      scene.dispose();
    }).not.toThrow();
  });

  it('projectile: getState returns a plain object', () => {
    const scene = createProjectileScene({ canvas: mockCanvas });
    scene.init();
    const state = (scene as unknown as { getState(): object }).getState?.();
    if (state !== undefined) {
      expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    }
    scene.dispose();
  });

  it('projectile: step returns void or state', () => {
    const scene = createProjectileScene({ canvas: mockCanvas });
    scene.init();
    const result = scene.step(1 / 60);
    expect(result === undefined || typeof result === 'object').toBe(true);
    scene.dispose();
  });
});

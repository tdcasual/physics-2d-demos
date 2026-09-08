import { describe, expect, it } from 'vitest';
import { createChaseMeetScene } from '../../src/scenes/chase-meet/scene.entry';

describe('chase-meet stage reattach', () => {
  it('moves stage DOM into a new animation slot without recreating sim', () => {
    const first = document.createElement('div');
    document.body.append(first);
    const scene = createChaseMeetScene({ stageSlot: first });
    scene.init();
    expect(first.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement);
    const before = scene.getState();

    const second = document.createElement('div');
    document.body.append(second);
    scene.attachStageSlot(second);

    expect(second.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement);
    expect(scene.getState().t).toBe(before.t);

    scene.dispose();
    first.remove();
    second.remove();
  });
});

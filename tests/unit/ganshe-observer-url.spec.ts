/**
 * ganshe primary-observer canvas moves must write observerX through the
 * injected sceneWriter (B21). Extra observers stay off the URL.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createGansheScene } from '../../src/scenes/ganshe/scene.entry';

function stubCanvas(width = 800, height = 400): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({})
    }) as DOMRect;
  return canvas;
}

describe('ganshe observer URL writeback', () => {
  const scenes: Array<{ dispose(): void }> = [];

  afterEach(() => {
    while (scenes.length > 0) scenes.pop()?.dispose();
  });

  it('blank click on the primary observer writes observerX', () => {
    const writes: Array<Record<string, unknown>> = [];
    const canvas = stubCanvas();
    const scene = createGansheScene({
      canvas,
      sceneWriter: {
        write(patch) {
          writes.push({ ...patch });
        }
      }
    });
    scenes.push(scene);
    scene.init();

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      })
    );

    expect(writes.length).toBeGreaterThan(0);
    const last = writes[writes.length - 1];
    expect(last).toHaveProperty('observerX');
    expect(typeof last.observerX).toBe('number');
    expect(scene.getParams().observerX).toBe(last.observerX);
    expect(scene.getParams().observerX).toBeLessThan(15);
  });

  it('omits URL writes when no sceneWriter is injected', () => {
    const canvas = stubCanvas();
    const scene = createGansheScene({ canvas });
    scenes.push(scene);
    scene.init();
    expect(() =>
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 100,
          clientY: 200,
          bubbles: true
        })
      )
    ).not.toThrow();
    expect(scene.getParams().observerX).toBeLessThan(15);
  });
});

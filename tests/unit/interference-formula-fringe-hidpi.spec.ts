import { describe, expect, it, vi } from 'vitest';
import { drawFringeGraph } from '../../src/scenes/interference-formula/renderer/draw-fringe-graph';
import type { InterferenceFormulaState } from '../../src/scenes/interference-formula/scene.sim';

function makeState(): InterferenceFormulaState {
  return {
    params: { lambda: 650, L: 1, d: 0.5, step: 'result' },
    deltaX: 0.0013,
    fringePositions: [0]
  };
}

describe('drawFringeGraph HiDPI offscreen cache', () => {
  it('creates the offscreen canvas at CSS size × gDpr', () => {
    const created: HTMLCanvasElement[] = [];
    const orig = document.createElement.bind(document);
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName, options) => {
        const el = orig(tagName, options);
        if (String(tagName).toLowerCase() === 'canvas') {
          created.push(el as HTMLCanvasElement);
        }
        return el;
      });

    const gDpr = 2;
    const cssW = 400;
    const cssH = 300;
    const gScale = 1;
    const graphCanvas = orig('canvas') as HTMLCanvasElement;
    graphCanvas.width = cssW * gDpr;
    graphCanvas.height = cssH * gDpr;
    const ctx = graphCanvas.getContext('2d');
    expect(ctx).toBeTruthy();

    drawFringeGraph(
      ctx,
      graphCanvas,
      {
        cssWidth: cssW,
        cssHeight: cssH,
        responsiveScale: gScale,
        dpr: gDpr
      },
      makeState(),
      1,
      'dark'
    );

    spy.mockRestore();

    const margin = 16 * gScale;
    const stripeY = margin + 20 * gScale;
    const stripeW = cssW - margin * 2;
    const stripeH = cssH - stripeY - margin - 30 * gScale;
    const expectedW = Math.ceil(stripeW * gDpr);
    const expectedH = Math.ceil(stripeH * gDpr);
    expect(
      created.some((c) => c.width === expectedW && c.height === expectedH)
    ).toBe(true);
  });
});

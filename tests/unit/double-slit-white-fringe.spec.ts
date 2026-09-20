import { describe, expect, it, vi } from 'vitest';
import { WHITE_LAMBDAS } from '../../src/scenes/double-slit/scene.sim';
import {
  drawStep6Pattern,
  resetInterferenceCaches
} from '../../src/scenes/double-slit/renderer/draw-interference';
import {
  getWavePalette,
  SCENE_PALETTE
} from '../../src/scenes/double-slit/renderer/palette';
import { computeWhiteFringeRgb } from '../../src/scenes/double-slit/renderer/draw-white';

describe('double-slit white-light fringe synthesis', () => {
  it('accumulates a normalized, symmetric multi-wavelength RGB pattern', () => {
    const halfWidth = 180;
    const rgb = computeWhiteFringeRgb(WHITE_LAMBDAS, 20, 0.7, halfWidth);

    expect(rgb).toHaveLength((halfWidth * 2 + 1) * 3);
    expect(Math.max(...rgb)).toBe(255);

    const center = halfWidth * 3;
    expect(rgb[center]).toBeGreaterThan(0);
    expect(rgb[center + 1]).toBeGreaterThan(0);
    expect(rgb[center + 2]).toBeGreaterThan(0);

    for (let x = 0; x <= halfWidth; x += 15) {
      const left = (halfWidth - x) * 3;
      const right = (halfWidth + x) * 3;
      expect(rgb.slice(left, left + 3)).toEqual(rgb.slice(right, right + 3));
    }

    const visibleColors = new Set<string>();
    for (let i = 0; i < rgb.length; i += 3) {
      if (Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) < 16) continue;
      visibleColors.add(`${rgb[i]},${rgb[i + 1]},${rgb[i + 2]}`);
    }
    expect(visibleColors.size).toBeGreaterThan(3);
  });

  it('separates monochrome and white spectra in the step-6 cache', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');

    const createdCanvases: HTMLCanvasElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((
        tagName: string,
        options?: ElementCreationOptions
      ) => {
        const element = originalCreateElement(tagName, options);
        if (tagName === 'canvas') {
          createdCanvases.push(element as HTMLCanvasElement);
        }
        return element;
      }) as typeof document.createElement);

    const draw = (wavelengths?: number[]) =>
      drawStep6Pattern(
        ctx,
        800,
        400,
        532,
        20,
        getWavePalette(532, false),
        SCENE_PALETTE.light,
        false,
        0.7,
        1,
        false,
        wavelengths ? { wavelengths } : null
      );

    try {
      resetInterferenceCaches();
      draw();
      const offscreen = createdCanvases[0];
      const offscreenCtx = offscreen?.getContext('2d');
      if (!offscreenCtx) throw new Error('no offscreen 2d context');
      expect(offscreenCtx.fillStyle).toMatch(/^rgba\(/);

      const clearRect = vi.spyOn(offscreenCtx, 'clearRect');
      draw(WHITE_LAMBDAS);
      expect(clearRect).toHaveBeenCalledTimes(1);
      expect(offscreenCtx.fillStyle).toMatch(/^rgb\(/);

      draw(WHITE_LAMBDAS);
      expect(clearRect).toHaveBeenCalledTimes(1);

      draw([...WHITE_LAMBDAS].reverse());
      expect(clearRect).toHaveBeenCalledTimes(2);
    } finally {
      createElementSpy.mockRestore();
      resetInterferenceCaches();
    }
  });
});

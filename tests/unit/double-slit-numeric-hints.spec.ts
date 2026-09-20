import { describe, expect, it } from 'vitest';
import { drawSpectrumBar } from '../../src/scenes/double-slit/renderer/draw-spectrum';
import { drawStep6Pattern } from '../../src/scenes/double-slit/renderer/draw-interference';
import {
  getWavePalette,
  SCENE_PALETTE
} from '../../src/scenes/double-slit/renderer/palette';
import { createDoubleSlitScene } from '../../src/scenes/double-slit/scene.entry';

function recordFillText() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  const texts: string[] = [];
  const original = ctx.fillText.bind(ctx);
  ctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    texts.push(text);
    original(text, x, y, maxWidth);
  };
  return { ctx, texts };
}

describe('double-slit canvas numeric hints', () => {
  it('paints λ nm and Δx in normal mode and omits them when hidden', () => {
    const shown = recordFillText();
    drawSpectrumBar(shown.ctx, 532, false, 1, false);
    drawStep6Pattern(
      shown.ctx,
      800,
      400,
      532,
      20,
      getWavePalette(532, false),
      SCENE_PALETTE.light,
      false,
      0.7,
      1,
      false
    );
    expect(shown.texts.some((t) => /532\s*nm/.test(t))).toBe(true);
    expect(shown.texts.some((t) => /Δx/.test(t))).toBe(true);

    const hidden = recordFillText();
    drawSpectrumBar(hidden.ctx, 532, false, 1, true);
    drawStep6Pattern(
      hidden.ctx,
      800,
      400,
      532,
      20,
      getWavePalette(532, false),
      SCENE_PALETTE.light,
      false,
      0.7,
      1,
      true
    );
    expect(hidden.texts.some((t) => /nm/.test(t))).toBe(false);
    expect(hidden.texts.some((t) => /Δx/.test(t))).toBe(false);
    expect(hidden.texts.some((t) => t.includes('干涉条纹'))).toBe(true);
  });

  it('hides canvas λ/Δx through the live view and restores them on exit', () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'teaching-stage-canvas';
    canvas.width = 1000;
    canvas.height = 500;
    canvas.style.width = '1000px';
    canvas.style.height = '500px';
    const layout = document.createElement('div');
    layout.className = 'layout-master';
    layout.appendChild(canvas);
    document.body.appendChild(layout);

    const scene = createDoubleSlitScene({ canvas, theme: 'light' });
    scene.setParams({ step: 6, lightMode: 'mono', lambda: 532 });
    scene.resize();

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    const texts: string[] = [];
    const original = ctx.fillText.bind(ctx);
    ctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
      texts.push(text);
      original(text, x, y, maxWidth);
    };

    scene.render();
    expect(texts.some((t) => /532\s*nm/.test(t))).toBe(true);
    expect(texts.some((t) => /Δx/.test(t))).toBe(true);

    texts.length = 0;
    layout.classList.add('is-data-workspace');
    scene.getDataWorkspace().setActive(true);
    scene.render();
    expect(texts.some((t) => t.includes('干涉条纹'))).toBe(true);
    expect(texts.some((t) => /nm/.test(t))).toBe(false);
    expect(texts.some((t) => /Δx/.test(t))).toBe(false);
    expect(canvas.dataset.hideNumericHints).toBe('1');

    texts.length = 0;
    layout.classList.remove('is-data-workspace');
    scene.getDataWorkspace().setActive(false);
    scene.render();
    expect(texts.some((t) => /532\s*nm/.test(t))).toBe(true);
    expect(texts.some((t) => /Δx/.test(t))).toBe(true);
    expect(canvas.dataset.hideNumericHints).toBeUndefined();

    scene.dispose();
    layout.remove();
  });
});

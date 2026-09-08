import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTortoiseHareView } from '../../src/scenes/tortoise-hare/scene.view';
import { createRaceSim } from '../../src/scenes/tortoise-hare/scene.sim';

describe('tortoise-hare static layer cache', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.style.width = '400px';
    canvas.style.height = '300px';
    canvas.width = 400;
    canvas.height = 300;
  });

  it('blits cached static layer instead of redrawing axes on repeated renders', () => {
    const view = createTortoiseHareView({ canvas, theme: 'light' });
    view.resize();
    const sim = createRaceSim();
    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');
    const drawImageSpy = vi.spyOn(ctx, 'drawImage');

    view.render(sim.getState());
    const firstLabels = fillTextSpy.mock.calls.length;
    expect(firstLabels).toBeGreaterThan(0);
    expect(drawImageSpy).not.toHaveBeenCalled();

    fillTextSpy.mockClear();
    drawImageSpy.mockClear();
    sim.step(0.016);
    view.render(sim.getState());
    expect(drawImageSpy).toHaveBeenCalled();
    expect(fillTextSpy.mock.calls.length).toBeLessThan(firstLabels);
  });

  it('redraws static layer when preset changes', () => {
    const view = createTortoiseHareView({ canvas, theme: 'light' });
    view.resize();
    const sim = createRaceSim();
    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    view.render(sim.getState());
    fillTextSpy.mockClear();
    sim.setPreset('two-uniform');
    view.render(sim.getState());
    expect(fillTextSpy.mock.calls.length).toBeGreaterThan(4);
  });
});

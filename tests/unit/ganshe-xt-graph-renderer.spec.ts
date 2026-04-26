import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createXtGraphRenderer } from '../../src/scenes/ganshe/scene.view';
import type { ObserverData, WaveParams } from '../../src/scenes/ganshe/scene.sim';

describe('ganshe xt graph renderer', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    // Simulate a reasonable canvas size for the test environment
    canvas.style.width = '400px';
    canvas.style.height = '150px';
    canvas.width = 400;
    canvas.height = 150;
  });

  function makeParams(overrides: Partial<WaveParams> = {}): WaveParams {
    return {
      freq1: 4,
      freq2: 4,
      amp1: 5,
      amp2: 5,
      phaseDiff: 0,
      observerX: 15,
      observers: [],
      mode: 'head-on',
      showWave1: true,
      showWave2: true,
      showInterference: true,
      isPulseMode: false,
      playbackSpeed: 1,
      ...overrides
    };
  }

  function makeObserver(overrides: Partial<ObserverData> = {}): ObserverData {
    return {
      x: 15,
      history: [],
      ghostTrail: [],
      interference: {
        y1: 0,
        y2: 0,
        ySum: 0,
        phase1: 0,
        phase2: 0,
        dphaseDeg: 0,
        A_theory: 10,
        intensityPct: 100,
        I_current: 1,
        I_max: 1
      },
      ...overrides
    };
  }

  it('renders background fill', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light', title: '观察点1' });
    renderer.resize(); // ensure ctx is initialized

    const ctx = canvas.getContext('2d')!;
    const fillRectSpy = vi.spyOn(ctx, 'fillRect');

    renderer.render(makeObserver(), 0, makeParams());

    // Background fill should be called at least once
    expect(fillRectSpy).toHaveBeenCalled();
    const firstCall = fillRectSpy.mock.calls[0];
    expect(firstCall?.[0]).toBe(0);
    expect(firstCall?.[1]).toBe(0);
  });

  it('renders axis labels', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light', title: '观察点1' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderer.render(makeObserver(), 0, makeParams());

    const texts = fillTextSpy.mock.calls.map((c) => c[0]);
    expect(texts).toContain('观察点1');
    expect(texts).toContain('y-t 图');
    expect(texts).toContain('t / s');
    expect(texts).toContain('y / cm');
  });

  it('renders time tick labels', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderer.render(makeObserver(), 0, makeParams());

    const texts = fillTextSpy.mock.calls.map((c) => c[0]);
    expect(texts).toContain('-0');
    expect(texts).toContain('-10');
    expect(texts).toContain('-20');
    expect(texts).toContain('-30');
  });

  it('renders displacement axis ticks', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderer.render(makeObserver(), 0, makeParams());

    const texts = fillTextSpy.mock.calls.map((c) => c[0]);
    // With amp1=5, amp2=5, maxAmp=10, ticks are +10, +5, 0, -5, -10
    expect(texts).toContain('10');
    expect(texts).toContain('5');
    expect(texts).toContain('0');
  });

  it('renders history curve when data exists', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const strokeSpy = vi.spyOn(ctx, 'stroke');
    const lineToSpy = vi.spyOn(ctx, 'lineTo');

    const observer = makeObserver({
      history: [
        { t: 0, y: 0 },
        { t: 0.5, y: 5 },
        { t: 1.0, y: 0 }
      ]
    });

    renderer.render(observer, 1, makeParams());

    // Curve should trigger at least one lineTo and one stroke
    expect(lineToSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();
  });

  it('renders current point marker even when history is empty', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const arcSpy = vi.spyOn(ctx, 'arc');
    const fillSpy = vi.spyOn(ctx, 'fill');

    renderer.render(makeObserver(), 0, makeParams());

    // Two arcs: white outer + colored inner
    expect(arcSpy).toHaveBeenCalledTimes(2);
    expect(fillSpy).toHaveBeenCalledTimes(2);
  });

  it('switches theme and re-renders with different colors', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');

    renderer.render(makeObserver(), 0, makeParams());
    const lightBgCalls = fillStyleSpy.mock.calls.filter(
      (c) => c[0] === '#ffffff'
    );
    expect(lightBgCalls.length).toBeGreaterThan(0);

    renderer.setTheme('dark');
    fillStyleSpy.mockClear();

    renderer.render(makeObserver(), 0, makeParams());
    const darkBgCalls = fillStyleSpy.mock.calls.filter(
      (c) => c[0] === '#0f172a'
    );
    expect(darkBgCalls.length).toBeGreaterThan(0);
  });

  it('disposes without error', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();
    renderer.render(makeObserver(), 0, makeParams());

    expect(() => renderer.dispose()).not.toThrow();
  });
});

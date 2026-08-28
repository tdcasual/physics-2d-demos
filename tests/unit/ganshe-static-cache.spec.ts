import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createXtGraphRenderer } from '../../src/scenes/ganshe/scene.view';
import { createWaveInterferenceSim } from '../../src/scenes/ganshe/scene.sim';
import type {
  ObserverData,
  WaveParams
} from '../../src/scenes/ganshe/scene.sim';

describe('ganshe xt graph static layer cache', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
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

  it('blits cached static layer instead of redrawing on repeated renders', () => {
    const renderer = createXtGraphRenderer(canvas, {
      theme: 'light',
      title: '观察点1'
    });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');
    const drawImageSpy = vi.spyOn(ctx, 'drawImage');

    // First render: cache miss → static layer drawn directly, no blit
    renderer.render(makeObserver(), 0, makeParams());
    expect(fillTextSpy).toHaveBeenCalled();
    expect(drawImageSpy).not.toHaveBeenCalled();

    fillTextSpy.mockClear();
    drawImageSpy.mockClear();

    // Second render with same key: static layer blitted, not redrawn
    renderer.render(makeObserver(), 0.016, makeParams());
    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    expect(fillTextSpy).not.toHaveBeenCalled();
  });

  it('redraws static layer when maxAmp changes', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderer.render(makeObserver(), 0, makeParams());
    fillTextSpy.mockClear();

    // amp1 5→12 changes maxAmp (10→17), so y ticks/sy must be redrawn
    renderer.render(makeObserver(), 0.016, makeParams({ amp1: 12 }));
    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('redraws static layer on theme switch', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderer.render(makeObserver(), 0, makeParams());
    fillTextSpy.mockClear();

    renderer.setTheme('dark');
    renderer.render(makeObserver(), 0.016, makeParams());
    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('still draws dynamic curve on cached frames', () => {
    const renderer = createXtGraphRenderer(canvas, { theme: 'light' });
    renderer.resize();

    const ctx = canvas.getContext('2d')!;
    const strokeSpy = vi.spyOn(ctx, 'stroke');

    const observer = makeObserver({
      history: [
        { t: 0, y: 0 },
        { t: 0.5, y: 5 },
        { t: 1.0, y: 0 }
      ]
    });

    renderer.render(observer, 1, makeParams());
    strokeSpy.mockClear();

    // Cached frame: curve stroke must still happen
    renderer.render(observer, 1.016, makeParams());
    expect(strokeSpy).toHaveBeenCalled();
  });
});

describe('ganshe sim snapshot references', () => {
  it('returns the same history array reference across steps', () => {
    const sim = createWaveInterferenceSim();
    sim.step(0.016);
    const before = sim.getState().history;
    sim.step(0.016);
    const after = sim.getState().history;
    // 引用化快照：同一内部数组，消费方只读
    expect(after).toBe(before);
    expect(after.length).toBeGreaterThan(1);
  });

  it('returns the same observer history references across steps', () => {
    const sim = createWaveInterferenceSim({ observers: [10, 20] });
    sim.step(0.016);
    const before = sim.getState().allObservers[0].history;
    sim.step(0.016);
    const after = sim.getState().allObservers[0].history;
    expect(after).toBe(before);
  });

  it('cleared history stays the same reference (length reset)', () => {
    const sim = createWaveInterferenceSim();
    sim.step(0.016);
    const ref = sim.getState().history;
    sim.clearHistory();
    const after = sim.getState().history;
    expect(after).toBe(ref);
    expect(after.length).toBe(0);
  });
});

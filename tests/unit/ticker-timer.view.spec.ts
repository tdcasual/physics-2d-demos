import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tickerTimerControlsSchema } from '../../src/scenes/ticker-timer/controls-schema';
import { tickerTimerMeta } from '../../src/scenes/ticker-timer/scene.meta';
import {
  createTickerTimerSim,
  tickerTimerConstants
} from '../../src/scenes/ticker-timer/scene.sim';
import { createTickerTimerView } from '../../src/scenes/ticker-timer/scene.view';

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      }
    }) as DOMRect;
  canvas.dataset.responsiveScale = String(
    Math.max(0.3, Math.min(1.5, Math.min(width, height) / 400))
  );
  return canvas;
}

type FillTextFn = CanvasRenderingContext2D['fillText'];
type FillTextHost = { fillText: FillTextFn };

function captureLabels(canvas: HTMLCanvasElement, run: () => void): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is required');
  const host = (
    Object.prototype.hasOwnProperty.call(ctx, 'fillText')
      ? ctx
      : Object.getPrototypeOf(ctx)
  ) as FillTextHost;
  const original = host.fillText;
  const labels: string[] = [];
  host.fillText = function spy(
    this: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push(String(value));
    if (maxWidth === undefined) original.call(this, value, x, y);
    else original.call(this, value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    host.fillText = original;
  }
  return labels;
}

describe('ticker-timer view contract', () => {
  it('keeps the canvas free of framework panels and readouts', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/ticker-timer/scene.view.ts'),
      'utf8'
    );
    expect(source).not.toMatch(
      /drawPanel|drawTapeAndReadout|核心关系|实验状态|测得加速度/
    );
    expect(source).not.toMatch(/fillText\([^\n]*(?:m\/s|周期|状态|Δs)/);
    expect(tickerTimerConstants.fieldWidth).toBeLessThan(
      tickerTimerConstants.baseWidth
    );
  });

  it('draws only short apparatus labels', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createTickerTimerView({ canvas });
    const labels = captureLabels(canvas, () =>
      view.render(createTickerTimerSim({ autoRun: false }).getState())
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        'S',
        'N',
        '打点',
        '电源',
        '纸带',
        'cm',
        '0',
        '5',
        '10',
        '15',
        '20'
      ])
    );
    expect(labels.some((value) => value.includes('请先接通'))).toBe(false);
    expect(labels.some((value) => value.includes('实验状态'))).toBe(false);
    expect(labels.some((value) => value.includes('周期'))).toBe(false);
    view.dispose();
  });

  it('renders desktop, mobile, dark and presentation without overflow exceptions', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createTickerTimerView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createTickerTimerSim({ autoRun: false });
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        sim.powerOn();
        sim.releaseTape();
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps formulas and controls in the framework contract', () => {
    expect(tickerTimerMeta.testProfile?.hasGraph).toBe(false);
    expect(tickerTimerMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'timer-period',
        'dot-count',
        'instant-velocity',
        'measured-acceleration',
        'experiment-status'
      ])
    );
    const titles = tickerTimerControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('公式');
    expect(titles).toContain('实验步骤');
  });
});

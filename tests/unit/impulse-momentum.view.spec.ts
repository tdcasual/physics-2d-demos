import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createImpulseMomentumSim } from '../../src/scenes/impulse-momentum/scene.sim';
import { impulseMomentumConstants as C } from '../../src/scenes/impulse-momentum/scene.sim';
import { createImpulseMomentumView } from '../../src/scenes/impulse-momentum/scene.view';

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

type FillTextMark = { value: string; x: number; y: number };

function withFillTextMarks(
  canvas: HTMLCanvasElement,
  run: () => void
): FillTextMark[] {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture fillText');
  const original = ctx.fillText.bind(ctx);
  const marks: FillTextMark[] = [];
  ctx.fillText = function fillTextSpy(
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    marks.push({ value: String(value), x, y });
    if (maxWidth === undefined) original(value, x, y);
    else original(value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    ctx.fillText = original;
  }
  return marks;
}

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): string[] {
  return withFillTextMarks(canvas, run).map((mark) => mark.value);
}

describe('impulse-momentum view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('cardWidth' in C).toBe(false);
    expect('graphX' in C).toBe(false);
  });

  it('keeps F-t drawing on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/impulse-momentum/scene.view.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawApparatus');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/drawPanel|动量定理实时计算|有向面积 Iₓ/);
    expect(viewSrc).not.toMatch(/拖动参数或播放/);
  });

  it('paints the cart on the animation canvas and F-t axes in the graph slot', () => {
    const canvas = mockCanvas(800, 320);
    const graphCanvas = mockCanvas(640, 240);
    const view = createImpulseMomentumView({ canvas, theme: 'light' });
    const sim = createImpulseMomentumSim({
      forceModel: 'constant',
      autoRun: false
    });
    sim.setTime(2.15);
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels.some((text) => text.includes('m='))).toBe(true);
    expect(stageLabels).toEqual(expect.arrayContaining(['Fₓ', 'v']));
    expect(stageLabels.some((text) => text.includes('Fₓ / N'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('t / s'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('21.50'))).toBe(false);

    view.attachGraphCanvas(graphCanvas);
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(graphLabels).toEqual(expect.arrayContaining(['Fₓ / N', 't / s']));
    view.dispose();
  });

  it('omits the v arrow at rest and points v with the signed velocity', () => {
    const canvas = mockCanvas(800, 320);
    const view = createImpulseMomentumView({ canvas, theme: 'light' });
    const rest = createImpulseMomentumSim({
      initialVelocity: 0,
      autoRun: false
    });
    expect(rest.getState().time).toBe(0);
    expect(rest.getState().velocity).toBe(0);
    const restMarks = withFillTextMarks(canvas, () => {
      view.render(rest.getState());
    });
    expect(restMarks.map((mark) => mark.value)).not.toContain('v');

    const plus = createImpulseMomentumSim({
      initialVelocity: 2,
      autoRun: false
    });
    expect(plus.getState().velocity).toBeGreaterThan(0);
    const plusV = withFillTextMarks(canvas, () => {
      view.render(plus.getState());
    }).find((mark) => mark.value === 'v');
    expect(plusV).toBeDefined();

    const minus = createImpulseMomentumSim({
      initialVelocity: -2,
      autoRun: false
    });
    expect(minus.getState().velocity).toBeLessThan(0);
    const minusV = withFillTextMarks(canvas, () => {
      view.render(minus.getState());
    }).find((mark) => mark.value === 'v');
    expect(minusV).toBeDefined();
    if (!plusV || !minusV) {
      throw new Error('expected v labels for +v₀ and −v₀');
    }
    expect(plusV.x).toBeGreaterThan(minusV.x);
    view.dispose();
  });
});

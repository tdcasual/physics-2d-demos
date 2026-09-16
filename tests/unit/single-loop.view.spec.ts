import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { singleLoopControlsSchema } from '../../src/scenes/single-loop/controls-schema';
import { singleLoopMeta } from '../../src/scenes/single-loop/scene.meta';
import {
  createSingleLoopSim,
  singleLoopConstants as C
} from '../../src/scenes/single-loop/scene.sim';
import {
  apparatusXToPx,
  createSingleLoopView,
  graphXToPx,
  stageMetrics
} from '../../src/scenes/single-loop/scene.view';

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

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture fillText');
  const original = ctx.fillText.bind(ctx);
  const labels: string[] = [];
  ctx.fillText = function fillTextSpy(
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push(String(value));
    if (maxWidth === undefined) original(value, x, y);
    else original(value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    ctx.fillText = original;
  }
  return labels;
}

function withStrokeRects(
  canvas: HTMLCanvasElement,
  run: () => void
): Array<{ x: number; y: number; w: number; h: number }> {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture strokeRect');
  const original = ctx.strokeRect.bind(ctx);
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  ctx.strokeRect = function strokeRectSpy(
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    rects.push({ x, y, w, h });
    original(x, y, w, h);
  };
  try {
    run();
  } finally {
    ctx.strokeRect = original;
  }
  return rects;
}

describe('single-loop view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('cardWidth' in C).toBe(false);
    expect('graphY' in C).toBe(false);
    expect('readoutY' in C).toBe(false);
  });

  it('keeps v-x / i-x drawing on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/single-loop/scene.view.ts'),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/single-loop/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawApparatus');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/drawPanel|实时状态|模型关系|实验参数与图象/);
    expect(viewSrc).not.toMatch(/显示电流|i=/);
    expect(simSrc).not.toMatch(/panelWidth|fieldWidth|cardWidth/);
    expect(simSrc).not.toMatch(/showCurrent/);
  });

  it('paints the apparatus on the animation canvas and both graphs in the graph slot', () => {
    const canvas = mockCanvas(800, 320);
    const graphCanvas = mockCanvas(640, 240);
    const view = createSingleLoopView({ canvas, theme: 'light' });
    const sim = createSingleLoopSim({ autoRun: false });
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels).toEqual(
      expect.arrayContaining([
        '进入区',
        '匀速区 (Φ不变)',
        '穿出区',
        '有界匀强磁场 B (垂直纸面向里)',
        'L = 1.0 m',
        '磁场宽度 D = 4.0 m',
        'v',
        '×'
      ])
    );
    expect(stageLabels.some((text) => text.includes('v-x'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('i-x'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('v (m/s)'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('i='))).toBe(false);

    view.attachGraphCanvas(graphCanvas);
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(graphLabels).toEqual(
      expect.arrayContaining([
        '速度 - 位移图像 (v-x)',
        '感应电流 - 位移图像 (i-x)',
        'v (m/s)',
        'i (A)',
        'x (m)'
      ])
    );
    view.dispose();
  });

  it('maps the front edge onto the field and keeps the loop off the graphs', () => {
    const left = 40;
    const right = 760;
    expect(apparatusXToPx(0, left, right)).toBeGreaterThan(left);
    expect(apparatusXToPx(4, left, right)).toBeLessThan(right);
    expect(apparatusXToPx(0, left, right)).toBeCloseTo(
      left + ((0 - C.worldXMin) / (C.worldXMax - C.worldXMin)) * (right - left),
      10
    );
    expect(graphXToPx(0, left, right)).toBeCloseTo(left, 10);
    expect(graphXToPx(6, left, right)).toBeCloseTo(right, 10);
    expect(graphXToPx(0, left, right)).not.toBeCloseTo(
      apparatusXToPx(0, left, right),
      6
    );

    const canvas = mockCanvas(800, 320);
    const view = createSingleLoopView({ canvas, theme: 'light' });
    view.resize();
    const scale = Number.parseFloat(canvas.dataset.responsiveScale || '1');
    const sim = createSingleLoopSim({ autoRun: false });
    sim.setPosition(0);
    const atEnter = withStrokeRects(canvas, () => {
      view.render(sim.getState());
    });
    sim.setPosition(5);
    const atExit = withStrokeRects(canvas, () => {
      view.render(sim.getState());
    });
    const metrics = stageMetrics(800, 320, scale);
    const loopW = C.loopWidth * metrics.fit;
    const loopAt0 = atEnter.reduce((best, rect) =>
      Math.abs(rect.w - loopW) < Math.abs(best.w - loopW) ? rect : best
    );
    const loopAt5 = atExit.reduce((best, rect) =>
      Math.abs(rect.w - loopW) < Math.abs(best.w - loopW) ? rect : best
    );
    expect(loopAt5.x).toBeGreaterThan(loopAt0.x);
    const fieldLeft = apparatusXToPx(0, metrics.left, metrics.right);
    expect(loopAt0.x + loopAt0.w).toBeCloseTo(fieldLeft, 1);
    view.dispose();
  });

  it('keeps graph contract in the standard layout', () => {
    expect(singleLoopMeta.testProfile?.hasGraph).toBe(true);
    expect(singleLoopMeta.demoProfile?.readoutKeys).toEqual([
      'region',
      'position',
      'velocity',
      'current'
    ]);
    const sections = singleLoopControlsSchema.sections.map(
      (section) => section.title
    );
    expect(sections).toEqual(expect.arrayContaining(['参数', '关系']));
    expect(sections).not.toContain('播放');
    const keys = singleLoopControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('autoRun');
    expect(keys).not.toContain('showCurrent');
  });

  it('renders animation and graph canvases across themes and sizes', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(width, 236);
      const view = createSingleLoopView({
        canvas,
        graphCanvas,
        theme: 'light'
      });
      const sim = createSingleLoopSim({ autoRun: true });
      sim.step(0.4);
      expect(() => {
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });
});

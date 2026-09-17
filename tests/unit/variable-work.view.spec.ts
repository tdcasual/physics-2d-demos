import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createVariableWorkSim,
  endTime,
  forceAt,
  variableWorkConstants as C
} from '../../src/scenes/variable-work/scene.sim';

import {
  createVariableWorkView,
  formatAxisTick,
  FX_X_TICKS,
  stageField,
  stageVectorLayout
} from '../../src/scenes/variable-work/scene.view';

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  Object.defineProperty(canvas, 'clientWidth', { value: width });
  Object.defineProperty(canvas, 'clientHeight', { value: height });
  canvas.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      }
    }) as DOMRect;
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

describe('variable-work view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('graphY' in C).toBe(false);
    expect('panelX' in C).toBe(false);
  });

  it('keeps F-x and P-t on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/variable-work/scene.view.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawStage');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/核心物理思想|参数调节|实时物理量监测/);
    const schemaSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/variable-work/controls-schema.ts'),
      'utf8'
    );
    expect(schemaSrc).not.toContain('autoRun');
    expect(schemaSrc).toContain('W = ∫ F dx');
    expect(schemaSrc).toContain('舞台 F、v 为趋势示意');
  });

  it('paints only the cart and short marks on the stage', () => {
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(846, 200);
    const view = createVariableWorkView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createVariableWorkSim();
    sim.start();
    sim.step(0.8);
    view.resize();
    const stageLabels = withFillTextMarks(canvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(stageLabels).toEqual(expect.arrayContaining(['F', 'v', 'm']));
    expect(stageLabels.some((text) => text.includes('F-x'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('P-t'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('面积'))).toBe(false);
    expect(stageLabels.some((text) => text === 'N')).toBe(false);
    expect(stageLabels.some((text) => text === 'mg')).toBe(false);

    const graphLabels = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(graphLabels.some((text) => text.includes('F / N'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('x / m'))).toBe(true);
    expect(FX_X_TICKS).toEqual([2.5, 5, 7.5, 10]);
    expect(formatAxisTick(2.5)).toBe('2.5');
    expect(formatAxisTick(7.5)).toBe('7.5');
    expect(formatAxisTick(5)).toBe('5');
    expect(formatAxisTick(10)).toBe('10');
    const tickMarks = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    });
    const twoFive = tickMarks.filter((mark) => mark.value === '2.5');
    const sevenFive = tickMarks.filter((mark) => mark.value === '7.5');
    expect(twoFive.length).toBeGreaterThan(0);
    expect(sevenFive.length).toBeGreaterThan(0);
    expect(twoFive[0]!.x).toBeLessThan(sevenFive[0]!.x);
    expect(graphLabels.some((text) => text.includes('P / W'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('t / s'))).toBe(true);
    expect(graphLabels.some((text) => text === 'v-t')).toBe(false);
    expect(graphLabels.some((text) => text === 'W')).toBe(true);
    const zeros = graphLabels.filter((text) => text === '0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);

    sim.setParams({ microsteps: 6 });
    sim.step(0.6);
    const withN = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(withN.some((text) => text.includes('Wₙ'))).toBe(true);
    expect(withN.some((text) => text.includes('低估'))).toBe(true);
    expect(stageLabels.some((text) => text.includes('低估'))).toBe(false);
    view.dispose();
  });

  it('labels F-x ticks 2.5 and 7.5 on desktop and mobile graphs', () => {
    const sizes = [
      { w: 846, h: 167 },
      { w: 366, h: 430 }
    ];
    for (const size of sizes) {
      const canvas = mockCanvas(800, 420);
      const graphCanvas = mockCanvas(size.w, size.h);
      const view = createVariableWorkView({
        canvas,
        graphCanvas,
        theme: 'light'
      });
      const sim = createVariableWorkSim();
      view.resize();
      const marks = withFillTextMarks(graphCanvas, () => {
        view.render(sim.getState());
      });
      const values = marks.map((mark) => mark.value);
      expect(values).toEqual(expect.arrayContaining(['2.5', '5', '7.5', '10']));
      const twoFive = marks.find((mark) => mark.value === '2.5');
      const five = marks.find((mark) => mark.value === '5');
      const sevenFive = marks.find((mark) => mark.value === '7.5');
      expect(twoFive).toBeTruthy();
      expect(five).toBeTruthy();
      expect(sevenFive).toBeTruthy();
      expect(twoFive!.x).toBeLessThan(five!.x);
      expect(five!.x).toBeLessThan(sevenFive!.x);
      view.dispose();
    }
  });

  it('does not plot a power-mode force before x0', () => {
    const power = {
      mode: 'power' as const,
      mass: 3,
      k: 2,
      power: 8,
      microsteps: 0
    };
    expect(forceAt(power, 0)).toBe(0);
    expect(forceAt(power, C.x0 - 1e-3)).toBe(0);
    expect(forceAt(power, C.x0)).toBeCloseTo(8 / 1, 6);
  });

  it('hides the v arrow at rest and scales F/v with the state', () => {
    const sizes = [
      { w: 390, h: 294 },
      { w: 836, h: 400 }
    ];
    for (const size of sizes) {
      const canvas = mockCanvas(size.w, size.h);
      const view = createVariableWorkView({ canvas, theme: 'light' });
      const sim = createVariableWorkSim();
      view.resize();
      const rest = sim.getState();
      expect(rest.velocity).toBeCloseTo(0, 8);
      const restLayout = stageVectorLayout(rest, size.w, size.h, 1);
      expect(restLayout.v).toBeNull();
      expect(restLayout.f).not.toBeNull();
      expect(restLayout.f!.clampedMin).toBe(true);
      const restLabels = withFillTextMarks(canvas, () => {
        view.render(rest);
      }).map((mark) => mark.value);
      expect(restLabels).toContain('F');
      expect(restLabels).not.toContain('v');
      expect(restLabels.some((text) => text.includes('10 N'))).toBe(false);
      expect(restLabels.some((text) => text.includes('4 m/s'))).toBe(false);
      expect(restLabels.some((text) => /示意/.test(text))).toBe(false);

      sim.start();
      sim.step(1.0);
      const early = stageVectorLayout(sim.getState(), size.w, size.h, 1);
      sim.step(1.4);
      const moving = sim.getState();
      const movingLayout = stageVectorLayout(moving, size.w, size.h, 1);
      expect(movingLayout.v).not.toBeNull();
      expect(movingLayout.f).not.toBeNull();
      expect(early.v).not.toBeNull();
      expect(movingLayout.f!.length).toBeGreaterThan(restLayout.f!.length);
      expect(movingLayout.v!.length).toBeGreaterThan(early.v!.length);
      const field = stageField(size.w, size.h, 1);
      expect(movingLayout.f!.x1).toBeLessThanOrEqual(field.trackRight + 1e-6);
      expect(movingLayout.v!.x1).toBeLessThanOrEqual(field.trackRight + 1e-6);
      expect(movingLayout.f!.y0).not.toBeCloseTo(movingLayout.v!.y0, 0);
      const moveLabels = withFillTextMarks(canvas, () => {
        view.render(moving);
      });
      for (const mark of moveLabels) {
        expect(mark.x).toBeGreaterThanOrEqual(-2);
        expect(mark.x).toBeLessThanOrEqual(size.w + 2);
        expect(mark.y).toBeGreaterThanOrEqual(-2);
        expect(mark.y).toBeLessThanOrEqual(size.h + 2);
      }
      expect(moveLabels.some((mark) => mark.value === 'v')).toBe(true);

      sim.setParams({ k: 6, mass: 0.5 });
      sim.start();
      sim.step(endTime(sim.getParams()) + 1);
      const end = sim.getState();
      const endLayout = stageVectorLayout(end, size.w, size.h, 1);
      expect(endLayout.f).not.toBeNull();
      expect(endLayout.f!.clampedMax).toBe(true);
      expect(endLayout.f!.x1).toBeLessThanOrEqual(field.trackRight + 1e-6);
      view.dispose();
    }
  });
});

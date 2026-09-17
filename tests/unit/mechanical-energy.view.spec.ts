import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMechanicalEnergySim } from '../../src/scenes/mechanical-energy/scene.sim';
import { mechanicalEnergyConstants as C } from '../../src/scenes/mechanical-energy/scene.sim';
import {
  apparatusLayout,
  clippedStripDots,
  createMechanicalEnergyView,
  heightToStripX,
  plotChrome,
  stripDotCandidates,
  stripRangeCm,
  tapeDotY,
  visibleStripDots
} from '../../src/scenes/mechanical-energy/scene.view';

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

describe('mechanical-energy view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('graphX' in C).toBe(false);
    expect('tableCardY' in C).toBe(false);
  });

  it('keeps the v²/2-h plot on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/mechanical-energy/scene.view.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawApparatus');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/drawPanel|实验装置区|分析数据表|核心原理/);
    expect(viewSrc).not.toMatch(/释放重锤|实验结论|图像分析/);
    const schemaSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/mechanical-energy/controls-schema.ts'),
      'utf8'
    );
    expect(schemaSrc).toContain('T = 0.02 s；计数间隔 T₀ = nT');
    expect(schemaSrc).not.toContain('每隔一打取样');
  });

  it('paints only short apparatus marks on the stage', () => {
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(640, 240);
    const view = createMechanicalEnergyView({ canvas, theme: 'light' });
    const sim = createMechanicalEnergySim({ autoRun: true });
    sim.step(0.24);
    view.resize();
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels).toEqual(
      expect.arrayContaining(['m', 'O', 'A', 'E', '0', '20'])
    );
    expect(stageLabels.some((text) => text.includes('ΔE'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('v²/2'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('实验'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('计数点'))).toBe(false);
    expect(stageLabels.some((text) => /\d+\.\d+/.test(text))).toBe(false);

    view.attachGraphCanvas(graphCanvas);
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(graphLabels.some((text) => text.includes('v²/2'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('m²/s²'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('h / m'))).toBe(true);
    view.dispose();
  });

  it('drops the weight downward and widens tape gaps', () => {
    const sim = createMechanicalEnergySim({ autoRun: true });
    const start = apparatusLayout(800, 420, 1, sim.getState());
    sim.step(0.24);
    const end = apparatusLayout(800, 420, 1, sim.getState());
    expect(end.weightY).toBeGreaterThan(start.weightY);
    const ys = sim.getState().tapeDots.map((dot) => tapeDotY(dot.height, end));
    for (let i = 2; i < ys.length; i += 1) {
      expect(ys[i]! - ys[i - 1]!).toBeGreaterThan(ys[i - 1]! - ys[i - 2]!);
    }
  });

  it('keeps labels inside the field on mobile and desktop extrema', () => {
    const cases = [
      { w: 390, h: 294, g: 8, T0: 0.02, k: 0 },
      { w: 836, h: 400, g: 12, T0: 0.1, k: 0.25 }
    ];
    for (const item of cases) {
      const canvas = mockCanvas(item.w, item.h);
      const view = createMechanicalEnergyView({ canvas, theme: 'light' });
      const sim = createMechanicalEnergySim({
        environment: item.k > 0 ? 'resist' : 'ideal',
        resistance: item.k,
        gravity: item.g,
        pointPeriod: item.T0,
        autoRun: true
      });
      sim.step(1);
      view.resize();
      const marks = withFillTextMarks(canvas, () => {
        view.render(sim.getState());
      });
      for (const mark of marks) {
        expect(mark.x).toBeGreaterThanOrEqual(-2);
        expect(mark.x).toBeLessThanOrEqual(item.w + 2);
        expect(mark.y).toBeGreaterThanOrEqual(-2);
        expect(mark.y).toBeLessThanOrEqual(item.h + 2);
      }
      const layout = apparatusLayout(item.w, item.h, 1, sim.getState());
      expect(layout.weightY + layout.weightH).toBeLessThanOrEqual(item.h);
      expect(layout.tapeX).toBeGreaterThan(0);
      view.dispose();
    }
  });

  it('separates graph title and y-unit so they do not share a baseline', () => {
    const chrome = plotChrome(846, 177, 0.8);
    expect(chrome.yUnit.y).toBeGreaterThan(chrome.title.y + 8);
    expect(chrome.box.top).toBeGreaterThan(chrome.yUnit.y);
  });

  it('keeps a single origin 0.00 tick on a short desktop graph', () => {
    const graphCanvas = mockCanvas(846, 157);
    graphCanvas.dataset.responsiveScale = '0.37';
    const canvas = mockCanvas(800, 420);
    const view = createMechanicalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createMechanicalEnergySim({ autoRun: true });
    sim.step(0.24);
    view.resize();
    const marks = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    });
    const zeros = marks.filter((mark) => mark.value === '0.00');
    expect(zeros).toHaveLength(1);
    expect(zeros[0]!.x).toBeLessThan(846 * 0.2);
    expect(zeros[0]!.y).toBeGreaterThan(157 * 0.55);
    view.dispose();
  });

  it('places O/A–E on a 0–20 cm strip below the apparatus', () => {
    const sizes = [
      { w: 390, h: 294 },
      { w: 836, h: 400 }
    ];
    for (const size of sizes) {
      const canvas = mockCanvas(size.w, size.h);
      const view = createMechanicalEnergyView({ canvas, theme: 'light' });
      const sim = createMechanicalEnergySim({ autoRun: true });
      sim.step(1);
      view.resize();
      const state = sim.getState();
      const layout = apparatusLayout(size.w, size.h, 1, state);
      const strip = layout.strip;
      expect(strip.cmMax).toBe(20);
      expect(strip.tapeTop).toBeGreaterThan(layout.standBottom);
      expect(strip.rulerTop).toBeGreaterThan(strip.tapeTop + strip.tapeH - 1);
      expect(strip.rulerTop + strip.rulerH).toBeLessThanOrEqual(size.h);
      expect(layout.weightY + layout.weightH).toBeLessThan(strip.tapeTop);
      expect(strip.left).toBeGreaterThanOrEqual(0);
      expect(strip.right).toBeLessThanOrEqual(size.w);

      const x0 = heightToStripX(0, strip);
      const x20 = heightToStripX(0.2, strip);
      expect(x0).toBeCloseTo(strip.left, 6);
      expect(x20).toBeCloseTo(strip.right, 6);
      const pointE = state.points.find((point) => point.label === 'E');
      expect(pointE).toBeTruthy();
      expect(pointE!.height * 100).toBeCloseTo(18.8, 2);
      const xE = heightToStripX(pointE!.height, strip);
      expect(xE).toBeCloseTo(strip.left + (18.8 / 20) * strip.span, 1);
      expect(xE).toBeGreaterThan(x0);
      expect(xE).toBeLessThan(x20);

      const marks = withFillTextMarks(canvas, () => {
        view.render(state);
      });
      const needed = new Set([
        'O',
        'A',
        'B',
        'C',
        'D',
        'E',
        '0',
        '5',
        '10',
        '20'
      ]);
      const values = new Set(marks.map((mark) => mark.value));
      for (const label of needed) expect(values.has(label)).toBe(true);
      expect(values.has('…')).toBe(true);
      for (const mark of marks) {
        expect(mark.x).toBeGreaterThanOrEqual(-2);
        expect(mark.x).toBeLessThanOrEqual(size.w + 2);
        expect(mark.y).toBeGreaterThanOrEqual(-2);
        expect(mark.y).toBeLessThanOrEqual(size.h + 2);
        expect(mark.y).toBeGreaterThan(40);
      }
      view.dispose();
    }
  });

  it('crops F past 20 cm with a continuation mark, keeping A–E', () => {
    // v_E = (h_F − h_D)/(2T₀). F is the real next tick at t=0.24 s, not a counting point.
    // Cover tape stays 0–20 cm (E = 18.80 cm); h_F = ½×9.4×0.24² = 27.072 cm.
    const canvas = mockCanvas(836, 400);
    const view = createMechanicalEnergyView({ canvas, theme: 'light' });
    const idleSim = createMechanicalEnergySim({ autoRun: false });
    view.resize();
    const idleStrip = apparatusLayout(836, 400, 1, idleSim.getState()).strip;
    expect(clippedStripDots(idleSim.getState(), idleStrip)).toHaveLength(0);
    const idleMarks = withFillTextMarks(canvas, () => {
      view.render(idleSim.getState());
    });
    expect(idleMarks.some((mark) => mark.value === '…')).toBe(false);

    const sim = createMechanicalEnergySim({ autoRun: true });
    sim.step(1);
    const state = sim.getState();
    const strip = apparatusLayout(836, 400, 1, state).strip;
    expect(strip.cmMax).toBe(20);
    const beyond = clippedStripDots(state, strip);
    expect(beyond.length).toBeGreaterThan(0);
    const f = beyond[beyond.length - 1];
    expect(f).toBeTruthy();
    expect(f!.label).toBeNull();
    expect(f!.time).toBeCloseTo(0.24, 6);
    expect(f!.height * 100).toBeCloseTo(27.07, 1);
    expect(
      visibleStripDots(state, strip).some((dot) => dot.label === 'E')
    ).toBe(true);
    expect(
      visibleStripDots(state, strip).some((dot) =>
        beyond.some((clip) => Math.abs(clip.height - dot.height) < 1e-9)
      )
    ).toBe(false);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context required');
    const originalArc = ctx.arc.bind(ctx);
    const originalFillText = ctx.fillText.bind(ctx);
    const arcs: Array<{ x: number; y: number }> = [];
    const texts: FillTextMark[] = [];
    ctx.arc = function arcSpy(
      x: number,
      y: number,
      radius: number,
      start: number,
      end: number,
      ccw?: boolean
    ) {
      arcs.push({ x, y });
      originalArc(x, y, radius, start, end, ccw);
    };
    ctx.fillText = function fillTextSpy(
      value: string,
      x: number,
      y: number,
      maxWidth?: number
    ) {
      texts.push({ value: String(value), x, y });
      if (maxWidth === undefined) originalFillText(value, x, y);
      else originalFillText(value, x, y, maxWidth);
    };
    try {
      view.render(state);
    } finally {
      ctx.arc = originalArc;
      ctx.fillText = originalFillText;
    }
    const bandTop = strip.tapeTop - 2;
    const bandBottom = strip.tapeTop + strip.tapeH + 2;
    const stripArcs = arcs.filter(
      (arc) => arc.y >= bandTop && arc.y <= bandBottom
    );
    expect(
      stripArcs.filter((arc) => Math.abs(arc.x - strip.right) < 1.5)
    ).toHaveLength(0);
    expect(texts.some((mark) => mark.value === '…')).toBe(true);
    expect(texts.some((mark) => mark.value === 'E')).toBe(true);
    expect(texts.some((mark) => mark.value === 'F')).toBe(false);
    view.dispose();
  });

  it('expands the strip so extreme A–E stay visible and unstacked', () => {
    // g=12, k=0.25 → a=9; T₀=0.1 s. A 4.5, B 18, C 40.5, D 72, E 112.5 cm.
    const sizes = [
      { w: 390, h: 294 },
      { w: 836, h: 400 }
    ];
    for (const size of sizes) {
      const canvas = mockCanvas(size.w, size.h);
      const view = createMechanicalEnergyView({ canvas, theme: 'light' });
      const sim = createMechanicalEnergySim({
        environment: 'resist',
        resistance: 0.25,
        gravity: 12,
        pointPeriod: 0.1,
        autoRun: true
      });
      sim.step(1);
      view.resize();
      const state = sim.getState();
      const layout = apparatusLayout(size.w, size.h, 1, state);
      const strip = layout.strip;
      expect(stripRangeCm(state)).toBeGreaterThan(20);
      expect(strip.cmMax).toBeGreaterThan(20);
      expect(strip.right).toBeLessThanOrEqual(size.w);
      const candidates = stripDotCandidates(state);
      expect(candidates.some((dot) => dot.label === 'E')).toBe(true);
      const visible = visibleStripDots(state, strip);
      for (const label of ['O', 'A', 'B', 'C', 'D', 'E']) {
        expect(visible.some((dot) => dot.label === label)).toBe(true);
      }
      const pointE = visible.find((dot) => dot.label === 'E');
      expect(pointE).toBeTruthy();
      expect(pointE!.height * 100).toBeCloseTo(112.5, 1);
      const xE = heightToStripX(pointE!.height, strip);
      expect(xE).toBeCloseTo(
        strip.left + ((pointE!.height * 100) / strip.cmMax) * strip.span,
        6
      );
      expect(xE).toBeLessThan(strip.right - 1);

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d context required');
      const originalArc = ctx.arc.bind(ctx);
      const originalFillText = ctx.fillText.bind(ctx);
      const arcs: Array<{ x: number; y: number }> = [];
      const texts: FillTextMark[] = [];
      ctx.arc = function arcSpy(
        x: number,
        y: number,
        radius: number,
        start: number,
        end: number,
        ccw?: boolean
      ) {
        arcs.push({ x, y });
        originalArc(x, y, radius, start, end, ccw);
      };
      ctx.fillText = function fillTextSpy(
        value: string,
        x: number,
        y: number,
        maxWidth?: number
      ) {
        texts.push({ value: String(value), x, y });
        if (maxWidth === undefined) originalFillText(value, x, y);
        else originalFillText(value, x, y, maxWidth);
      };
      try {
        view.render(state);
      } finally {
        ctx.arc = originalArc;
        ctx.fillText = originalFillText;
      }
      const bandTop = strip.tapeTop - 2;
      const bandBottom = strip.tapeTop + strip.tapeH + 2;
      const stripArcs = arcs
        .filter((arc) => arc.y >= bandTop && arc.y <= bandBottom)
        .sort((left, right) => left.x - right.x);
      const labeled = visible
        .filter((dot) => dot.label)
        .sort((left, right) => left.height - right.height);
      for (const dot of labeled) {
        const expected = heightToStripX(dot.height, strip);
        expect(stripArcs.some((arc) => Math.abs(arc.x - expected) < 0.8)).toBe(
          true
        );
      }
      for (let i = 1; i < stripArcs.length; i += 1) {
        expect(stripArcs[i]!.x - stripArcs[i - 1]!.x).toBeGreaterThan(0.5);
      }
      expect(
        stripArcs.filter((arc) => Math.abs(arc.x - strip.right) < 1.5)
      ).toHaveLength(0);
      const stripLetters = texts.filter(
        (mark) =>
          ['A', 'B', 'C', 'D', 'E', 'O'].includes(mark.value) &&
          mark.x >= strip.left - 8 &&
          mark.x <= strip.right + 8
      );
      for (const label of ['A', 'B', 'C', 'D', 'E']) {
        expect(
          stripLetters.some((mark) => mark.value === label),
          `${size.w}x${size.h} missing strip letter ${label}`
        ).toBe(true);
      }
      const stillClipped = clippedStripDots(state, strip);
      if (stillClipped.length > 0) {
        expect(texts.some((mark) => mark.value === '…')).toBe(true);
        expect(texts.some((mark) => mark.value === 'F')).toBe(false);
      }
      for (const mark of texts) {
        expect(mark.x).toBeGreaterThanOrEqual(-2);
        expect(mark.x).toBeLessThanOrEqual(size.w + 2);
        expect(mark.y).toBeGreaterThanOrEqual(-2);
        expect(mark.y).toBeLessThanOrEqual(size.h + 2);
      }
      view.dispose();
    }
  });
});

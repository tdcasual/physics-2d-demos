import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createInternalEnergySim,
  internalEnergyConstants as C
} from '../../src/scenes/internal-energy/scene.sim';
import {
  createInternalEnergyView,
  formatAxisTick,
  gasApparatusLayout,
  plotChrome,
  stageField,
  temperatureAxis
} from '../../src/scenes/internal-energy/scene.view';
import { internalEnergyControlsSchema } from '../../src/scenes/internal-energy/controls-schema';

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

describe('internal-energy view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('panelX' in C).toBe(false);
    expect('formulaCardY' in C).toBe(false);
  });

  it('keeps T-t on the graph canvas and formulas in the folded hint', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/internal-energy/scene.view.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawStage');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/热力学第一定律公式|教研考点|微观分子运动视窗/);
    const schemaSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/internal-energy/controls-schema.ts'),
      'utf8'
    );
    expect(schemaSrc).not.toContain('autoRun');
    expect(schemaSrc).toContain('理想气体可逆绝热近似；快速过程 Q≈0');
    expect(schemaSrc).toContain('ΔU = W + Q');
    expect(schemaSrc).toContain('180°C 仅为封面示意');
    expect(schemaSrc).not.toContain('自由膨胀');
    const keys = internalEnergyControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('reset');
    expect(keys).not.toContain('quickCompress');
  });

  it('paints apparatus marks on the stage and T-t on the graph', () => {
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(846, 200);
    const view = createInternalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createInternalEnergySim();
    sim.start();
    sim.step(2.4);
    view.resize();
    const stageLabels = withFillTextMarks(canvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(stageLabels).toEqual(expect.arrayContaining(['硝化棉', 'mL', '20']));
    expect(stageLabels.some((text) => text === '-20')).toBe(false);
    expect(stageLabels.some((text) => text.includes('ΔU'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('W + Q'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('kPa'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('平均动能'))).toBe(false);

    const graphLabels = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(graphLabels.some((text) => text.includes('T / °C'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('t / s'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('180 示意'))).toBe(true);
    expect(graphLabels.some((text) => text === 'T-t')).toBe(true);
    view.dispose();
  });

  it('keeps title and y-unit on separate baselines on a short-wide graph', () => {
    const chrome = plotChrome(846, 177, 0.37);
    expect(chrome.yUnit.y).toBeGreaterThan(chrome.title.y + 8);
  });

  it('reserves the right overlay on a wide desktop stage', () => {
    const field = stageField(1280, 420, 1);
    expect(field.overlayReserve).toBeGreaterThan(300);
    expect(field.right).toBeLessThan(1280 * 0.75);
    const mobile = stageField(390, 294, 0.7);
    expect(mobile.overlayReserve).toBe(0);
    const presentation = stageField(1280, 403, 1.02, true);
    expect(presentation.overlayReserve).toBeGreaterThan(300);
    expect(presentation.hasFloatingTransport).toBe(true);
    expect(presentation.bottomClear).toBeCloseTo(presentation.pad);
    expect(presentation.bottomClear).toBeLessThan(403 * 0.2);
    expect(presentation.top).toBeGreaterThan(87);
    expect(presentation.right).toBeLessThan(1280 * 0.75);
    expect(presentation.bottom).toBeGreaterThan(403 * 0.8);
  });

  it('keeps the presentation cylinder in the left band, not under a bottom dock', () => {
    const width = 1280;
    const height = 403;
    const layout = gasApparatusLayout(
      width,
      height,
      1.02,
      80,
      'compress',
      true
    );
    expect(layout.field.overlayReserve).toBeGreaterThan(300);
    expect(layout.field.bottomClear).toBeCloseTo(layout.field.pad);
    expect(layout.gasRight).toBeLessThan(layout.field.right);
    expect(layout.gasBottom).toBeLessThan(layout.field.bottom);
    expect(layout.field.bottom).toBeGreaterThan(height * 0.8);
    expect(layout.gasBottom).toBeGreaterThan(layout.field.top + 120);
    expect(layout.rodTop).toBeGreaterThan(87);
    const overlayLeft = width - layout.field.overlayReserve;
    expect(overlayLeft).toBeGreaterThan(layout.gasRight);
    expect(layout.gasRight).toBeLessThan(overlayLeft);
    const expand = gasApparatusLayout(width, height, 1.02, 160, 'expand', true);
    expect(expand.gasBottom).toBeLessThan(expand.field.bottom);
    expect(expand.gasRight).toBeLessThan(expand.field.right);
    expect(expand.gasRight).toBeLessThan(width - expand.field.overlayReserve);
    const heatField = stageField(width, height, 1.02, true);
    expect(heatField.right).toBeLessThan(overlayLeft + heatField.pad);
  });

  it('keeps the cylinder and rod below the desktop transport band', () => {
    const desktop = gasApparatusLayout(862, 403, 1, 80, 'compress');
    expect(desktop.field.hasFloatingTransport).toBe(true);
    expect(desktop.field.transportClear).toBeGreaterThanOrEqual(48 * 2);
    expect(desktop.field.transportClear).toBeGreaterThanOrEqual(403 * 0.24);
    expect(desktop.rodTop).toBe(desktop.field.top);
    expect(desktop.rodTop).toBeGreaterThan(87);
    expect(desktop.tubeY).toBeGreaterThan(desktop.rodTop);
    expect(desktop.pistonY).toBeGreaterThan(desktop.tubeY);
    expect(desktop.gasBottom).toBeLessThan(403);
    const expanded = gasApparatusLayout(862, 403, 1, 80, 'expand');
    expect(expanded.field.transportClear).toBe(desktop.field.transportClear);
    expect(expanded.rodTop).toBeGreaterThan(87);
    expect(expanded.gasBottom).toBeLessThan(403);
    const mobile = gasApparatusLayout(390, 294, 0.7, 80, 'compress');
    expect(mobile.field.overlayReserve).toBe(0);
    expect(mobile.field.hasFloatingTransport).toBe(false);
    expect(mobile.rodTop).toBeLessThan(40);
    expect(mobile.tubeY).toBeGreaterThan(mobile.rodTop);
  });

  it('draws heat-flow Q on the stage and dual T-t on the graph', () => {
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(846, 200);
    const view = createInternalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createInternalEnergySim({
      mode: 'heat',
      tHot: 80,
      tCold: 20
    });
    sim.start();
    sim.step(1);
    view.resize();
    const stageLabels = withFillTextMarks(canvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(stageLabels).toEqual(expect.arrayContaining(['左块', '右块', 'Q']));
    expect(stageLabels.some((text) => text === '热' || text === '冷')).toBe(
      false
    );
    expect(stageLabels.some((text) => text.includes('Teq'))).toBe(false);
    const graphLabels = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(graphLabels.some((text) => text === 'Teq')).toBe(true);
    expect(graphLabels.some((text) => text === '左')).toBe(true);
    expect(graphLabels.some((text) => text === '右')).toBe(true);
    expect(graphLabels.some((text) => text === '热' || text === '冷')).toBe(
      false
    );
    expect(formatAxisTick(180)).toBe('180');
    expect(formatAxisTick(2.5)).toBe('2.5');
    view.dispose();
  });

  it('labels expand T-t from a negative floor, not a fake 0', () => {
    const sim = createInternalEnergySim({ mode: 'expand', ratio: 2 });
    sim.start();
    sim.step(C.gasDuration);
    const axis = temperatureAxis(sim.getState());
    expect(axis.min).toBeLessThan(0);
    expect(axis.max).toBeGreaterThan(0);
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(846, 177);
    const view = createInternalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    view.resize();
    const marks = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(marks).toEqual(expect.arrayContaining([String(axis.min), '露点']));
    view.dispose();
  });

  it('keeps left/right identity when tHot < tCold', () => {
    const canvas = mockCanvas(800, 420);
    const graphCanvas = mockCanvas(846, 200);
    const view = createInternalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createInternalEnergySim({
      mode: 'heat',
      tHot: 20,
      tCold: 80
    });
    view.resize();
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context is required');
    const fills: string[] = [];
    const originalFill = ctx.fill.bind(ctx);
    ctx.fill = function fillSpy() {
      fills.push(String(ctx.fillStyle));
      return originalFill();
    };
    const stageLabels = withFillTextMarks(canvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    ctx.fill = originalFill;
    expect(stageLabels).toEqual(expect.arrayContaining(['左块', '右块', 'Q']));
    expect(stageLabels.some((text) => /热|冷|高温|低温/.test(text))).toBe(
      false
    );
    const rgbFills = fills.filter((value) => value.startsWith('rgb('));
    expect(rgbFills.length).toBeGreaterThanOrEqual(2);
    const parseRgb = (value: string) => {
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) throw new Error(`expected rgb fill, got ${value}`);
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3])
      };
    };
    const left = parseRgb(rgbFills[0]);
    const right = parseRgb(rgbFills[1]);
    expect(left.r).toBeLessThan(right.r);
    expect(left.b).toBeGreaterThan(right.b);

    const graphLabels = withFillTextMarks(graphCanvas, () => {
      view.render(sim.getState());
    }).map((mark) => mark.value);
    expect(graphLabels).toEqual(expect.arrayContaining(['左', '右', 'Teq']));
    expect(graphLabels.some((text) => text === '热' || text === '冷')).toBe(
      false
    );
    view.dispose();
  });

  it('applies presentation contentScale and fontScale to layout and type', () => {
    const canvas = mockCanvas(1280, 403);
    const graphCanvas = mockCanvas(846, 177);
    const view = createInternalEnergyView({
      canvas,
      graphCanvas,
      theme: 'light'
    });
    const sim = createInternalEnergySim({ mode: 'compress', ratio: 3 });
    view.resize();
    view.render(sim.getState());
    const normalVisual = Number(canvas.dataset.visualScale);
    const normalType = Number(canvas.dataset.typeScale);
    expect(canvas.dataset.contentScale).toBe('1');
    expect(canvas.dataset.fontScale).toBe('1');

    const fontPx = (font: string): number => {
      const match = font.match(/(\d+(?:\.\d+)?)px/);
      return match ? Number(match[1]) : 0;
    };
    const captureFonts = (target: HTMLCanvasElement): number[] => {
      const ctx = target.getContext('2d');
      if (!ctx) throw new Error('2d canvas context is required');
      const sizes: number[] = [];
      const original = ctx.fillText.bind(ctx);
      ctx.fillText = function fillTextSpy(
        value: string,
        x: number,
        y: number,
        maxWidth?: number
      ) {
        sizes.push(fontPx(ctx.font));
        if (maxWidth === undefined) original(value, x, y);
        else original(value, x, y, maxWidth);
      };
      view.render(sim.getState());
      ctx.fillText = original;
      return sizes;
    };

    const normalStageFonts = captureFonts(canvas);
    const normalGraphFonts = captureFonts(graphCanvas);

    view.setMode('presentation', { contentScale: 1.2, fontScale: 1.15 });
    const presentationStageFonts = captureFonts(canvas);
    const presentationGraphFonts = captureFonts(graphCanvas);
    const presLayout = gasApparatusLayout(
      1280,
      403,
      Number(canvas.dataset.visualScale),
      80,
      'compress',
      true
    );

    expect(Number(canvas.dataset.contentScale)).toBeCloseTo(1.2);
    expect(Number(canvas.dataset.fontScale)).toBeCloseTo(1.15);
    expect(Number(canvas.dataset.visualScale)).toBeGreaterThan(normalVisual);
    expect(Number(canvas.dataset.typeScale)).toBeGreaterThan(normalType);
    expect(Number(canvas.dataset.visualScale)).toBeCloseTo(normalVisual * 1.2);
    expect(presLayout.rodTop).toBeGreaterThan(87);
    expect(presLayout.tubeY).toBeGreaterThan(presLayout.rodTop);
    expect(presLayout.gasBottom).toBeLessThan(presLayout.field.bottom);
    expect(presLayout.field.overlayReserve).toBeGreaterThan(300);
    expect(presLayout.field.bottomClear).toBeCloseTo(presLayout.field.pad);
    expect(presLayout.gasRight).toBeLessThan(presLayout.field.right);
    expect(presLayout.gasRight).toBeLessThan(
      1280 - presLayout.field.overlayReserve
    );
    expect(Number(canvas.dataset.gasBottom)).toBeLessThan(
      Number(canvas.dataset.fieldBottom)
    );
    expect(Number(canvas.dataset.overlayReserve)).toBeGreaterThan(300);
    expect(Number(canvas.dataset.fieldBottom)).toBeGreaterThan(403 * 0.8);
    expect(Number(canvas.dataset.fieldRight)).toBeLessThan(1280 * 0.75);
    expect(Number(canvas.dataset.gasRight)).toBeLessThan(
      Number(canvas.dataset.fieldRight)
    );
    expect(Math.max(...presentationStageFonts)).toBeGreaterThan(
      Math.max(...normalStageFonts)
    );
    expect(Math.max(...presentationGraphFonts)).toBeGreaterThan(
      Math.max(...normalGraphFonts)
    );
    view.dispose();
  });
});

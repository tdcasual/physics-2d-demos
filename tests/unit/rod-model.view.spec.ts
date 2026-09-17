import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rodModelControlsSchema } from '../../src/scenes/rod-model/controls-schema';
import { rodModelMeta } from '../../src/scenes/rod-model/scene.meta';
import {
  createRodModelSim,
  rodModelConstants as C,
  timeToRail
} from '../../src/scenes/rod-model/scene.sim';
import {
  createRodModelView,
  forceArrowGeom,
  plotBox,
  plotChrome,
  plotTimeMax,
  rodXToPx,
  stageMetrics,
  velocityArrowGeom,
  velocityAxisMax
} from '../../src/scenes/rod-model/scene.view';

type DrawnText = { value: string; x: number; y: number };

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
): DrawnText[] {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture fillText');
  const original = ctx.fillText.bind(ctx);
  const labels: DrawnText[] = [];
  ctx.fillText = function fillTextSpy(
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push({ value: String(value), x, y });
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

function labelValues(labels: DrawnText[]): string[] {
  return labels.map((item) => item.value);
}

function findLabel(labels: DrawnText[], value: string): DrawnText | undefined {
  return labels.find((item) => item.value === value);
}

describe('rod-model view contract', () => {
  it('has no in-canvas side panel or graph-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('cardWidth' in C).toBe(false);
    expect('graphX' in C).toBe(false);
    expect('readoutY' in C).toBe(false);
    expect('formulaY' in C).toBe(false);
  });

  it('keeps v-t drawing on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/rod-model/scene.view.ts'),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/rod-model/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawApparatus');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(
      /drawPanel|实时物理量看板|模型关系|实验参数与图象/
    );
    expect(viewSrc).not.toMatch(/物理情景演示区|高考核心考点/);
    expect(simSrc).not.toMatch(/panelWidth|fieldWidth|cardWidth/);
  });

  it('paints the apparatus on the animation canvas and v-t in the graph slot', () => {
    const canvas = mockCanvas(800, 320);
    const graphCanvas = mockCanvas(640, 240);
    const view = createRodModelView({ canvas, theme: 'light' });
    const sim = createRodModelSim({ autoRun: false });
    const stageLabels = labelValues(
      withFillTextCapture(canvas, () => {
        view.render(sim.getState());
      })
    );
    expect(stageLabels).toEqual(
      expect.arrayContaining(['×', 'B ⊗', '导体棒', 'R', 'F'])
    );
    expect(stageLabels.some((text) => text.includes('v–t'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('t / s'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('vₘ'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('看板'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('m/s²'))).toBe(false);

    view.attachGraphCanvas(graphCanvas);
    const graphLabels = labelValues(
      withFillTextCapture(graphCanvas, () => {
        view.render(sim.getState());
      })
    );
    expect(graphLabels.some((text) => text.includes('v–t'))).toBe(true);
    expect(graphLabels).toEqual(
      expect.arrayContaining(['v / (m·s⁻¹)', 't / s'])
    );
    expect(graphLabels.some((text) => text.includes('电阻棒'))).toBe(true);
    expect(graphLabels.some((text) => text.includes('电容棒'))).toBe(true);
    view.dispose();
  });

  it('omits the v arrow at rest and keeps F安 off the circuit at t=0', () => {
    const canvas = mockCanvas(800, 320);
    const view = createRodModelView({ canvas, theme: 'light' });
    const rest = createRodModelSim({ model: 'resistor', autoRun: false });
    const restLabels = labelValues(
      withFillTextCapture(canvas, () => {
        view.render(rest.getState());
      })
    );
    expect(restLabels).not.toContain('v');
    expect(restLabels).not.toContain('F安');
    expect(restLabels).toContain('F');

    rest.setParams({ autoRun: true });
    rest.step(0.6);
    const moving = labelValues(
      withFillTextCapture(canvas, () => {
        view.render(rest.getState());
      })
    );
    expect(moving).toEqual(expect.arrayContaining(['v', 'F安', 'F']));
    view.dispose();
  });

  it('keeps graph contract in the standard layout', () => {
    expect(rodModelMeta.testProfile?.hasGraph).toBe(true);
    expect(rodModelMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'model',
        'velocity',
        'acceleration',
        'magneticForce',
        'current',
        'terminalVelocity',
        'equivalentMass'
      ])
    );
    const sections = rodModelControlsSchema.sections.map(
      (section) => section.title
    );
    expect(sections).toEqual(expect.arrayContaining(['模型', '参数', '关系']));
    expect(sections).not.toContain('播放');
    const keys = rodModelControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('autoRun');
  });

  it('renders animation and graph canvases across themes and sizes', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(width, 236);
      const view = createRodModelView({
        canvas,
        graphCanvas,
        theme: 'light'
      });
      const sim = createRodModelSim({ autoRun: true });
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

  it('keeps legal capacitor rail speed on-scale without flattening', () => {
    // B=0.2, L=0.5, F=6, m=0.2, C=0.1 → m*=0.201, a=6/0.201
    // t_rail=√0.402≈0.6340 s, v=√(72/0.201)≈18.926 m/s
    const sim = createRodModelSim({
      model: 'capacitor',
      fieldStrength: 0.2,
      railGap: 0.5,
      externalForce: 6,
      mass: 0.2,
      resistance: 4,
      capacitance: 0.1,
      autoRun: true
    });
    sim.step(8);
    const state = sim.getState();
    expect(state.velocity).toBeCloseTo(18.926, 3);
    expect(state.time).toBeCloseTo(0.634, 3);
    expect(velocityAxisMax(state.params)).toBeGreaterThan(state.velocity);
    expect(plotTimeMax(state.params)).toBeGreaterThanOrEqual(
      timeToRail(state.params)
    );

    const graphCanvas = mockCanvas(640, 240);
    const canvas = mockCanvas(800, 320);
    const view = createRodModelView({ canvas, graphCanvas, theme: 'light' });
    const scale = Number.parseFloat(graphCanvas.dataset.responsiveScale || '1');
    const box = plotBox(640, 240, scale);
    const tMax = plotTimeMax(state.params);
    const vMax = velocityAxisMax(state.params);
    const ctx = graphCanvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context is required');
    const arcs: Array<{ x: number; y: number }> = [];
    const originalArc = ctx.arc.bind(ctx);
    ctx.arc = function arcSpy(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean
    ) {
      arcs.push({ x, y });
      originalArc(x, y, radius, startAngle, endAngle, counterclockwise);
    };
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(state);
    });
    ctx.arc = originalArc;
    const numeric = graphLabels
      .map((item) => Number(item.value))
      .filter((value) => Number.isFinite(value));
    expect(Math.max(...numeric)).toBeGreaterThan(10);
    const cursor = arcs[arcs.length - 1];
    expect(cursor).toBeDefined();
    const expectedX = box.left + (state.time / tMax) * (box.right - box.left);
    const expectedY =
      box.bottom - (state.velocity / vMax) * (box.bottom - box.top);
    expect(cursor.x).toBeCloseTo(expectedX, 0);
    expect(cursor.y).toBeCloseTo(expectedY, 0);
    expect(cursor.y).toBeGreaterThan(box.top + 2);
    view.dispose();
  });

  it('shows F安 below the rails on a 390px capacitor rest state', () => {
    for (const [width, height] of [
      [390, 220],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createRodModelView({ canvas, theme: 'light' });
      view.resize();
      const sim = createRodModelSim({
        model: 'capacitor',
        autoRun: false
      });
      const state = sim.getState();
      expect(state.magneticForce).toBeCloseTo(1, 10);
      expect(state.position).toBe(0);
      const labels = withFillTextCapture(canvas, () => {
        view.render(state);
      });
      const values = labelValues(labels);
      expect(values).toContain('F安');
      expect(values).toContain('F');
      expect(values).not.toContain('v');
      const fan = findLabel(labels, 'F安');
      expect(fan).toBeDefined();
      const scale = Number.parseFloat(canvas.dataset.responsiveScale || '1');
      const m = stageMetrics(width, height, scale);
      expect(fan!.x).toBeGreaterThan(4);
      expect(fan!.x).toBeLessThan(width - 4);
      expect(fan!.y).toBeGreaterThan(m.railBottom);
      expect(fan!.y).toBeLessThan(height - 2);
      expect(Math.abs(fan!.y - (m.railTop + m.railBottom) / 2)).toBeGreaterThan(
        10 * scale
      );
      view.dispose();
    }
  });

  it('keeps F and +v pointing right at the rail end by shifting left of the rod', () => {
    const extrema = {
      model: 'capacitor' as const,
      fieldStrength: 0.2,
      railGap: 0.5,
      externalForce: 6,
      mass: 0.2,
      resistance: 4,
      capacitance: 0.1,
      autoRun: true
    };
    for (const [width, height] of [
      [390, 220],
      [800, 320],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createRodModelView({ canvas, theme: 'light' });
      view.resize();
      const sim = createRodModelSim(extrema);
      sim.step(8);
      const state = sim.getState();
      expect(state.position).toBeCloseTo(C.railLength, 5);
      expect(state.velocity).toBeGreaterThan(1);

      const scale = Number.parseFloat(canvas.dataset.responsiveScale || '1');
      const m = stageMetrics(width, height, scale);
      const rodX = rodXToPx(state.position, m);
      const force = forceArrowGeom(
        state.position,
        state.params.externalForce,
        width,
        height,
        scale
      );
      expect(force.x2).toBeGreaterThan(force.x1);
      expect(force.x2).toBeLessThan(rodX);
      expect(force.x1).toBeGreaterThanOrEqual(m.left - 1);

      const vel = velocityArrowGeom(
        state.position,
        state.velocity,
        width,
        height,
        scale
      );
      expect(vel.x2).toBeGreaterThan(vel.x1);
      expect(vel.x2).toBeLessThanOrEqual(rodX);
      expect(vel.x1).toBeGreaterThanOrEqual(m.left - 1);

      const labels = withFillTextCapture(canvas, () => {
        view.render(state);
      });
      const f = findLabel(labels, 'F');
      const v = findLabel(labels, 'v');
      const rodLabel = findLabel(labels, '导体棒');
      expect(f).toBeDefined();
      expect(v).toBeDefined();
      expect(rodLabel).toBeDefined();
      expect(f!.x).toBeLessThan(rodX);
      expect(v!.x).toBeLessThan(rodX);
      expect(rodLabel!.x).toBeLessThan(rodX);
      expect(rodLabel!.x).toBeGreaterThan(4);
      view.dispose();
    }
  });

  it('draws rest-state F to the right of the rod, still pointing right', () => {
    const canvas = mockCanvas(800, 320);
    const view = createRodModelView({ canvas, theme: 'light' });
    view.resize();
    const sim = createRodModelSim({ model: 'resistor', autoRun: false });
    const state = sim.getState();
    const scale = Number.parseFloat(canvas.dataset.responsiveScale || '1');
    const m = stageMetrics(800, 320, scale);
    const rodX = rodXToPx(state.position, m);
    const force = forceArrowGeom(
      state.position,
      state.params.externalForce,
      800,
      320,
      scale
    );
    expect(force.x2).toBeGreaterThan(force.x1);
    expect(force.x1).toBeGreaterThan(rodX);
    const labels = withFillTextCapture(canvas, () => {
      view.render(state);
    });
    const f = findLabel(labels, 'F');
    expect(f).toBeDefined();
    expect(f!.x).toBeGreaterThan(rodX);
    view.dispose();
  });

  it('keeps the field label off the top-right readout overlay', () => {
    const canvas = mockCanvas(846, 390);
    const view = createRodModelView({ canvas, theme: 'light' });
    view.resize();
    const sim = createRodModelSim({ autoRun: false });
    const labels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    const field = findLabel(labels, 'B ⊗');
    expect(field).toBeDefined();
    const scale = Number.parseFloat(canvas.dataset.responsiveScale || '1');
    const m = stageMetrics(846, 390, scale);
    expect(field!.x).toBeGreaterThan(
      m.fieldLeft + (m.fieldRight - m.fieldLeft) * 0.35
    );
    expect(field!.x).toBeLessThan(
      m.fieldRight - (m.fieldRight - m.fieldLeft) * 0.35
    );
    expect(field!.x).toBeLessThan(846 * 0.72);
    view.dispose();
  });

  it('separates v-t title and y-unit on short-wide and tall-narrow graphs', () => {
    const sizes = [
      [846, 177],
      [390, 360],
      [640, 240]
    ] as const;
    for (const [width, height] of sizes) {
      const canvas = mockCanvas(800, 320);
      const graphCanvas = mockCanvas(width, height);
      const view = createRodModelView({
        canvas,
        graphCanvas,
        theme: 'light'
      });
      view.resize();
      const sim = createRodModelSim({ autoRun: false });
      const labels = withFillTextCapture(graphCanvas, () => {
        view.render(sim.getState());
      });
      const title = labels.find((item) => item.value.includes('v–t'));
      const unit = findLabel(labels, 'v / (m·s⁻¹)');
      expect(title).toBeDefined();
      expect(unit).toBeDefined();
      const scale = Number.parseFloat(
        graphCanvas.dataset.responsiveScale || '1'
      );
      const chrome = plotChrome(width, height, scale);
      expect(title!.x).toBeCloseTo(chrome.title.x, 0);
      expect(title!.y).toBeCloseTo(chrome.title.y, 0);
      expect(unit!.x).toBeCloseTo(chrome.yUnit.x, 0);
      expect(unit!.y).toBeCloseTo(chrome.yUnit.y, 0);
      expect(unit!.y).toBeGreaterThan(title!.y + 8);
      expect(unit!.y).toBeLessThan(chrome.box.top - 2);
      expect(title!.y).toBeGreaterThan(4);
      const titleWidth = 7 * 13;
      const overlapX =
        title!.x + titleWidth > unit!.x && unit!.x + 80 > title!.x;
      if (overlapX) {
        expect(Math.abs(unit!.y - title!.y)).toBeGreaterThan(12);
      }
      expect(plotBox(width, height, scale).top).toBe(chrome.box.top);
      view.dispose();
    }
  });
});

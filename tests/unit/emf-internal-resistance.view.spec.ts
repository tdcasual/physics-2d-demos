import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { emfInternalConstants as C } from '../../src/scenes/emf-internal-resistance/scene.sim';
import { createEmfInternalSim } from '../../src/scenes/emf-internal-resistance/scene.sim';
import {
  createEmfInternalView,
  formatUiTick,
  niceUiAxis,
  uiGraphAxes,
  uiGraphLineEnd,
  uiGraphPlotBox
} from '../../src/scenes/emf-internal-resistance/scene.view';

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

function resolveFillTextHost(ctx: CanvasRenderingContext2D): FillTextHost {
  if (typeof ctx.fillText !== 'function') {
    throw new Error('fillText is not available on canvas context');
  }
  if (Object.prototype.hasOwnProperty.call(ctx, 'fillText')) return ctx;
  const ctorProto = (ctx.constructor as { prototype?: Partial<FillTextHost> })
    .prototype;
  if (ctorProto && typeof ctorProto.fillText === 'function') {
    return ctorProto as FillTextHost;
  }
  const proto = Object.getPrototypeOf(ctx) as Partial<FillTextHost> | null;
  if (proto && typeof proto.fillText === 'function') {
    return proto as FillTextHost;
  }
  return ctx;
}

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture fillText');
  const host = resolveFillTextHost(ctx);
  const original = host.fillText;
  const labels: string[] = [];
  host.fillText = function fillTextSpy(
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

describe('emf-internal-resistance view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(900);
    expect(C.baseHeight).toBe(380);
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('cardWidth' in C).toBe(false);
  });

  it('has no drawPanel, formula-card, or readout-card paths in source', () => {
    const viewSrc = readFileSync(
      resolve(
        process.cwd(),
        'src/scenes/emf-internal-resistance/scene.view.ts'
      ),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/emf-internal-resistance/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).not.toMatch(/drawPanel|drawReadout/);
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).not.toMatch(/实时读数|测量数据|拟合结果|U = E/);
    expect(simSrc).not.toMatch(/panelWidth|fieldWidth|cardWidth/);
  });

  it('keeps U-I titles on the graph canvas, not the animation canvas', () => {
    const canvas = mockCanvas(900, 380);
    const graphCanvas = mockCanvas(640, 240);
    const view = createEmfInternalView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const sim = createEmfInternalSim({ autoRun: false, switchClosed: true });
    sim.setParams({ rheostatResistance: 4 });
    sim.recordPoint();
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels).toEqual(
      expect.arrayContaining(['E, r', 'S', 'A', 'V', 'R', 'P'])
    );
    expect(stageLabels.some((text) => text.includes('U-I'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('端电压'))).toBe(false);
    expect(graphLabels).toEqual(
      expect.arrayContaining([
        'U-I',
        'I / A',
        'U / V',
        '0',
        '0.5',
        '1.0',
        '1.5',
        '2.0',
        '2.5',
        '3.0'
      ])
    );
    view.dispose();
  });

  it('still draws the circuit when no graph canvas is attached', () => {
    const canvas = mockCanvas(390, 280);
    const view = createEmfInternalView({ canvas, theme: 'dark' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createEmfInternalSim({ autoRun: false }).getState());
    });
    expect(labels).toEqual(expect.arrayContaining(['E, r', 'S', 'A', 'V']));
    view.dispose();
  });

  it('branches the voltmeter from the cell-side switch contact', () => {
    const viewSrc = readFileSync(
      resolve(
        process.cwd(),
        'src/scenes/emf-internal-resistance/scene.view.ts'
      ),
      'utf8'
    );
    expect(viewSrc).toMatch(/C\.switchX - 16,\s*C\.voltmeterY/);
    expect(viewSrc).not.toMatch(/C\.switchX \+ 18,\s*C\.voltmeterY/);
    expect(viewSrc).toMatch(/if \(!state\.params\.switchClosed\) return;/);
  });

  it('keeps the voltmeter inside the loop, above the return rail', () => {
    expect(C.wireBottom).toBeGreaterThan(C.voltmeterY + C.meterRadius);
    expect(C.voltmeterY).toBeGreaterThan(C.sourceY + C.meterRadius);
  });

  it('ends U-I lines at the physical intercept, not the padded x-limit', () => {
    // E=3 V, r=1 Ω → U=0 at I=E/r=3 A. Axis padding 3×1.15=3.45 A must not
    // become the intercept by clamping U to 0 at the x-limit.
    const currentMax = Math.max(C.graphCurrentBaseMax, (3 / 1) * 1.15);
    expect(currentMax).toBeCloseTo(3.45, 10);
    expect(uiGraphLineEnd(3, 1, currentMax)).toEqual({
      current: 3,
      voltage: 0
    });
    // Fit with intercept inside the window: E=2.7 V, r=0.8 Ω → I=3.375 A.
    expect(uiGraphLineEnd(2.7, 0.8, currentMax).current).toBeCloseTo(3.375, 10);
    expect(uiGraphLineEnd(2.7, 0.8, currentMax).voltage).toBe(0);
    // Fit intercept beyond the window: E=2.7 V, r=0.5 Ω → I=5.4 A > 3.45 A,
    // so the segment ends at I=3.45 A with U=2.7−1.725=0.975 V.
    const beyond = uiGraphLineEnd(2.7, 0.5, currentMax);
    expect(beyond.current).toBeCloseTo(3.45, 10);
    expect(beyond.voltage).toBeCloseTo(0.975, 10);
  });

  it('draws the ideal E=3 V, r=1 Ω line to I=3 A on the graph canvas', () => {
    const canvas = mockCanvas(900, 380);
    const graphCanvas = mockCanvas(640, 240);
    const view = createEmfInternalView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const sim = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      switchClosed: true,
      autoRun: false
    });
    view.render(sim.getState());
    const ctx = graphCanvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context is required');
    const width = 640;
    const height = 240;
    const { left, right, bottom } = uiGraphPlotBox(width, height);
    const axes = uiGraphAxes(sim.getState());
    const currentMax = axes.currentMax;
    expect(currentMax).toBe(3);
    const end = uiGraphLineEnd(3, 1, currentMax);
    expect(end).toEqual({ current: 3, voltage: 0 });
    const x = left + (end.current / currentMax) * (right - left);
    expect(x).toBeCloseTo(right, 10);
    const lineTos = (
      ctx.lineTo as unknown as { mock: { calls: [number, number][] } }
    ).mock.calls;
    expect(
      lineTos.some(
        ([px, py]) => Math.abs(px - right) < 0.6 && Math.abs(py - bottom) < 0.6
      )
    ).toBe(true);

    sim.setParams({ systematicError: true });
    [2, 4, 7, 10].forEach((rheostatResistance) => {
      sim.setParams({ rheostatResistance });
      sim.recordPoint();
    });
    sim.fitRecords();
    const fit = sim.getState().fit;
    expect(fit).not.toBeNull();
    if (!fit) return;
    const fitEnd = uiGraphLineEnd(fit.emf, fit.internalResistance, currentMax);
    expect(fitEnd.voltage).toBe(0);
    expect(fitEnd.current).toBeCloseTo(fit.emf / fit.internalResistance, 10);
    expect(fitEnd.current).toBeCloseTo(3, 10);
    vi.mocked(ctx.lineTo).mockClear();
    view.render(sim.getState());
    const fitX = left + (fitEnd.current / currentMax) * (right - left);
    const fitLineTos = vi.mocked(ctx.lineTo).mock.calls;
    expect(
      fitLineTos.some(
        ([px, py]) =>
          Math.abs(Number(px) - fitX) < 0.6 &&
          Math.abs(Number(py) - bottom) < 0.6
      )
    ).toBe(true);
    view.dispose();
  });

  it('builds 1-2-5 tick scales that cover every E/r option', () => {
    const mantissa = (step: number): number => {
      const mag = 10 ** Math.floor(Math.log10(step) + 1e-12);
      return Math.round(step / mag);
    };
    const voltages = [1.5, 3, 6];
    const resistances = [0.5, 1, 2];
    voltages.forEach((sourceVoltage) => {
      resistances.forEach((internalResistance) => {
        const axes = uiGraphAxes({ sourceVoltage, internalResistance });
        expect([1, 2, 5]).toContain(mantissa(axes.currentStep));
        expect([1, 2, 5]).toContain(mantissa(axes.voltageStep));
        expect(axes.currentMax).toBeGreaterThanOrEqual(
          sourceVoltage / internalResistance - 1e-9
        );
        expect(axes.voltageMax).toBeGreaterThanOrEqual(sourceVoltage - 1e-9);
        expect(axes.currentTicks[0]).toBe(0);
        expect(axes.voltageTicks[0]).toBe(0);
        expect(axes.currentTicks.at(-1)).toBeCloseTo(axes.currentMax, 10);
        expect(axes.voltageTicks.at(-1)).toBeCloseTo(axes.voltageMax, 10);
        expect(axes.currentMax % axes.currentStep).toBeCloseTo(0, 10);
        expect(axes.voltageMax % axes.voltageStep).toBeCloseTo(0, 10);
        axes.currentTicks.forEach((tick, index) => {
          expect(tick).toBeCloseTo(index * axes.currentStep, 10);
        });
        axes.voltageTicks.forEach((tick, index) => {
          expect(tick).toBeCloseTo(index * axes.voltageStep, 10);
        });
      });
    });
  });

  it('uses the reference 0–3.0 / 0.5 grid for the default cell', () => {
    const axes = uiGraphAxes({ sourceVoltage: 1.5, internalResistance: 0.5 });
    expect(axes.currentMax).toBe(3);
    expect(axes.voltageMax).toBe(3);
    expect(axes.currentStep).toBe(0.5);
    expect(axes.voltageStep).toBe(0.5);
    expect(axes.currentTicks).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(axes.voltageTicks).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(
      axes.voltageTicks.map((v) => formatUiTick(v, axes.voltageStep))
    ).toEqual(['0', '0.5', '1.0', '1.5', '2.0', '2.5', '3.0']);
  });

  it('nice-ceils awkward ranges onto a labeled 1-2-5 max', () => {
    expect(niceUiAxis(3.45, 6)).toEqual({
      max: 3.5,
      step: 0.5,
      ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
    });
    expect(niceUiAxis(13.8, 6)).toEqual({
      max: 14,
      step: 2,
      ticks: [0, 2, 4, 6, 8, 10, 12, 14]
    });
    const large = uiGraphAxes({ sourceVoltage: 6, internalResistance: 0.5 });
    expect(large.currentMax).toBe(12);
    expect(large.currentStep).toBe(2);
    expect(large.voltageMax).toBe(6);
    expect(large.voltageStep).toBe(1);
    expect(large.currentTicks.at(-1)).toBe(12);
    expect(large.voltageTicks).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

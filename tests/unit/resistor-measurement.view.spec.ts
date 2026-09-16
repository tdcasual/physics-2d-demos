import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resistorControlsSchema } from '../../src/scenes/resistor-measurement/controls-schema';
import { resistorMeta } from '../../src/scenes/resistor-measurement/scene.meta';
import { createResistorSim } from '../../src/scenes/resistor-measurement/scene.sim';
import { createResistorView } from '../../src/scenes/resistor-measurement/scene.view';

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

function captureLabels(canvas: HTMLCanvasElement, run: () => void): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is required');
  const host = resolveFillTextHost(ctx);
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

describe('resistor-measurement view contract', () => {
  it('does not paint panel, graph or readout copy in the view source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/resistor-measurement/scene.view.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/drawPanel|drawComparison|误差方向|接法结论/);
    expect(source).not.toMatch(/测量电阻|系统误差|R测|U测|I测/);
    expect(source).toMatch(/responsiveScale/);
    expect(resistorMeta.testProfile?.hasGraph).toBe(false);
  });

  it('keeps canvas labels short and puts formulas in collapsed controls', () => {
    const canvas = mockCanvas(800, 600);
    const view = createResistorView({ canvas, theme: 'light' });
    const labels = captureLabels(canvas, () => {
      view.render(createResistorSim({ autoRun: false }).getState());
    });
    const joined = labels.join('|');
    expect(joined).toMatch(/电压表/);
    expect(joined).toMatch(/电流表/);
    expect(joined).toMatch(/待测电阻/);
    expect(joined).toMatch(/滑动变阻器/);
    expect(joined).toMatch(/直流电源/);
    expect(joined).not.toMatch(/测量电阻|系统误差|R测 =|外接：|内接：|分压：/);
    const formula = resistorControlsSchema.sections.find(
      (s) => s.title === '结论'
    );
    expect(formula?.collapsed).toBe(true);
    view.setTheme('dark');
    view.setMode('presentation');
    view.resize();
    view.dispose();
  });
});

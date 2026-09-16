import { describe, expect, it } from 'vitest';
import { uvtControlsSchema } from '../../src/scenes/uniformly-varied-motion/controls-schema';
import { uvtMeta } from '../../src/scenes/uniformly-varied-motion/scene.meta';
import {
  createUvtSim,
  uvtConstants
} from '../../src/scenes/uniformly-varied-motion/scene.sim';
import { createUvtView } from '../../src/scenes/uniformly-varied-motion/scene.view';

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
  if (Object.prototype.hasOwnProperty.call(ctx, 'fillText')) {
    return ctx;
  }
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
  if (!ctx) {
    throw new Error('2d canvas context is required to capture fillText');
  }
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

describe('uniformly varied motion view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(uvtConstants.baseWidth).toBe(800);
    expect(uvtConstants.baseHeight).toBe(640);
    expect('fieldWidth' in uvtConstants).toBe(false);
    expect('panelWidth' in uvtConstants).toBe(false);
    expect('formulaTop' in uvtConstants).toBe(false);
    expect('formulaHeight' in uvtConstants).toBe(false);
    expect('readoutTop' in uvtConstants).toBe(false);
    expect('readoutHeight' in uvtConstants).toBe(false);
    expect(uvtConstants.graphRight).toBeLessThan(uvtConstants.baseWidth);
    expect(uvtConstants.graphBottom).toBeLessThan(uvtConstants.baseHeight);
  });

  it('draws v/a/t/x labels and omits panel, formula, and monitor copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createUvtView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createUvtSim({ v0: 10, acceleration: -3 }).getState());
    });
    expect(labels).toEqual(
      expect.arrayContaining([
        'v',
        'a',
        'x (m)',
        'v (m/s)',
        't (s)',
        '0',
        '10',
        '40',
        '-40'
      ])
    );
    expect(labels.some((text) => text.includes('匀变速直线运动'))).toBe(false);
    expect(labels.some((text) => text.includes('真实物理空间'))).toBe(false);
    expect(labels.some((text) => text.includes('初速度'))).toBe(false);
    expect(labels.some((text) => text.includes('累计位移'))).toBe(false);
    expect(labels.some((text) => text.includes('瞬时静止'))).toBe(false);
    expect(labels.some((text) => text.includes('v = v₀'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    view.dispose();
  });

  it('renders at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createUvtView({ canvas });
      expect(() => {
        const sim = createUvtSim({ v0: 10, acceleration: -3 });
        view.render(sim.getState());
        sim.step(4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph off the layout card and formulas off the control pane', () => {
    expect(uvtMeta.testProfile?.hasGraph).toBe(false);
    expect(uvtMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining(['time', 'velocity', 'displacement', 'status'])
    );
    const titles = uvtControlsSchema.sections.map((section) => section.title);
    expect(titles).toContain('运动参数');
    expect(titles).toContain('显示');
    expect(titles).not.toContain('结论');
    const keys = uvtControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining(['v0', 'acceleration', 'autoRun', 'showArea'])
    );
  });
});

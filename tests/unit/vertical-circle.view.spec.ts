import { describe, expect, it } from 'vitest';
import { verticalCircleControlsSchema } from '../../src/scenes/vertical-circle/controls-schema';
import { verticalCircleMeta } from '../../src/scenes/vertical-circle/scene.meta';
import {
  createVerticalCircleSim,
  verticalCircleConstants
} from '../../src/scenes/vertical-circle/scene.sim';
import { createVerticalCircleView } from '../../src/scenes/vertical-circle/scene.view';

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

describe('vertical-circle view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(verticalCircleConstants.baseWidth).toBe(720);
    expect(verticalCircleConstants.baseHeight).toBe(660);
    expect('fieldWidth' in verticalCircleConstants).toBe(false);
    expect('panelWidth' in verticalCircleConstants).toBe(false);
    expect('formulaTop' in verticalCircleConstants).toBe(false);
    expect('formulaHeight' in verticalCircleConstants).toBe(false);
    expect('statusPillY' in verticalCircleConstants).toBe(false);
    expect('valuesTop' in verticalCircleConstants).toBe(false);
    expect(verticalCircleConstants.centerX).toBeLessThan(
      verticalCircleConstants.baseWidth
    );
    expect(
      verticalCircleConstants.centerY + verticalCircleConstants.orbitRadius
    ).toBeLessThan(verticalCircleConstants.baseHeight);
    expect(
      verticalCircleConstants.centerY -
        verticalCircleConstants.orbitRadius -
        verticalCircleConstants.ballRadius
    ).toBeGreaterThan(verticalCircleConstants.transportClearY);
  });

  it('draws orbit/vector labels and omits panel, formula, and status copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createVerticalCircleView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createVerticalCircleSim({
          vBottom: 23.5,
          theta: -51,
          showVectors: true,
          showPath: true
        }).getState()
      );
    });
    expect(labels).toEqual(
      expect.arrayContaining([
        '0°（最高点）',
        '±180°（最低点）',
        '−90°',
        '90°',
        'G',
        'G_r',
        'G_t',
        'T',
        'Fₙ',
        'v',
        'θ',
        'R'
      ])
    );
    expect(labels.some((text) => text.includes('竖直面圆周'))).toBe(false);
    expect(labels.some((text) => text.includes('竖直圆周临界'))).toBe(false);
    expect(labels.some((text) => text.includes('直接拖拽'))).toBe(false);
    expect(labels.some((text) => text.includes('离心趋势'))).toBe(false);
    expect(labels.some((text) => text.includes('拉力生效'))).toBe(false);
    expect(labels.some((text) => text.includes('绳子松弛'))).toBe(false);
    expect(labels.some((text) => text.includes('v²'))).toBe(false);
    expect(labels.some((text) => text.includes('m/s'))).toBe(false);
    expect(labels.some((text) => text.includes('系统物理常量'))).toBe(false);
    expect(labels.some((text) => text.includes('当前瞬时'))).toBe(false);
    view.dispose();
  });

  it('renders light and dark themes at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createVerticalCircleView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createVerticalCircleSim({ vBottom: 23.5, theta: -51 });
        view.render(sim.getState());
        sim.step(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        sim.setParams({
          model: 'rod',
          vBottom: 12,
          theta: 0,
          showVectors: true
        });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph off the layout card and formulas off the canvas', () => {
    expect(verticalCircleMeta.testProfile?.hasGraph).toBe(false);
    expect(verticalCircleMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'model',
        'vBottom',
        'vTop',
        'speed',
        'constraint',
        'status'
      ])
    );
    const titles = verticalCircleControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('模型');
    expect(titles).toContain('参数');
    expect(titles).toContain('显示');
    expect(titles).not.toContain('结论');
    const keys = verticalCircleControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'model',
        'vBottom',
        'theta',
        'autoRun',
        'showVectors',
        'showPath'
      ])
    );
  });
});

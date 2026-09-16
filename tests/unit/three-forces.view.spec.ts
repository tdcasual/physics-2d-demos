import { describe, expect, it } from 'vitest';
import { threeForcesControlsSchema } from '../../src/scenes/three-forces/controls-schema';
import { threeForcesMeta } from '../../src/scenes/three-forces/scene.meta';
import {
  createThreeForcesSim,
  threeForcesConstants
} from '../../src/scenes/three-forces/scene.sim';
import { createThreeForcesView } from '../../src/scenes/three-forces/scene.view';

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

describe('three-forces view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(threeForcesConstants.baseWidth).toBe(720);
    expect(threeForcesConstants.baseHeight).toBe(660);
    expect('fieldWidth' in threeForcesConstants).toBe(false);
    expect('panelWidth' in threeForcesConstants).toBe(false);
    expect('formulaTop' in threeForcesConstants).toBe(false);
    expect('formulaHeight' in threeForcesConstants).toBe(false);
    expect('statusTop' in threeForcesConstants).toBe(false);
    expect('valuesTop' in threeForcesConstants).toBe(false);
    expect(threeForcesConstants.planeRightX).toBeLessThan(
      threeForcesConstants.baseWidth
    );
    expect(threeForcesConstants.planeBaseY).toBeLessThan(
      threeForcesConstants.baseHeight - threeForcesConstants.transportClearY
    );
  });

  it('draws apparatus labels and omits panel, formula, and status copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createThreeForcesView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createThreeForcesSim({
          tab: 'gravity',
          showComponents: true,
          autoRun: false
        }).getState()
      );
    });
    expect(labels).toEqual(
      expect.arrayContaining(['G', 'FN', 'G₁', 'G₂', '30°'])
    );
    expect(labels.some((text) => text.includes('三大性质力'))).toBe(false);
    expect(labels.some((text) => text.includes('实时受力'))).toBe(false);
    expect(labels.some((text) => text.includes('G = mg'))).toBe(false);
    expect(labels.some((text) => text.includes('下滑分力'))).toBe(false);
    expect(labels.some((text) => text.includes('最大静摩擦'))).toBe(false);
    expect(labels.some((text) => text.includes('物理大纲'))).toBe(false);
    expect(labels.some((text) => text.includes('牛顿'))).toBe(false);
    expect(labels.some((text) => text.includes('m/s'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    view.dispose();
  });

  it('draws spring symbols without numeric readouts', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createThreeForcesView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createThreeForcesSim({
          tab: 'spring',
          springX: 0.2,
          showComponents: true,
          autoRun: false
        }).getState()
      );
    });
    expect(labels).toEqual(expect.arrayContaining(['F弹', 'x']));
    expect(labels.some((text) => text.includes('F弹 = kx'))).toBe(false);
    expect(labels.some((text) => text.includes('F弹 = −kx'))).toBe(false);
    expect(labels.some((text) => text.includes('|F弹|'))).toBe(false);
    expect(labels.some((text) => text.includes('N/m'))).toBe(false);
    expect(labels.some((text) => /x = /.test(text))).toBe(false);
    view.dispose();
  });

  it('renders light and dark themes at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createThreeForcesView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createThreeForcesSim({ tab: 'gravity' });
        view.render(sim.getState());
        sim.step(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        sim.setParams({ tab: 'friction', mu: 0.2, showComponents: false });
        view.render(sim.getState());
        sim.setParams({ tab: 'spring', springX: -0.15 });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph off the layout card and formulas off the canvas', () => {
    expect(threeForcesMeta.testProfile?.hasGraph).toBe(false);
    expect(threeForcesMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'tab',
        'gravity',
        'g1',
        'g2',
        'normal',
        'friction',
        'status'
      ])
    );
    const titles = threeForcesControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('性质力');
    expect(titles).toContain('参数');
    expect(titles).toContain('显示');
    expect(titles).toContain('要点');
    expect(titles).not.toContain('结论');
    const keys = threeForcesControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'tab',
        'mass',
        'inclineAngle',
        'mu',
        'springK',
        'springX',
        'autoRun',
        'showComponents'
      ])
    );
    const hint = threeForcesControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining([
        'G = mg',
        'G₁ = G sinθ',
        'G₂ = G cosθ',
        'f ≤ μN',
        'F弹 = −kx，|F弹| = kx'
      ])
    );
  });
});

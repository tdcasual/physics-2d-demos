import { describe, expect, it } from 'vitest';
import { singleSlitControlsSchema } from '../../src/scenes/single-slit/controls-schema';
import { singleSlitMeta } from '../../src/scenes/single-slit/scene.meta';
import {
  createSingleSlitSim,
  singleSlitConstants as C,
  stageTransform
} from '../../src/scenes/single-slit/scene.sim';
import { createSingleSlitView } from '../../src/scenes/single-slit/scene.view';

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

describe('single-slit view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(960);
    expect(C.baseHeight).toBe(660);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaCardY' in C).toBe(false);
    expect('readoutCardY' in C).toBe(false);
    expect(C.graphRight).toBeLessThan(C.baseWidth);
    expect(C.graphBottom).toBeLessThan(C.baseHeight);
  });

  it('draws apparatus labels and omits panel, formula, and readout copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createSingleSlitView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createSingleSlitSim({
          lambda: 670,
          slitWidth: 0.22,
          distance: 2.4,
          detectorX: 7.31,
          autoScan: false
        }).getState()
      );
    });
    expect(labels).toEqual(
      expect.arrayContaining([
        '激光器',
        '单缝 a',
        '探测光屏',
        '衍射图样',
        '探测器',
        'θ',
        'L',
        'I/I₀',
        'x',
        'x₁'
      ])
    );
    expect(labels.some((text) => text.includes('单缝衍射条纹分布'))).toBe(
      false
    );
    expect(labels.some((text) => text.includes('小角近似'))).toBe(false);
    expect(labels.some((text) => text.includes('实验参数'))).toBe(false);
    expect(labels.some((text) => text.includes('理论分析'))).toBe(false);
    expect(labels.some((text) => text.includes('高频考点'))).toBe(false);
    expect(labels.some((text) => text.includes('波长越长'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    expect(labels.some((text) => text.includes('sinβ'))).toBe(false);
    expect(labels.some((text) => text.includes('第一暗纹'))).toBe(false);
    expect(labels.some((text) => /\d+\.\d+\s*mm/.test(text))).toBe(false);
    expect(labels.some((text) => text.includes('x ='))).toBe(false);
    view.dispose();
  });

  it('renders at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [1024, 768],
      [900, 768],
      [768, 768],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createSingleSlitView({ canvas });
      expect(() => {
        const sim = createSingleSlitSim({ detectorX: 4, autoScan: true });
        view.render(sim.getState());
        sim.step(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps the full animation frame clear of docked readout geometry', () => {
    const pose = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: 265,
      overlayHeightPx: 158
    });
    expect(pose.offsetY + pose.boxH * pose.fit).toBeLessThanOrEqual(249 + 1e-6);
    expect(pose.offsetX + pose.boxW * pose.fit).toBeLessThanOrEqual(
      1280 + 1e-6
    );

    const belowTop = stageTransform(900, 700, {
      floatingReadout: true,
      overlayPx: 900,
      overlayTopPx: 12,
      overlayHeightPx: 120
    });
    expect(belowTop.offsetY).toBeGreaterThanOrEqual(148 - 1e-6);
    expect(belowTop.offsetY + belowTop.boxH * belowTop.fit).toBeLessThanOrEqual(
      700 + 1e-6
    );
  });

  it('keeps the intensity curve on the canvas and formulas off the control pane', () => {
    expect(singleSlitMeta.testProfile?.hasGraph).toBe(false);
    expect(singleSlitMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'theta',
        'intensity',
        'firstMinimum',
        'centralWidth'
      ])
    );
    const titles = singleSlitControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('参数');
    expect(titles).toContain('探测器');
    expect(titles).toContain('要点');
    expect(titles).not.toContain('结论');
    const keys = singleSlitControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'lambda',
        'slitWidth',
        'distance',
        'detectorX',
        'autoScan'
      ])
    );
  });
});

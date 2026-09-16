import { describe, expect, it } from 'vitest';
import { bellowsControlsSchema } from '../../src/scenes/bellows/controls-schema';
import { bellowsMeta } from '../../src/scenes/bellows/scene.meta';
import {
  bellowsConstants,
  createBellowsSim
} from '../../src/scenes/bellows/scene.sim';
import { createBellowsView } from '../../src/scenes/bellows/scene.view';

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
  // Mock canvas puts fillText on the instance; real 2d contexts inherit it.
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

describe('bellows view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(bellowsConstants.baseWidth).toBe(800);
    expect(bellowsConstants.baseHeight).toBe(560);
    expect('fieldWidth' in bellowsConstants).toBe(false);
    expect('actionBoxX' in bellowsConstants).toBe(false);
    expect('mechanismTop' in bellowsConstants).toBe(false);
    expect('cardLeftX' in bellowsConstants).toBe(false);
    expect(bellowsConstants.chamberRight).toBeLessThan(
      bellowsConstants.baseWidth
    );
  });

  it('keeps the piston travel inside the dual chamber', () => {
    expect(bellowsConstants.pistonMin).toBeGreaterThan(
      bellowsConstants.chamberLeft
    );
    expect(bellowsConstants.pistonMax).toBeLessThan(
      bellowsConstants.chamberRight
    );
  });

  it('draws apparatus labels and omits status/monitor/mechanism copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createBellowsView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createBellowsSim({ motion: 'left' }).getState());
    });
    expect(labels).toEqual(
      expect.arrayContaining(['出风口', 'A', 'B', 'C', 'D', '排气高压'])
    );
    expect(labels.some((text) => text.includes('核心机制'))).toBe(false);
    expect(labels.some((text) => text.includes('气动单向阀'))).toBe(false);
    expect(labels.some((text) => text.includes('当前机械动作'))).toBe(false);
    expect(labels.some((text) => text.includes('手动牵引'))).toBe(false);
    expect(labels.some((text) => text.includes('左推排气'))).toBe(false);
    view.dispose();
  });

  it('renders at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createBellowsView({ canvas });
      expect(() => {
        view.render(createBellowsSim().getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(createBellowsSim({ motion: 'right' }).getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph off and readout keys on the layout contract', () => {
    expect(bellowsMeta.testProfile?.hasGraph).toBe(false);
    expect(bellowsMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'direction',
        'leftPressure',
        'rightPressure',
        'valveA',
        'valveB',
        'valveC',
        'valveD'
      ])
    );
    const titles = bellowsControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('机械动作');
    expect(titles).not.toContain('结论');
    const keys = bellowsControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toContain('motion');
    expect(keys).toContain('showFlow');
    expect(keys).not.toContain('autoRun');
  });
});

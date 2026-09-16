import { describe, expect, it } from 'vitest';
import { accelForceControlsSchema } from '../../src/scenes/accel-force/controls-schema';
import { accelForceMeta } from '../../src/scenes/accel-force/scene.meta';
import {
  ACCEL_FORCE_X_TITLE_FORCE,
  ACCEL_FORCE_X_TITLE_MASS,
  ACCEL_FORCE_Y_TITLE,
  accelForceConstants as C,
  createAccelForceSim
} from '../../src/scenes/accel-force/scene.sim';
import {
  createAccelForceView,
  sizeGraphCanvasToHost
} from '../../src/scenes/accel-force/scene.view';

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

describe('accel-force view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(860);
    expect(C.baseHeight).toBe(540);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaBoxY' in C).toBe(false);
    expect(C.trackRight).toBeLessThan(C.baseWidth);
    expect(C.trackY).toBeLessThan(C.baseHeight - C.transportClearY);
  });

  it('draws apparatus labels and omits formula, data, and conclusion copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createAccelForceView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createAccelForceSim({
          balanced: true,
          hangerMass: 0.03,
          autoRun: false
        }).getState()
      );
    });
    expect(labels).toEqual(
      expect.arrayContaining([
        '打点计时器',
        '定滑轮',
        '槽码',
        '垫高',
        'F',
        'M',
        'm'
      ])
    );
    expect(labels.some((text) => text.includes('F = Ma'))).toBe(false);
    expect(labels.some((text) => text.includes('a = mg'))).toBe(false);
    expect(labels.some((text) => text.includes('理论'))).toBe(false);
    expect(labels.some((text) => text.includes('拉力'))).toBe(false);
    expect(labels.some((text) => text.includes('逐差'))).toBe(false);
    expect(labels.some((text) => text.includes('探究'))).toBe(false);
    expect(labels.some((text) => text.includes('结论'))).toBe(false);
    expect(labels.some((text) => text.includes('已平衡摩擦力'))).toBe(false);
    expect(labels.some((text) => text.includes('不得宣称'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    expect(labels.some((text) => text.includes('F / N'))).toBe(false);
    expect(labels.some((text) => text.includes('1/M'))).toBe(false);
    view.dispose();
  });

  it('draws f only when friction is not balanced', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createAccelForceView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createAccelForceSim({
          balanced: false,
          hangerMass: 0.08,
          autoRun: false
        }).getState()
      );
    });
    expect(labels).toEqual(expect.arrayContaining(['F', 'f']));
    expect(labels.some((text) => text.includes('垫高'))).toBe(false);
    view.dispose();
  });

  it('keeps a–F / a–1/M titles on the graph canvas, not the animation canvas', () => {
    const canvas = mockCanvas(1280, 720);
    const graphCanvas = mockCanvas(640, 240);
    const view = createAccelForceView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const sim = createAccelForceSim({ mode: 'force', autoRun: false });
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels.some((text) => text.includes('F / N'))).toBe(false);
    expect(graphLabels).toEqual(
      expect.arrayContaining([ACCEL_FORCE_X_TITLE_FORCE, ACCEL_FORCE_Y_TITLE])
    );
    sim.setParams({ mode: 'inverseMass' });
    const massLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(massLabels).toEqual(
      expect.arrayContaining([ACCEL_FORCE_X_TITLE_MASS, ACCEL_FORCE_Y_TITLE])
    );
    view.dispose();
  });

  it('renders light/dark and presentation at desktop and mobile slots', () => {
    for (const [width, height] of [
      [1280, 720],
      [1024, 768],
      [900, 768],
      [768, 768],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(Math.min(width, 640), 200);
      const view = createAccelForceView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createAccelForceSim({ autoRun: false });
        view.attachGraphCanvas(graphCanvas);
        view.render(sim.getState());
        sim.stepFrame(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        sim.setParams({ balanced: false, mode: 'inverseMass' });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps the graph on the layout card and formulas in the control pane', () => {
    expect(accelForceMeta.testProfile?.hasGraph).toBe(true);
    expect(accelForceMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'force',
        'accelTheory',
        'accelTape',
        'velocity',
        'time',
        'status'
      ])
    );
    const titles = accelForceControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('控制变量');
    expect(titles).toContain('参数');
    expect(titles).toContain('操作');
    expect(titles).toContain('要点');
    expect(titles).not.toContain('结论');
    const keys = accelForceControlsSchema.sections.flatMap((section) =>
      section.fields.flatMap((field) => {
        if (field.type === 'button-grid') {
          return field.buttons.map((button) => button.key);
        }
        return [field.key];
      })
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'mode',
        'cartMass',
        'hangerMass',
        'balanced',
        'release',
        'resetCart',
        'record',
        'clear',
        'restart',
        'autoRun'
      ])
    );
    const hint = accelForceControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining([
        'a = mg/(M+m)，g = 9.8',
        '平衡后 F = Ma；未平衡 F − f = Ma',
        'Δs = a(Δt)²，Δt = 0.10 s',
        '未平衡时不得宣称正比'
      ])
    );
  });

  it('sizes the graph canvas to the padded slot content box', () => {
    const host = document.createElement('div');
    host.style.padding = '8px';
    host.style.width = '640px';
    host.style.height = '163px';
    host.style.boxSizing = 'border-box';
    document.body.appendChild(host);
    host.getBoundingClientRect = () =>
      ({
        width: 640,
        height: 163,
        top: 557,
        left: 0,
        bottom: 720,
        right: 640,
        x: 0,
        y: 557,
        toJSON() {
          return {};
        }
      }) as DOMRect;
    const graphCanvas = document.createElement('canvas');
    host.appendChild(graphCanvas);
    const sized = sizeGraphCanvasToHost(graphCanvas);
    expect(sized.cssWidth).toBe(624);
    expect(sized.cssHeight).toBe(147);
    expect(graphCanvas.style.width).toBe('624px');
    expect(graphCanvas.style.height).toBe('147px');
    const view = createAccelForceView({
      canvas: mockCanvas(800, 400),
      theme: 'light'
    });
    view.attachGraphCanvas(graphCanvas);
    view.render(createAccelForceSim({ autoRun: false }).getState());
    expect(graphCanvas.style.height).toBe('147px');
    expect(graphCanvas.style.width).toBe('624px');
    view.dispose();
    host.remove();
  });

  it('keeps graph axis titles inside the canvas bitmap', () => {
    const canvas = mockCanvas(800, 400);
    const graphCanvas = mockCanvas(640, 147);
    const view = createAccelForceView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const ctx = graphCanvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context is required');
    const host = resolveFillTextHost(ctx);
    const original = host.fillText;
    const marks: Array<{ text: string; y: number }> = [];
    host.fillText = function fillTextSpy(
      this: CanvasRenderingContext2D,
      value: string,
      x: number,
      y: number,
      maxWidth?: number
    ) {
      marks.push({ text: String(value), y });
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
    };
    try {
      view.render(createAccelForceSim({ autoRun: false }).getState());
    } finally {
      host.fillText = original;
    }
    const titles = marks.filter(
      (item) =>
        item.text === ACCEL_FORCE_X_TITLE_FORCE ||
        item.text === ACCEL_FORCE_Y_TITLE
    );
    expect(titles).toHaveLength(2);
    titles.forEach((item) => {
      expect(item.y).toBeGreaterThanOrEqual(8);
      expect(item.y).toBeLessThanOrEqual(147 - 8);
    });
    view.dispose();
  });
});

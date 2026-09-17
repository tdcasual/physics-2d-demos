import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import { ampereBalanceControlsSchema } from '../../src/scenes/ampere-balance/controls-schema';
import { createAmpereBalanceScene } from '../../src/scenes/ampere-balance/scene.entry';
import { ampereBalanceMeta } from '../../src/scenes/ampere-balance/scene.meta';
import {
  ampereBalanceConstants as C,
  ampereBalancePresets,
  createAmpereBalanceSim
} from '../../src/scenes/ampere-balance/scene.sim';
import {
  commonForceScale,
  createAmpereBalanceView,
  forceArrows,
  planeLayout
} from '../../src/scenes/ampere-balance/scene.view';

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

describe('ampere-balance view contract', () => {
  it('has no in-canvas side panel', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    const src = readFileSync(
      resolve(process.cwd(), 'src/scenes/ampere-balance/scene.view.ts'),
      'utf8'
    );
    expect(src).not.toMatch(
      /drawPanel|通电导体棒在磁场斜面上|左手定则：B × I|受力计算与平衡判断|time \* 18/
    );
  });

  it('draws the incline diagram without formulas or fake sliders', () => {
    const canvas = mockCanvas(860, 520);
    const view = createAmpereBalanceView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createAmpereBalanceSim().getState());
    });
    expect(labels).toEqual(expect.arrayContaining(['G', 'Fₐ', 'θ = 30°']));
    expect(labels.some((text) => text.includes('Fₐ = BIL'))).toBe(false);
    expect(labels.some((text) => text.includes('左手定则'))).toBe(false);
    expect(labels.some((text) => text.includes('系统参数'))).toBe(false);
    view.dispose();
  });

  it('keeps FA right for B down / I out and flips with current', () => {
    const out = forceArrows(createAmpereBalanceSim().getState());
    expect(out.fa.x2).toBeGreaterThan(out.fa.x1);
    expect(out.g.y2).toBeGreaterThan(out.g.y1);
    const inn = forceArrows(
      createAmpereBalanceSim({ currentDirection: 'in' }).getState()
    );
    expect(inn.fa.x2).toBeLessThan(inn.fa.x1);
  });

  it('draws default G about 8/4.6 times FA with a shared scale', () => {
    const state = createAmpereBalanceSim().getState();
    const arrows = forceArrows(state);
    const gLen = Math.hypot(
      arrows.g.x2 - arrows.g.x1,
      arrows.g.y2 - arrows.g.y1
    );
    const faLen = Math.hypot(
      arrows.fa.x2 - arrows.fa.x1,
      arrows.fa.y2 - arrows.fa.y1
    );
    expect(faLen).toBeGreaterThan(0);
    expect(gLen / faLen).toBeCloseTo(8 / 4.6, 5);
    expect(arrows.scale).toBe(commonForceScale(state));
    const fnLen = Math.hypot(
      arrows.fn.x2 - arrows.fn.x1,
      arrows.fn.y2 - arrows.fn.y1
    );
    expect(fnLen / faLen).toBeCloseTo(state.normalForce / 4.6, 5);
  });

  it('offsets f需 along the outward normal without changing direction or scale', () => {
    const state = createAmpereBalanceSim().getState();
    const arrows = forceArrows(state);
    const layout = arrows.layout;
    const dx = arrows.friction.x1 - layout.rod.x;
    const dy = arrows.friction.y1 - layout.rod.y;
    expect(dx * layout.along.x + dy * layout.along.y).toBeCloseTo(0, 6);
    expect(dx * layout.normal.x + dy * layout.normal.y).toBeCloseTo(
      C.frictionLift,
      6
    );
    const fx = arrows.friction.x2 - arrows.friction.x1;
    const fy = arrows.friction.y2 - arrows.friction.y1;
    const pix = Math.hypot(fx, fy);
    const mag = Math.hypot(state.frictionVector.x, state.frictionVector.y);
    expect(fx / pix).toBeCloseTo(state.frictionVector.x / mag, 8);
    expect(fy / pix).toBeCloseTo(state.frictionVector.y / mag, 8);
    expect(pix / mag).toBeCloseTo(arrows.scale, 8);
  });

  it('hides required friction when the support-zero preset has N≈0', () => {
    const arrows = forceArrows(
      createAmpereBalanceSim({ ...ampereBalancePresets.supportZero }).getState()
    );
    expect(arrows.friction.visible).toBe(false);
    const canvas = mockCanvas(860, 520);
    const view = createAmpereBalanceView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createAmpereBalanceSim({
          ...ampereBalancePresets.supportZero
        }).getState()
      );
    });
    expect(labels).not.toContain('f需');
    view.dispose();
  });

  it('keeps force tips inside the design frame at extrema', () => {
    const states = [
      createAmpereBalanceSim({
        magneticField: 3,
        current: 8,
        mass: 3,
        inclineAngle: 55
      }).getState(),
      createAmpereBalanceSim({ ...ampereBalancePresets.detach }).getState(),
      createAmpereBalanceSim({
        magneticField: 0,
        current: 0,
        mass: 0.2,
        inclineAngle: 10
      }).getState()
    ];
    for (const state of states) {
      const arrows = forceArrows(state);
      for (const geom of [arrows.g, arrows.fa, arrows.fn, arrows.friction]) {
        if (!geom.visible) continue;
        expect(geom.x2).toBeGreaterThan(8);
        expect(geom.x2).toBeLessThan(C.baseWidth - 8);
        expect(geom.y2).toBeGreaterThan(8);
        expect(geom.y2).toBeLessThan(C.baseHeight - 8);
      }
      const layout = planeLayout(state.params.inclineAngle);
      expect(layout.rod.x).toBeGreaterThan(layout.top.x);
      expect(layout.rod.x).toBeLessThan(layout.end.x);
    }
  });

  it('keeps formulas in the control slot and has no graph', () => {
    expect(ampereBalanceMeta.testProfile?.hasGraph).toBe(false);
    expect(ampereBalanceMeta.testProfile?.hasTransport).toBe(false);
    expect(ampereBalanceMeta.demoProfile?.transport).toBe('hidden');
    const sections = ampereBalanceControlsSchema.sections.map((s) => s.title);
    expect(sections).toEqual(
      expect.arrayContaining(['磁场与电流', '典型情景', '物理量', '规律'])
    );
    expect(sections).not.toContain('播放');
    const keys = ampereBalanceControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).not.toContain('autoRun');
    const scene = createAmpereBalanceScene();
    const accel = scene
      .getReadoutItems()
      .find((item) => item.key === 'acceleration');
    expect(accel?.label).toBe('沿斜面分量 a∥');
    const items = scene.getReadoutItems().map((item) => item.key);
    expect(items).toEqual(
      expect.arrayContaining([
        'ampereForce',
        'normalForce',
        'frictionRequired',
        'acceleration',
        'trend'
      ])
    );
    scene.dispose();
  });

  it('uses restorable preset-groups for fieldDirection and currentDirection', () => {
    const fields = ampereBalanceControlsSchema.sections.flatMap(
      (section) => section.fields
    );
    const field = fields.find((item) => item.key === 'fieldDirection');
    const current = fields.find((item) => item.key === 'currentDirection');
    expect(field?.type).toBe('preset-group');
    expect(current?.type).toBe('preset-group');
    if (field?.type !== 'preset-group' || current?.type !== 'preset-group') {
      throw new Error('direction controls must be preset-groups');
    }
    expect(field.initialActive).toBe('down');
    expect(field.columns).toBe(3);
    expect(field.presets.map((preset) => preset.id)).toEqual([
      'up',
      'down',
      'right',
      'left',
      'normalUp',
      'normalDown'
    ]);
    expect(current.initialActive).toBe('out');
    expect(current.presets.map((preset) => preset.id)).toEqual(['out', 'in']);
  });

  it('restores fieldDirection and currentDirection radios after URL-like setActive', () => {
    const mount = document.createElement('div');
    document.body.append(mount);
    const changes: Array<[string, string | number | boolean]> = [];
    const renderer = renderSchema({
      mount,
      schema: ampereBalanceControlsSchema,
      onChange: (key, value) => {
        changes.push([key, value]);
      },
      onAction: () => undefined
    });
    const radio = (id: string) =>
      mount.querySelector(`[data-preset-id="${id}"]`);
    expect(radio('down')?.getAttribute('aria-checked')).toBe('true');
    expect(radio('out')?.getAttribute('aria-checked')).toBe('true');
    (radio('left') as HTMLButtonElement).click();
    (radio('in') as HTMLButtonElement).click();
    expect(changes).toEqual(
      expect.arrayContaining([
        ['fieldDirection', 'left'],
        ['currentDirection', 'in']
      ])
    );
    renderer.setActive('fieldDirection', 'left');
    renderer.setActive('currentDirection', 'in');
    expect(radio('left')?.getAttribute('aria-checked')).toBe('true');
    expect(radio('down')?.getAttribute('aria-checked')).toBe('false');
    expect(radio('in')?.getAttribute('aria-checked')).toBe('true');
    expect(radio('out')?.getAttribute('aria-checked')).toBe('false');
    renderer.dispose();
    mount.remove();
  });

  it('renders desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createAmpereBalanceView({ canvas, theme: 'light' });
      expect(() => {
        view.render(createAmpereBalanceSim().getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        view.render(
          createAmpereBalanceSim({ ...ampereBalancePresets.detach }).getState()
        );
      }).not.toThrow();
      view.dispose();
    }
  });
});

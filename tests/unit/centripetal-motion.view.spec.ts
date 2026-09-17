import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { centripetalControlsSchema } from '../../src/scenes/centripetal-motion/controls-schema';
import { createCentripetalScene } from '../../src/scenes/centripetal-motion/scene.entry';
import { centripetalMeta } from '../../src/scenes/centripetal-motion/scene.meta';
import {
  centripetalConstants as C,
  createCentripetalSim
} from '../../src/scenes/centripetal-motion/scene.sim';
import {
  boxHitsCircle,
  boxInFrame,
  boxesOverlap,
  createCentripetalView,
  labelMetricsForViewport,
  labelsAreSafe,
  markerSizeForViewport,
  motionGeom
} from '../../src/scenes/centripetal-motion/scene.view';

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

function stateAt(partial: {
  mass?: number;
  radius?: number;
  angularVelocity?: number;
  autoRun?: boolean;
}) {
  return createCentripetalSim({ autoRun: false, ...partial }).getState();
}

describe('centripetal-motion view contract', () => {
  it('has no in-canvas side panel or formula-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('formulaY' in C).toBe(false);
    expect('controlY' in C).toBe(false);
    expect('readoutY' in C).toBe(false);
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/centripetal-motion/scene.view.ts'),
      'utf8'
    );
    expect(viewSrc).not.toMatch(
      /drawPanel|圆周运动动力学分析|系统参数|实时状态|Fₙ = m/
    );
  });

  it('paints only orbit labels and keeps formulas off the canvas', () => {
    const canvas = mockCanvas(860, 520);
    const view = createCentripetalView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(stateAt({ mass: 2, radius: 2.5, angularVelocity: 1.5 }));
    });
    expect(labels).toEqual(expect.arrayContaining(['O', 'm', 'v', 'Fₙ']));
    expect(labels.some((text) => text.includes('拉力'))).toBe(false);
    expect(labels.some((text) => text.includes('m/s'))).toBe(false);
    expect(labels.some((text) => text.includes('系统参数'))).toBe(false);
    expect(labels.some((text) => text.includes('圆周运动动力学'))).toBe(false);
    expect(labels.some((text) => text.includes('ω²'))).toBe(false);
    view.dispose();
  });

  it('keeps the v shaft along the trajectory, not the reverse rotation', () => {
    const sim = createCentripetalSim({
      mass: 2,
      radius: 2.5,
      angularVelocity: 1.5,
      autoRun: true
    });
    const before = motionGeom(sim.getState());
    sim.step(0.02);
    const after = motionGeom(sim.getState());
    const moveX = after.ball.x - before.ball.x;
    const moveY = after.ball.y - before.ball.y;
    const shaftX = before.speedTip.x - before.speedStart.x;
    const shaftY = before.speedTip.y - before.speedStart.y;
    expect(moveX * shaftX + moveY * shaftY).toBeGreaterThan(0);
    expect(
      before.tangent.x * before.radial.x + before.tangent.y * before.radial.y
    ).toBeCloseTo(0, 10);
  });

  it('keeps Fₙ perpendicular to v and the right-angle mark square', () => {
    const radii = [1, 2.5, 4];
    for (const radius of radii) {
      const sim = createCentripetalSim({
        mass: 2,
        radius,
        angularVelocity: 1.2,
        autoRun: true
      });
      for (let i = 0; i < 8; i += 1) {
        const g = motionGeom(sim.getState());
        expect(g.tangent.x * g.radial.x + g.tangent.y * g.radial.y).toBeCloseTo(
          0,
          10
        );
        const legA = Math.hypot(
          g.marker.corner.x - g.marker.a.x,
          g.marker.corner.y - g.marker.a.y
        );
        const legB = Math.hypot(
          g.marker.corner.x - g.marker.b.x,
          g.marker.corner.y - g.marker.b.y
        );
        expect(legA).toBeCloseTo(g.marker.size, 6);
        expect(legB).toBeCloseTo(g.marker.size, 6);
        expect(g.marker.size).toBeGreaterThanOrEqual(
          C.ballRadius + C.markerMinPeek - 0.05
        );
        const ax = g.marker.corner.x - g.marker.a.x;
        const ay = g.marker.corner.y - g.marker.a.y;
        const bx = g.marker.corner.x - g.marker.b.x;
        const by = g.marker.corner.y - g.marker.b.y;
        expect(ax * bx + ay * by).toBeCloseTo(0, 6);
        expect(
          Math.hypot(g.marker.corner.x - g.ball.x, g.marker.corner.y - g.ball.y)
        ).toBeGreaterThan(g.ballRadius);
        expect(
          Math.hypot(g.speedLabel.x - g.ball.x, g.speedLabel.y - g.ball.y)
        ).toBeGreaterThan(g.ballRadius + 2);
        expect(
          Math.hypot(g.forceLabel.x - g.ball.x, g.forceLabel.y - g.ball.y)
        ).toBeGreaterThan(g.ballRadius + 2);
        sim.step(Math.PI / 8 / 1.2);
      }
    }
  });

  it('scales v ×2 and Fₙ ×4 for ω=1→2 at m=2, r=2.5 with no safety cap', () => {
    const slow = motionGeom(
      stateAt({ mass: 2, radius: 2.5, angularVelocity: 1 })
    );
    const fast = motionGeom(
      stateAt({ mass: 2, radius: 2.5, angularVelocity: 2 })
    );
    expect(slow.speedCapped).toBe(false);
    expect(fast.speedCapped).toBe(false);
    expect(slow.forceCapped).toBe(false);
    expect(fast.forceCapped).toBe(false);
    expect(slow.speedFloored).toBe(false);
    expect(fast.speedFloored).toBe(false);
    expect(slow.forceFloored).toBe(false);
    expect(fast.forceFloored).toBe(false);
    expect(fast.speedLength / slow.speedLength).toBeCloseTo(2, 8);
    expect(fast.forceLength / slow.forceLength).toBeCloseTo(4, 8);
  });

  it('caps extreme arrows before the hub or frame, and floors only tiny Fₙ', () => {
    const max = motionGeom(stateAt({ mass: 5, radius: 4, angularVelocity: 3 }));
    expect(max.forceCapped).toBe(true);
    const toCenter = Math.hypot(
      max.forceTip.x - max.center.x,
      max.forceTip.y - max.center.y
    );
    expect(toCenter).toBeGreaterThan(C.hubRadius);
    expect(
      Math.hypot(
        max.forceLabel.x - max.center.x,
        max.forceLabel.y - max.center.y
      )
    ).toBeGreaterThan(C.hubRadius + 8);
    expect(max.speedTip.x).toBeGreaterThanOrEqual(C.framePad);
    expect(max.speedTip.x).toBeLessThanOrEqual(C.baseWidth - C.framePad);
    expect(max.speedTip.y).toBeGreaterThanOrEqual(C.framePad);
    expect(max.speedTip.y).toBeLessThanOrEqual(C.baseHeight - C.framePad);

    const min = motionGeom(
      stateAt({ mass: 0.5, radius: 1, angularVelocity: 0.5 })
    );
    // Fₙ=0.5×0.25×1=0.125 N → 0.625 px < 4 px floor. Not the teaching case.
    expect(min.forceFloored).toBe(true);
    expect(min.forceLength).toBe(C.minVisibleArrow);
    expect(
      Math.hypot(min.forceTip.x - min.center.x, min.forceTip.y - min.center.y)
    ).toBeGreaterThan(C.hubRadius);

    const smallR = motionGeom(
      stateAt({ mass: 2, radius: 1, angularVelocity: 2 })
    );
    expect(smallR.forceCapped).toBe(true);
    expect(
      Math.hypot(
        smallR.forceTip.x - smallR.center.x,
        smallR.forceTip.y - smallR.center.y
      )
    ).toBeGreaterThan(C.hubRadius);
  });

  it('keeps formulas in the control slot and readouts off the canvas', () => {
    expect(centripetalMeta.testProfile?.hasGraph).toBe(false);
    expect(centripetalMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'speed',
        'centripetalAcceleration',
        'centripetalForce',
        'period'
      ])
    );
    const sections = centripetalControlsSchema.sections.map(
      (section) => section.title
    );
    expect(sections).toEqual(expect.arrayContaining(['系统参数', '规律']));
    expect(sections).not.toContain('播放');
    const formula = centripetalControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(formula && 'lines' in formula ? formula.lines : []).toEqual(
      expect.arrayContaining(['Fₙ = mω²r 向心合力'])
    );
    const scene = createCentripetalScene();
    const force = scene
      .getReadoutItems()
      .find((item) => item.key === 'centripetalForce');
    expect(force?.label).toBe('向心合力 Fₙ');
    expect(force?.label.includes('拉力')).toBe(false);
    scene.dispose();
  });

  it('keeps v, Fₙ and O boxes clear at extrema across 16 angles', () => {
    const mobile = labelMetricsForViewport(390, 294);
    const desktop = labelMetricsForViewport(836, 651);
    const cases: Array<{
      name: string;
      mass: number;
      radius: number;
      omega: number;
    }> = [
      { name: 'min-radius', mass: 0.5, radius: 1, omega: 0.5 },
      { name: 'max-force', mass: 5, radius: 4, omega: 3 },
      { name: 'max-speed', mass: 2, radius: 4, omega: 3 },
      { name: 'teach', mass: 2, radius: 2.5, omega: 1.5 }
    ];
    for (const metrics of [mobile, desktop]) {
      for (const scene of cases) {
        const sim = createCentripetalSim({
          mass: scene.mass,
          radius: scene.radius,
          angularVelocity: scene.omega,
          autoRun: true
        });
        const markerSize = markerSizeForViewport(
          metrics === mobile ? 390 : 836,
          metrics === mobile ? 294 : 651,
          scene.radius * C.radiusScale
        );
        for (let k = 0; k < 16; k += 1) {
          const g = motionGeom(sim.getState(), { metrics, markerSize });
          expect(
            labelsAreSafe(g),
            `${scene.name} k=${k} r=${scene.radius}`
          ).toBe(true);
          expect(boxInFrame(g.speedBox)).toBe(true);
          expect(boxInFrame(g.forceBox)).toBe(true);
          expect(boxInFrame(g.hubBox)).toBe(true);
          expect(boxesOverlap(g.speedBox, g.forceBox, 4)).toBe(false);
          expect(boxesOverlap(g.forceBox, g.hubBox, 4)).toBe(false);
          expect(boxHitsCircle(g.forceBox, g.center, C.hubRadius, 6)).toBe(
            false
          );
          expect(boxHitsCircle(g.speedBox, g.ball, g.ballRadius, 4)).toBe(
            false
          );
          expect(
            Math.hypot(
              g.marker.corner.x - g.ball.x,
              g.marker.corner.y - g.ball.y
            )
          ).toBeGreaterThan(g.ballRadius + 4);
          expect(g.marker.size).toBeGreaterThan(g.ballRadius);
          sim.step(Math.PI / 8 / scene.omega);
        }
      }
    }
  });

  it('renders desktop and mobile slots in both themes', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createCentripetalView({ canvas, theme: 'light' });
      expect(() => {
        view.render(stateAt({}));
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        view.render(stateAt({ mass: 5, radius: 4, angularVelocity: 3 }));
        view.render(stateAt({ mass: 0.5, radius: 1, angularVelocity: 0.5 }));
      }).not.toThrow();
      view.dispose();
    }
  });
});

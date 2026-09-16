import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { displacementTimeControlsSchema } from '../../src/scenes/displacement-time/controls-schema';
import { displacementTimeMeta } from '../../src/scenes/displacement-time/scene.meta';
import {
  createDisplacementTimeSim,
  displacementTimeConstants as C,
  stageTransform
} from '../../src/scenes/displacement-time/scene.sim';
import { createDisplacementTimeView } from '../../src/scenes/displacement-time/scene.view';

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

describe('displacement-time view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(880);
    expect(C.baseHeight).toBe(680);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaY' in C).toBe(false);
    expect('formulaHeight' in C).toBe(false);
    expect('readoutY' in C).toBe(false);
    expect('readoutHeight' in C).toBe(false);
    expect(C.graphRight).toBeLessThan(C.baseWidth);
    expect(C.displacementBottom).toBeLessThan(C.baseHeight);
  });

  it('has no drawPanel, formula-card, or readout-card paths in source', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/displacement-time/scene.view.ts'),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/displacement-time/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).not.toMatch(/drawPanel/);
    expect(viewSrc).not.toMatch(/实时运动数据/);
    expect(viewSrc).not.toMatch(/匀变速直线运动图像/);
    expect(viewSrc).not.toMatch(/公式卡|读数卡/);
    expect(viewSrc).not.toMatch(/x = v₀t/);
    expect(viewSrc).not.toMatch(/空格键/);
    expect(simSrc).not.toMatch(/panelWidth|panelTitleY|formulaY|readoutY/);
    expect(simSrc).not.toMatch(/fieldWidth/);
  });

  it('draws short v/x labels and omits panel, formula, and readout copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createDisplacementTimeView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
      sim.step(3);
      view.render(sim.getState());
    });
    expect(labels).toEqual(
      expect.arrayContaining(['v', 'x', 't', '0', 'v₀t', '½at²'])
    );
    expect(labels.some((text) => text.includes('匀变速直线运动'))).toBe(false);
    expect(labels.some((text) => text.includes('实时运动数据'))).toBe(false);
    expect(labels.some((text) => text.includes('初速度'))).toBe(false);
    expect(labels.some((text) => text.includes('总位移'))).toBe(false);
    expect(labels.some((text) => text.includes('x ='))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    expect(labels.some((text) => text.includes('播放'))).toBe(false);
    view.dispose();
  });

  it('omits area labels when showArea is false', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createDisplacementTimeView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      const sim = createDisplacementTimeSim({
        v0: 5,
        acceleration: 4,
        showArea: false
      });
      sim.step(3);
      view.render(sim.getState());
    });
    expect(labels.some((text) => text.includes('v₀t'))).toBe(false);
    expect(labels.some((text) => text.includes('½at²'))).toBe(false);
    view.dispose();
  });

  it('renders at desktop and mobile slots without throwing, including mode round-trip', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createDisplacementTimeView({ canvas });
      expect(() => {
        const sim = createDisplacementTimeSim({ v0: 5, acceleration: -4 });
        view.render(sim.getState());
        sim.step(2);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        view.setMode('normal');
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps the full animation stage clear of docked-bottom and overlay geometry', () => {
    const gap = C.overlayGapPx;
    const docked = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: 265,
      overlayHeightPx: 158
    });
    expect(docked.offsetY + docked.boxH * docked.fit).toBeLessThanOrEqual(
      265 - gap + 1e-6
    );
    expect(docked.offsetY).toBeLessThan(C.transportClearY);

    const overlay = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 228,
      overlayTopPx: 60,
      overlayHeightPx: 374
    });
    expect(overlay.offsetX + overlay.boxW * overlay.fit).toBeLessThanOrEqual(
      971 - 228 + 1e-6
    );
    expect(overlay.offsetY).toBeGreaterThanOrEqual(C.transportClearY);
    expect(overlay.offsetY + C.trackY * overlay.fit).toBeGreaterThan(
      C.transportClearY
    );

    const mobile = stageTransform(390, 480, { floatingReadout: false });
    expect(mobile.floatingReadout).toBe(false);
    expect(mobile.fit).toBeCloseTo(Math.min(390 / 880, 480 / 680), 6);
  });

  it('clears the transport bar on side overlay without shrinking a lower dock', () => {
    const gap = C.overlayGapPx;
    const clearY = C.transportClearY;

    const side = stageTransform(862, 423, {
      floatingReadout: true,
      overlayPx: 156,
      overlayTopPx: 60,
      overlayHeightPx: 54
    });
    expect([side.fit, side.offsetX, side.offsetY].every(Number.isFinite)).toBe(
      true
    );
    expect(side.offsetY).toBeGreaterThanOrEqual(clearY);
    expect(side.offsetY + C.trackY * side.fit).toBeGreaterThan(clearY);
    expect(side.fit).toBeCloseTo(
      Math.min((862 - 156 - gap) / C.baseWidth, (423 - clearY) / C.baseHeight),
      6
    );
    expect(side.offsetY + side.boxH * side.fit).toBeLessThanOrEqual(423 + 1e-6);

    const panelTop = 275;
    const docked = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: panelTop,
      overlayHeightPx: 158
    });
    const aboveH = panelTop - gap;
    expect(
      [docked.fit, docked.offsetX, docked.offsetY].every(Number.isFinite)
    ).toBe(true);
    expect(docked.offsetY + docked.boxH * docked.fit).toBeLessThanOrEqual(
      panelTop - gap + 1e-6
    );
    expect(docked.offsetY).toBeLessThan(clearY);
    expect(docked.scaleX).toBeGreaterThan(1.2);
    expect(docked.offsetX).toBeGreaterThanOrEqual(0);
    expect(
      docked.offsetX + docked.boxW * docked.fit * docked.scaleX
    ).toBeLessThanOrEqual(1280 + 1e-6);
    expect(docked.fit).toBeCloseTo(
      Math.min(1280 / C.baseWidth, aboveH / C.baseHeight),
      6
    );
  });

  it('keeps formulas off the canvas and on the control pane', () => {
    expect(displacementTimeMeta.testProfile?.hasGraph).toBe(false);
    expect(displacementTimeMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining(['time', 'velocity', 'displacement'])
    );
    const titles = displacementTimeControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('运动参数');
    expect(titles).toContain('显示');
    expect(titles).toContain('公式');
    const formula = displacementTimeControlsSchema.sections.find(
      (section) => section.title === '公式'
    );
    expect(formula?.collapsed).toBe(true);
    const keys = displacementTimeControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining(['v0', 'acceleration', 'autoRun', 'showArea'])
    );
  });
});

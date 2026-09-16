import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chargedParticleControlsSchema } from '../../src/scenes/charged-particle-circle/controls-schema';
import { chargedParticleMeta } from '../../src/scenes/charged-particle-circle/scene.meta';
import {
  createChargedParticleSim,
  chargedParticleConstants
} from '../../src/scenes/charged-particle-circle/scene.sim';
import { createChargedParticleView } from '../../src/scenes/charged-particle-circle/scene.view';

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

function captureLabels(canvas: HTMLCanvasElement, run: () => void): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is required');
  const host = (
    Object.prototype.hasOwnProperty.call(ctx, 'fillText')
      ? ctx
      : Object.getPrototypeOf(ctx)
  ) as FillTextHost;
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

describe('charged-particle-circle view contract', () => {
  it('keeps the canvas free of panels, formulas, and readout copy', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/scenes/charged-particle-circle/scene.view.ts'
      ),
      'utf8'
    );
    expect(source).not.toMatch(
      /drawPanel|drawLegend|左手定则|核心规律|经典模型|空格|周期与/
    );
    expect(source).not.toMatch(/R = mv|T = 2π|粒子质量|磁感应强度/);
    const simSource = readFileSync(
      resolve(process.cwd(), 'src/scenes/charged-particle-circle/scene.sim.ts'),
      'utf8'
    );
    expect(simSource).not.toMatch(/panelWidth|fieldWidth|formulaCard/);
  });

  it('draws only short orbit labels', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createChargedParticleView({ canvas });
    const labels = captureLabels(canvas, () =>
      view.render(createChargedParticleSim({ autoRun: false }).getState())
    );
    expect(labels).toEqual(expect.arrayContaining(['O', 'R', 'v', 'F', '+']));
    expect(labels.some((value) => value.includes('左手'))).toBe(false);
    expect(labels.some((value) => value.includes('周期'))).toBe(false);
    expect(labels.some((value) => value.includes('m/s'))).toBe(false);
    expect(labels.some((value) => value.includes('空格'))).toBe(false);
    expect(labels.some((value) => /\d/.test(value))).toBe(false);
    view.dispose();
  });

  it('renders desktop, mobile, dark and presentation without overflow exceptions', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createChargedParticleView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createChargedParticleSim({
          autoRun: false,
          velocity: 80,
          mass: 8,
          magneticField: 0.2,
          charge: -0.5
        });
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        sim.setParams({ fieldDirection: 'out', showVelocity: false });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps formulas and readout in the framework contract', () => {
    expect(chargedParticleMeta.testProfile?.hasGraph).toBe(false);
    expect(chargedParticleMeta.urlSyncKeys).toEqual(
      expect.arrayContaining([
        'mass',
        'charge',
        'velocity',
        'magneticField',
        'fieldDirection',
        'autoRun',
        'showVelocity',
        'showForce'
      ])
    );
    expect(chargedParticleMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining(['radius', 'period', 'force', 'period-hint'])
    );
    const titles = chargedParticleControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('关系');
    expect(titles).toContain('参数');
    const hint = chargedParticleControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining(['R = mv / |q|B', 'T = 2πm / |q|B', '|F| = |q|vB'])
    );
    expect(chargedParticleConstants.baseWidth).toBeGreaterThan(
      chargedParticleConstants.maxRadiusPx * 2
    );
  });
});

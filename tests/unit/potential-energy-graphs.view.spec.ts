import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPotentialGraphSim } from '../../src/scenes/potential-energy-graphs/scene.sim';
import { potentialGraphConstants as C } from '../../src/scenes/potential-energy-graphs/scene.sim';
import {
  apparatusXToPx,
  createPotentialGraphView,
  graphXToPx
} from '../../src/scenes/potential-energy-graphs/scene.view';

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

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('2d canvas context is required to capture fillText');
  const original = ctx.fillText.bind(ctx);
  const labels: string[] = [];
  ctx.fillText = function fillTextSpy(
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push(String(value));
    if (maxWidth === undefined) original(value, x, y);
    else original(value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    ctx.fillText = original;
  }
  return labels;
}

describe('potential-energy-graphs view contract', () => {
  it('has no in-canvas side panel or readout-card geometry', () => {
    expect('panelWidth' in C).toBe(false);
    expect('fieldWidth' in C).toBe(false);
    expect('cardWidth' in C).toBe(false);
    expect('readoutY' in C).toBe(false);
  });

  it('keeps φ-x / E-x drawing on the graph canvas path', () => {
    const viewSrc = readFileSync(
      resolve(
        process.cwd(),
        'src/scenes/potential-energy-graphs/scene.view.ts'
      ),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/potential-energy-graphs/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).toContain('attachGraphCanvas');
    expect(viewSrc).toContain('drawApparatus');
    expect(viewSrc).toContain('drawGraphs');
    expect(viewSrc).not.toMatch(/drawPanel|读图结论|图象微积分|面积与能量/);
    expect(viewSrc).not.toMatch(/斜率越负|正电荷到高电势/);
    expect(simSrc).not.toMatch(/panelWidth|fieldWidth|cardWidth/);
  });

  it('paints the 1-D apparatus on the animation canvas and both graphs in the graph slot', () => {
    const canvas = mockCanvas(800, 360);
    const graphCanvas = mockCanvas(640, 280);
    const view = createPotentialGraphView({ canvas, theme: 'light' });
    const sim = createPotentialGraphSim({
      scenario: 'segments',
      autoRun: false
    });
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    expect(stageLabels).toEqual(
      expect.arrayContaining(['极板', '+q', 'E', 'F'])
    );
    expect(stageLabels.some((text) => text.includes('φ / V'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('E / (V'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('∫E dx'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('k='))).toBe(false);

    view.attachGraphCanvas(graphCanvas);
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(sim.getState());
    });
    expect(graphLabels).toEqual(
      expect.arrayContaining(['φ / V', 'E / (V·m⁻¹)', 'x / m'])
    );
    expect(graphLabels.some((text) => text.startsWith('k='))).toBe(true);
    expect(graphLabels).toContain('∫E dx');
    view.dispose();
  });

  it('maps Coulomb icons to x=−1 and x=11 while graphs stay on 0–10 m', () => {
    const left = 0;
    const right = 120;
    expect(apparatusXToPx(C.pointChargeX, left, right)).toBeCloseTo(left, 10);
    expect(apparatusXToPx(C.negativeChargeX, left, right)).toBeCloseTo(
      right,
      10
    );
    expect(apparatusXToPx(C.xMin, left, right)).toBeGreaterThan(left);
    expect(apparatusXToPx(C.xMax, left, right)).toBeLessThan(right);
    expect(graphXToPx(C.xMin, left, right)).toBeCloseTo(left, 10);
    expect(graphXToPx(C.xMax, left, right)).toBeCloseTo(right, 10);
    expect(graphXToPx(0, left, right)).not.toBeCloseTo(
      apparatusXToPx(0, left, right),
      6
    );
    const r = Math.max(11, 10);
    expect(apparatusXToPx(C.pointChargeX, 24, 776) - r).toBeGreaterThanOrEqual(
      0
    );
    expect(apparatusXToPx(C.negativeChargeX, 24, 776) + r).toBeLessThanOrEqual(
      800
    );
  });

  it('hides the unique tangent and probe E/F arrows at x=3 and x=7 kinks', () => {
    const canvas = mockCanvas(800, 360);
    const graphCanvas = mockCanvas(640, 280);
    const view = createPotentialGraphView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    for (const x of [3, 7]) {
      const sim = createPotentialGraphSim({
        scenario: 'segments',
        probePosition: x,
        autoRun: false,
        showTangent: true
      });
      expect(sim.getState().kink).toBe(true);
      const stageLabels = withFillTextCapture(canvas, () => {
        view.render(sim.getState());
      });
      expect(stageLabels).toContain('+q');
      expect(stageLabels).not.toContain('E');
      expect(stageLabels).not.toContain('F');
      expect(stageLabels.some((text) => text.startsWith('k='))).toBe(false);
      const graphLabels = withFillTextCapture(graphCanvas, () => {
        view.render(sim.getState());
      });
      expect(graphLabels).toContain('折点');
      expect(graphLabels).toEqual(expect.arrayContaining(['E₋', 'E₊']));
      expect(graphLabels.some((text) => text.startsWith('k='))).toBe(false);
    }
    view.dispose();
  });

  it('shows source polarity instead of plates in the point-charge scenario', () => {
    const canvas = mockCanvas(800, 360);
    const view = createPotentialGraphView({ canvas, theme: 'light' });
    const sim = createPotentialGraphSim({ scenario: 'point', autoRun: false });
    const labels = withFillTextCapture(canvas, () => {
      view.render(sim.getState());
    });
    expect(labels).toEqual(expect.arrayContaining(['+Q', '+q']));
    expect(labels).not.toContain('极板');
    expect(labels).not.toContain('−Q');
    view.dispose();
  });
});

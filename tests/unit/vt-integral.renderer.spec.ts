import { describe, it, expect } from 'vitest';
import { drawAxis } from '../../src/scenes/vt-integral/renderer/draw-axis';
import { drawMetricPanel } from '../../src/scenes/vt-integral/renderer/draw-metric-panel';
import { drawScene1 } from '../../src/scenes/vt-integral/renderer/draw-scene1';
import { drawScene2 } from '../../src/scenes/vt-integral/renderer/draw-scene2';
import { drawScene3 } from '../../src/scenes/vt-integral/renderer/draw-scene3';

import type { VtIntegralSnapshot } from '../../src/scenes/vt-integral/scene.sim';

function createSnapshot(scene: VtIntegralSnapshot['params']['scene']): VtIntegralSnapshot {
  return {
    params: {
      scene,
      rects: 10,
      time: 5,
      method: 'mid',
      curveAmplitude: 2,
      circleN: 6,
      surfaceN: 8,
      division: 4
    },
    metrics: {
      rectArea: 10.5,
      trueArea: 11.2,
      absErr: 0.7,
      relErr: 0.06,
      curveLength: 8.5,
      lineDistance: 7.2,
      circumferenceDiff: 0.3,

    }
  };
}

function makeCtx(): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return { ctx: canvas.getContext('2d')!, canvas };
}

describe('vt-integral renderer', () => {
  describe('draw-axis', () => {
    it('draws axis without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawAxis(
          { ctx, width: 800, height: 600, theme: 'dark', responsiveScale: 1 },
          {
            x: 60,
            y: 60,
            width: 700,
            height: 500,
            xMin: 0,
            xMax: 10,
            yMin: 0,
            yMax: 10,
            xLabel: 't / s',
            yLabel: 'v / (m·s⁻¹)'
          }
        )
      ).not.toThrow();
    });
  });

  describe('draw-metric-panel', () => {
    it('draws metric panel without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawMetricPanel(
          { ctx, width: 800, height: 600, theme: 'dark', responsiveScale: 1 },
          [
            { label: '矩形面积', value: '10.5' },
            { label: '真实面积', value: '11.2' }
          ],
          300
        )
      ).not.toThrow();
    });
  });

  describe('scene renderers', () => {
    const scenes: Array<{ name: string; fn: typeof drawScene1; scene: VtIntegralSnapshot['params']['scene'] }> = [
      { name: 'scene1', fn: drawScene1, scene: 'scene1' },
      { name: 'scene2', fn: drawScene2, scene: 'scene2' },
      { name: 'scene3', fn: drawScene3, scene: 'scene3' }
    ];

    for (const { name, fn, scene } of scenes) {
      it(`draws ${name} without throwing`, () => {
        const { ctx } = makeCtx();
        const snapshot = createSnapshot(scene);
        expect(() =>
          fn({ ctx, width: 800, height: 600, theme: 'dark', responsiveScale: 1 }, snapshot)
        ).not.toThrow();
      });
    }
  });
});

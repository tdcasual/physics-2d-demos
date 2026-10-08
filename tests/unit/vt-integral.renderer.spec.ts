import { describe, it, expect, vi } from 'vitest';
import { drawAxis } from '../../src/scenes/vt-integral/renderer/draw-axis';
import { drawScene1 } from '../../src/scenes/vt-integral/renderer/draw-scene1';
import { drawScene2 } from '../../src/scenes/vt-integral/renderer/draw-scene2';
import { drawScene3 } from '../../src/scenes/vt-integral/renderer/draw-scene3';
import { fontPx } from '../../src/scenes/vt-integral/renderer/palette';

import type { VtIntegralSnapshot } from '../../src/scenes/vt-integral/scene.sim';

function createSnapshot(
  scene: VtIntegralSnapshot['params']['scene']
): VtIntegralSnapshot {
  return {
    params: {
      scene,
      rects: 10,
      time: 5,
      method: 'mid',
      curveKind: 'linear',
      curveAmplitude: 2,
      circleN: 6,
      surfaceN: 8,
      division: 4,
      pointA: 0.2,
      pointB: 0.8
    },
    metrics: {
      rectArea: 10.5,
      trueArea: 11.2,
      absErr: 0.7,
      relErr: 0.06,
      curveLength: 8.5,
      lineDistance: 7.2,
      circumferenceDiff: 0.3,
      signedErr: -0.7,
      polygonPerimeter: 6
    }
  };
}

function makeCtx(): {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
} {
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
          {
            ctx,
            width: 800,
            height: 600,
            theme: 'dark',
            responsiveScale: 1,
            contentScale: 1
          },
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

  describe('scene renderers', () => {
    const scenes: Array<{
      name: string;
      fn: typeof drawScene1;
      scene: VtIntegralSnapshot['params']['scene'];
    }> = [
      { name: 'scene1', fn: drawScene1, scene: 'scene1' },
      { name: 'scene2', fn: drawScene2, scene: 'scene2' },
      { name: 'scene3', fn: drawScene3, scene: 'scene3' }
    ];

    for (const { name, fn, scene } of scenes) {
      it(`draws ${name} without throwing`, () => {
        const { ctx } = makeCtx();
        const snapshot = createSnapshot(scene);
        expect(() =>
          fn(
            {
              ctx,
              width: 800,
              height: 600,
              theme: 'dark',
              responsiveScale: 1,
              contentScale: 1
            },
            snapshot
          )
        ).not.toThrow();
      });

      it(`draws ${name} in presentation mode (contentScale) without throwing`, () => {
        const { ctx } = makeCtx();
        const snapshot = createSnapshot(scene);
        expect(() =>
          fn(
            {
              ctx,
              width: 800,
              height: 600,
              theme: 'light',
              responsiveScale: 0.6,
              contentScale: 1.5
            },
            snapshot
          )
        ).not.toThrow();
      });
    }
  });

  describe('readout overlay avoidance', () => {
    // 读数浮层典型位置：split-right 右上角（right: 12px; top: 60px）
    const occlusion = { left: 540, top: 60, right: 788, bottom: 380 };
    const inside = (x: number, y: number) =>
      x > occlusion.left &&
      x < occlusion.right &&
      y > occlusion.top &&
      y < occlusion.bottom;

    for (const { name, fn, scene } of [
      { name: 'scene1', fn: drawScene1, scene: 'scene1' as const },
      { name: 'scene2', fn: drawScene2, scene: 'scene2' as const },
      { name: 'scene3', fn: drawScene3, scene: 'scene3' as const }
    ]) {
      it(`${name}: no text anchor and no filled rect inside the overlay`, () => {
        const { ctx } = makeCtx();
        const snapshot = createSnapshot(scene);
        snapshot.params.method = 'left';
        fn(
          {
            ctx,
            width: 800,
            height: 600,
            theme: 'dark',
            responsiveScale: 1,
            contentScale: 1,
            occlusion
          },
          snapshot
        );
        const texts = vi.mocked(ctx.fillText).mock.calls;
        expect(texts.length).toBeGreaterThan(0);
        for (const [text, x, y] of texts) {
          expect(inside(x, y), `${String(text)} @ ${x},${y}`).toBe(false);
        }
        for (const [x, y, w, h] of vi.mocked(ctx.fillRect).mock.calls) {
          // 背景以外的矩形（矩形条、图例色块）不得伸入浮层
          if (w >= 800 && h >= 600) continue;
          const overlaps =
            x < occlusion.right &&
            x + w > occlusion.left &&
            y < occlusion.bottom &&
            y + h > occlusion.top;
          expect(overlaps, `rect ${x},${y},${w},${h}`).toBe(false);
        }
      });
    }

    it('scene2 returns the plot layout used for hit-testing, clear of the overlay', () => {
      const { ctx } = makeCtx();
      const layout = drawScene2(
        {
          ctx,
          width: 800,
          height: 600,
          theme: 'dark',
          responsiveScale: 1,
          contentScale: 1,
          occlusion
        },
        createSnapshot('scene2')
      );
      const clear =
        layout.right <= occlusion.left || layout.top >= occlusion.bottom;
      expect(clear).toBe(true);
      expect(layout.toX(0)).toBe(layout.left);
      expect(layout.toX(1)).toBe(layout.right);
    });
  });

  describe('axis labels stay on canvas', () => {
    it('y-axis label is drawn right of the axis, never at negative x (narrow canvas)', () => {
      const { ctx } = makeCtx();
      drawScene1(
        {
          ctx,
          width: 360,
          height: 420,
          theme: 'light',
          responsiveScale: 0.6,
          contentScale: 1
        },
        createSnapshot('scene1')
      );
      const call = vi
        .mocked(ctx.fillText)
        .mock.calls.find(([text]) => text === 'v / (m·s⁻¹)');
      expect(call).toBeDefined();
      const [, x, y] = call!;
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      for (const [, tx] of vi.mocked(ctx.fillText).mock.calls) {
        expect(tx).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('classroom tokens', () => {
    it('keeps 1080P presentation titles in the projector band', () => {
      const title = fontPx(14, 1.5, 1.5);
      expect(title).toBeGreaterThanOrEqual(24);
      expect(title).toBeLessThanOrEqual(48);
      expect(fontPx(11, 1.5, 1.5)).toBeLessThan(title);
    });
  });
});

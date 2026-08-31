import { describe, expect, it, vi } from 'vitest';
import {
  toAbsoluteViewport,
  withViewport
} from '../../src/instruments/_utils/viewport';
import type { InstrumentViewport } from '../../src/instruments/_contract/instrument-contract';

function makeCanvas(width = 800, height = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// tests/setup.ts 为 happy-dom 安装了带 vi.fn() 间谍的 2D context mock；
// 该 mock 没有 canvas 反向引用，这里补上以覆盖 ctx.canvas 代码路径
function getMockCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context mock not installed');
  const mutable = ctx as unknown as { canvas?: HTMLCanvasElement };
  if (!mutable.canvas) mutable.canvas = canvas;
  return ctx;
}

describe('instruments _utils/viewport', () => {
  describe('withViewport with explicit viewport', () => {
    it('clips to the viewport rect and translates the origin', () => {
      const canvas = makeCanvas();
      const ctx = getMockCtx(canvas);
      const viewport: InstrumentViewport = {
        x: 40,
        y: 30,
        width: 200,
        height: 120
      };

      withViewport(ctx, viewport, () => {});

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalledWith(40, 30, 200, 120);
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(40, 30);
    });

    it('passes the local viewport size to the callback', () => {
      const canvas = makeCanvas();
      const ctx = getMockCtx(canvas);
      const callback = vi.fn();

      withViewport(ctx, { x: 10, y: 20, width: 300, height: 150 }, callback);

      expect(callback).toHaveBeenCalledWith(300, 150);
    });

    it('wraps drawing in save/restore', () => {
      const canvas = makeCanvas();
      const ctx = getMockCtx(canvas);

      withViewport(ctx, { x: 0, y: 0, width: 10, height: 10 }, () => {});

      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });

    it('restores the context even when the callback throws', () => {
      const canvas = makeCanvas();
      const ctx = getMockCtx(canvas);

      expect(() =>
        withViewport(ctx, { x: 0, y: 0, width: 10, height: 10 }, () => {
          throw new Error('boom');
        })
      ).toThrow('boom');
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });
  });

  describe('withViewport without viewport', () => {
    it('uses the whole canvas and skips clipping/translation', () => {
      const canvas = makeCanvas(640, 480);
      const ctx = getMockCtx(canvas);
      const callback = vi.fn();

      withViewport(ctx, undefined, callback);

      expect(callback).toHaveBeenCalledWith(640, 480);
      expect(ctx.clip).not.toHaveBeenCalled();
      expect(ctx.translate).not.toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });

    it('restores the context when the callback throws', () => {
      const canvas = makeCanvas();
      const ctx = getMockCtx(canvas);

      expect(() =>
        withViewport(ctx, undefined, () => {
          throw new Error('boom');
        })
      ).toThrow('boom');
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });
  });

  describe('toAbsoluteViewport', () => {
    it('converts relative fractions to absolute pixels', () => {
      const canvas = makeCanvas(800, 600);
      const vp = toAbsoluteViewport(canvas, {
        x: 0.25,
        y: 0.5,
        width: 0.5,
        height: 1
      });
      expect(vp).toEqual({ x: 200, y: 300, width: 400, height: 600 });
    });

    it('full-canvas relative viewport maps to the canvas size', () => {
      const canvas = makeCanvas(1024, 768);
      const vp = toAbsoluteViewport(canvas, {
        x: 0,
        y: 0,
        width: 1,
        height: 1
      });
      expect(vp).toEqual({ x: 0, y: 0, width: 1024, height: 768 });
    });
  });
});

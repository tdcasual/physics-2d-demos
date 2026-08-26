import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setCanvasSize } from '../../src/core/canvas-sizing';
import { drawGrid, drawTrail, drawBall } from '../../src/core/draw-primitives';

describe('core canvas utils (canvas-sizing + draw-primitives)', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.style.width = '800px';
    canvas.style.height = '600px';
    document.body.appendChild(canvas);
    // Mock getBoundingClientRect for happy-dom
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600
      }),
      configurable: true
    });
  });

  const originalDpr = window.devicePixelRatio;

  afterEach(() => {
    canvas.remove();
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true
    });
  });

  describe('setCanvasSize', () => {
    it('should set canvas size and return 2d context', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 1,
        configurable: true
      });
      const ctx = setCanvasSize(canvas, 400, 300);
      expect(ctx).toBeDefined();
      expect(canvas.style.width).toBe('400px');
      expect(canvas.style.height).toBe('300px');
      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(300);
    });

    it('should skip CSS size when setCssSize is false', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 1,
        configurable: true
      });
      setCanvasSize(canvas, 400, 300, false);
      expect(canvas.style.width).not.toBe('400px');
    });

    it('should handle high DPR', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        configurable: true
      });
      setCanvasSize(canvas, 400, 300);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('drawGrid', () => {
    it('should draw grid and axes without error', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawGrid(ctx, 800, 600)).not.toThrow();
    });

    it('should support dark mode', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawGrid(ctx, 800, 600, {}, true)).not.toThrow();
    });

    it('should hide grid when showGrid is false', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawGrid(ctx, 800, 600, { showGrid: false })).not.toThrow();
    });

    it('should hide axes when showAxes is false', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawGrid(ctx, 800, 600, { showAxes: false })).not.toThrow();
    });
  });

  describe('drawTrail', () => {
    it('should draw trail for multiple points', () => {
      const ctx = canvas.getContext('2d')!;
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 5 }
      ];
      expect(() => drawTrail(ctx, points)).not.toThrow();
    });

    it('should do nothing for fewer than 2 points', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawTrail(ctx, [{ x: 0, y: 0 }])).not.toThrow();
      expect(() => drawTrail(ctx, [])).not.toThrow();
    });

    it('should accept custom color and line width', () => {
      const ctx = canvas.getContext('2d')!;
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      expect(() => drawTrail(ctx, points, '#ff0000', 5)).not.toThrow();
    });
  });

  describe('drawBall', () => {
    it('should draw ball at position', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawBall(ctx, 100, 100)).not.toThrow();
    });

    it('should accept custom radius and color', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawBall(ctx, 50, 50, 12, '#00ff00')).not.toThrow();
    });
  });
});

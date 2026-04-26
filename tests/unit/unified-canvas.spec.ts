import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCanvasContext,
  getOptimalCanvasSize,
  setCanvasSize,
  fitCanvasToContainer,
  drawGrid,
  drawDataPanel,
  drawTrail,
  drawBall,
  drawVector
} from '../../src/core/unified-canvas';

describe('unified-canvas', () => {
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

  describe('createCanvasContext', () => {
    it('should return canvas context with dpr scaling', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        configurable: true
      });
      const result = createCanvasContext(canvas);
      expect(result.canvas).toBe(canvas);
      expect(result.ctx).toBeDefined();
      expect(result.dpr).toBe(2);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });
  });

  describe('getOptimalCanvasSize', () => {
    it('should return size within stage bounds', () => {
      const result = getOptimalCanvasSize(1000, 800);
      expect(result.width).toBeLessThanOrEqual(920);
      expect(result.height).toBeLessThanOrEqual(720);
      expect(result.scale).toBeGreaterThan(0);
    });

    it('should use square aspect when stage is near square', () => {
      const result = getOptimalCanvasSize(500, 500);
      expect(result.width).toBe(result.height);
    });

    it('should clamp scale between 0.5 and 2', () => {
      const tiny = getOptimalCanvasSize(100, 100);
      expect(tiny.scale).toBe(0.5);
      const huge = getOptimalCanvasSize(4000, 3000);
      expect(huge.scale).toBe(2);
    });

    it('should respect custom margin', () => {
      const withMargin = getOptimalCanvasSize(1000, 800, 100);
      expect(withMargin.width).toBeLessThanOrEqual(800);
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

  describe('fitCanvasToContainer', () => {
    it('should size canvas to parent element', () => {
      const parent = document.createElement('div');
      parent.style.width = '500px';
      parent.style.height = '400px';
      document.body.appendChild(parent);
      parent.appendChild(canvas);

      const result = fitCanvasToContainer(canvas);
      expect(result).not.toBeNull();
      expect(result!.width).toBeGreaterThan(0);
      expect(result!.height).toBeGreaterThan(0);
      expect(result!.ctx).toBeDefined();

      parent.remove();
    });

    it('should use explicit container if provided', () => {
      const container = document.createElement('div');
      container.style.width = '300px';
      container.style.height = '200px';
      document.body.appendChild(container);
      Object.defineProperty(container, 'getBoundingClientRect', {
        value: () => ({
          width: 300,
          height: 200,
          top: 0,
          left: 0,
          right: 300,
          bottom: 200
        }),
        configurable: true
      });

      const result = fitCanvasToContainer(canvas, container);
      expect(result).not.toBeNull();
      expect(result!.width).toBe(300);
      expect(result!.height).toBe(200);

      container.remove();
    });

    it('should return null when no parent or container', () => {
      const orphan = document.createElement('canvas');
      expect(fitCanvasToContainer(orphan)).toBeNull();
    });

    it('should enforce minimum size of 1x1', () => {
      const parent = document.createElement('div');
      parent.style.width = '0px';
      parent.style.height = '0px';
      document.body.appendChild(parent);
      parent.appendChild(canvas);

      const result = fitCanvasToContainer(canvas);
      expect(result!.width).toBe(1);
      expect(result!.height).toBe(1);

      parent.remove();
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

  describe('drawDataPanel', () => {
    it('should render data items without error', () => {
      const ctx = canvas.getContext('2d')!;
      const items = [
        { label: 'Time', value: '1.5s' },
        { label: 'Speed', value: '5m/s' }
      ];
      expect(() => drawDataPanel(ctx, 10, 10, items)).not.toThrow();
    });

    it('should support dark mode', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawDataPanel(ctx, 10, 10, [], true)).not.toThrow();
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

  describe('drawVector', () => {
    it('should draw vector arrow', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawVector(ctx, 0, 0, 100, 100)).not.toThrow();
    });

    it('should accept custom color and line width', () => {
      const ctx = canvas.getContext('2d')!;
      expect(() => drawVector(ctx, 0, 0, 50, 50, '#0000ff', 4)).not.toThrow();
    });
  });
});

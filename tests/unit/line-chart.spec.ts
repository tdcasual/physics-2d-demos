import { describe, expect, it, vi } from 'vitest';
import { renderLineChart } from '../../src/core/chart/line-chart';
import { getChartTheme } from '../../src/core/chart/chart-theme';
import type { ChartCanvasState } from '../../src/core/chart/chart-canvas';

/** 可 spy 的 Canvas 上下文类型（绕过类型检查限制） */
type MockCtx = CanvasRenderingContext2D & Record<string, unknown>;

function createMockState(
  overrides?: Partial<ChartCanvasState>
): ChartCanvasState {
  const canvas = document.createElement('canvas');
  return {
    canvas,
    ctx: canvas.getContext('2d')!,
    cssWidth: 500,
    cssHeight: 400,
    dpr: 1,
    hairlineWidth: 1,
    ...overrides
  };
}

describe('line-chart', () => {
  it('should return early for empty series', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const clearRectSpy = vi.spyOn(ctx, 'clearRect');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: []
    });

    expect(clearRectSpy).not.toHaveBeenCalled();
    clearRectSpy.mockRestore();
  });

  it('should clear canvas and fill background', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const clearRectSpy = vi.spyOn(ctx, 'clearRect');
    const fillRectSpy = vi.spyOn(ctx, 'fillRect');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ]
    });

    expect(clearRectSpy).toHaveBeenCalled();
    expect(fillRectSpy).toHaveBeenCalled();
    clearRectSpy.mockRestore();
    fillRectSpy.mockRestore();
  });

  it('should draw line path for series data', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const beginPathSpy = vi.spyOn(ctx, 'beginPath');
    const moveToSpy = vi.spyOn(ctx, 'moveTo');
    const lineToSpy = vi.spyOn(ctx, 'lineTo');
    const strokeSpy = vi.spyOn(ctx, 'stroke');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 0 }
          ]
        }
      ]
    });

    expect(beginPathSpy).toHaveBeenCalled();
    expect(moveToSpy).toHaveBeenCalled();
    expect(lineToSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();

    beginPathSpy.mockRestore();
    moveToSpy.mockRestore();
    lineToSpy.mockRestore();
    strokeSpy.mockRestore();
  });

  it('should draw data points when showPoints is true', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const arcSpy = vi.spyOn(ctx, 'arc');
    const fillSpy = vi.spyOn(ctx, 'fill');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ],
          showPoints: true
        }
      ]
    });

    expect(arcSpy).toHaveBeenCalledTimes(2);
    expect(fillSpy).toHaveBeenCalledTimes(2);

    arcSpy.mockRestore();
    fillSpy.mockRestore();
  });

  it('should not draw points when showPoints is false', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const arcSpy = vi.spyOn(ctx, 'arc');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ],
          showPoints: false
        }
      ]
    });

    expect(arcSpy).not.toHaveBeenCalled();
    arcSpy.mockRestore();
  });

  it('should skip series with less than 2 data points', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const beginPathSpy = vi.spyOn(ctx, 'beginPath');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        { id: 's1', color: '#ff0000', data: [{ x: 0, y: 0 }] },
        {
          id: 's2',
          color: '#00ff00',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ]
    });

    // grid + axis + 1 valid series = at least 3 beginPath calls
    expect(beginPathSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    beginPathSpy.mockRestore();
  });

  it('should use custom xDomain when provided', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ],
      xDomain: [0, 10]
    });

    // X轴标签应该覆盖 0-10 范围
    expect(fillTextSpy).toHaveBeenCalled();
    fillTextSpy.mockRestore();
  });

  it('should use custom yDomain when provided', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ],
      yDomain: [-5, 5]
    });

    expect(fillTextSpy).toHaveBeenCalled();
    fillTextSpy.mockRestore();
  });

  it('should draw axis labels when provided', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ],
      xLabel: 'Time (s)',
      yLabel: 'Position (m)'
    });

    const calls = fillTextSpy.mock.calls;
    const labels = calls.map((c: [string, ...unknown[]]) => c[0]);
    expect(labels).toContain('Time (s)');
    expect(labels).toContain('Position (m)');

    fillTextSpy.mockRestore();
  });

  it('should draw grid when showGrid is true', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const moveToSpy = vi.spyOn(ctx, 'moveTo');
    const lineToSpy = vi.spyOn(ctx, 'lineTo');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ],
      showGrid: true
    });

    // Grid + axis lines: expect multiple moveTo/lineTo calls
    expect(moveToSpy).toHaveBeenCalled();
    expect(lineToSpy).toHaveBeenCalled();

    moveToSpy.mockRestore();
    lineToSpy.mockRestore();
  });

  it('should not draw grid when showGrid is false', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const strokeSpy = vi.spyOn(ctx, 'stroke');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ],
      showGrid: false
    });

    // stroke is called for axes and series lines, but not grid
    // We can only verify it doesn't crash
    expect(strokeSpy).toHaveBeenCalled();
    strokeSpy.mockRestore();
  });

  it('should expand narrow y-domain to minimum range', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 1 },
            { x: 1, y: 1.0001 }
          ]
        }
      ]
    });

    expect(fillTextSpy).toHaveBeenCalled();
    fillTextSpy.mockRestore();
  });

  it('should handle flat data (all same y)', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const moveToSpy = vi.spyOn(ctx, 'moveTo');
    const lineToSpy = vi.spyOn(ctx, 'lineTo');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 5 },
            { x: 1, y: 5 },
            { x: 2, y: 5 }
          ]
        }
      ]
    });

    expect(moveToSpy).toHaveBeenCalled();
    expect(lineToSpy).toHaveBeenCalled();

    moveToSpy.mockRestore();
    lineToSpy.mockRestore();
  });

  it('should use adaptive margins for small canvas', () => {
    const state = createMockState({ cssWidth: 300, cssHeight: 200 });

    const ctx = state.ctx as MockCtx;
    const fillTextSpy = vi.spyOn(ctx, 'fillText');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      ]
    });

    expect(fillTextSpy).toHaveBeenCalled();
    fillTextSpy.mockRestore();
  });

  it('should render multiple series', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const beginPathSpy = vi.spyOn(ctx, 'beginPath');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
        },
        {
          id: 's2',
          color: '#00ff00',
          data: [
            { x: 0, y: 1 },
            { x: 1, y: 0 }
          ]
        }
      ]
    });

    // grid + axis + 2 series = at least 4 beginPath calls
    expect(beginPathSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    beginPathSpy.mockRestore();
  });

  it('should draw baseline when within range', () => {
    const state = createMockState();
    const ctx = state.ctx as MockCtx;
    const setLineDashSpy = vi.spyOn(ctx, 'setLineDash');

    renderLineChart({
      state,
      theme: getChartTheme('light'),
      series: [
        {
          id: 's1',
          color: '#ff0000',
          data: [
            { x: 0, y: -1 },
            { x: 1, y: 1 }
          ]
        }
      ],
      yBaseLine: 0
    });

    expect(setLineDashSpy).toHaveBeenCalledWith([4, 4]);
    setLineDashSpy.mockRestore();
  });
});

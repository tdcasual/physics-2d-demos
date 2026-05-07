import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockRegistryEntry = {
  id: string;
  title: string;
  category: string;
  description: string;
  defaultParams: Record<string, unknown>;
  loadFactory: () => Promise<{
    meta: {
      id: string;
      title: string;
      category: string;
      description: string;
      unit?: string;
      precision?: number;
    };
    createSim: () => {
      getState: () => { currentReading: number; zeroOffset: number };
      reset: () => void;
      setParams: (params: Record<string, unknown>) => void;
      step: (dt: number) => void;
    };
    createView: () => {
      dispose: () => void;
      render: (state: { currentReading: number; zeroOffset: number }) => void;
      resize: () => void;
      setTheme: (theme: 'light' | 'dark') => void;
      setViewport: (viewport: { x: number; y: number; width: number; height: number }) => void;
    };
  }>;
};

const registryState = vi.hoisted(() => ({
  registry: [] as MockRegistryEntry[],
  grouped: {} as Record<string, MockRegistryEntry[]>,
  categoryLabel: '测量仪器'
}));

const sizeCanvasToFillMock = vi.hoisted(() => vi.fn(() => ({}) as CanvasRenderingContext2D));

vi.mock('../../src/instruments/instrument-registry', () => ({
  buildInstrumentRegistry: () => registryState.registry,
  buildRegistryByCategory: () => registryState.grouped,
  getCategoryLabel: () => registryState.categoryLabel
}));

vi.mock('../../src/core/canvas-sizing', () => ({
  sizeCanvasToFill: sizeCanvasToFillMock
}));

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  registryState.registry = [];
  registryState.grouped = {};
  registryState.categoryLabel = '测量仪器';
  sizeCanvasToFillMock.mockClear();

  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

describe('instrument-library', () => {
  it('renders an empty state when no instruments are registered', async () => {
    const { bootInstrumentLibrary } = await import(
      '../../src/app/instrument-library/instrument-library'
    );

    const dispose = bootInstrumentLibrary();

    expect(document.body.textContent).toContain('暂无仪器组件');
    expect(document.body.textContent).toContain('选择左侧仪器查看详情');
    expect(document.body.textContent).toContain('无参数可编辑');

    dispose();
  });

  it('loads a selected instrument and renders metadata plus params', async () => {
    const setParams = vi.fn();
    const reset = vi.fn();
    const resize = vi.fn();
    const render = vi.fn();
    const disposeView = vi.fn();

    registryState.registry = [
      {
        id: 'micrometer-eyepiece',
        title: '高精度干涉测微仪',
        category: 'measurement',
        description: '测试仪器',
        defaultParams: {
          initialReading: 0.3,
          stripeColor: 'rgba(200, 80, 20, 0.4)'
        },
        loadFactory: async () => ({
          meta: {
            id: 'micrometer-eyepiece',
            title: '高精度干涉测微仪',
            category: 'measurement',
            description: '测试仪器',
            unit: 'mm',
            precision: 0.01
          },
          createSim: () => ({
            getState: () => ({ currentReading: 0.3, zeroOffset: 0 }),
            reset,
            setParams,
            step: vi.fn()
          }),
          createView: () => ({
            dispose: disposeView,
            render,
            resize,
            setTheme: vi.fn(),
            setViewport: vi.fn()
          })
        })
      }
    ];
    registryState.grouped = {
      measurement: registryState.registry
    };

    const { bootInstrumentLibrary } = await import(
      '../../src/app/instrument-library/instrument-library'
    );

    const teardown = bootInstrumentLibrary();
    const button = Array.from(document.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('高精度干涉测微仪')
    );

    expect(button).toBeTruthy();
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(sizeCanvasToFillMock).toHaveBeenCalled();
    expect(resize).toHaveBeenCalled();
    expect(document.body.textContent).toContain('高精度干涉测微仪');
    expect(document.body.textContent).toContain('参数调节');

    const range = document.querySelector('input[type="range"]');
    expect(range).not.toBeNull();
    range?.dispatchEvent(new Event('input', { bubbles: true }));
    expect(setParams).toHaveBeenCalled();

    const resetButton = Array.from(document.querySelectorAll('button')).find(
      (node) => node.textContent === '重置参数'
    );
    expect(resetButton).toBeTruthy();
    resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(reset).toHaveBeenCalled();

    teardown();
    expect(disposeView).toHaveBeenCalled();
  });
});

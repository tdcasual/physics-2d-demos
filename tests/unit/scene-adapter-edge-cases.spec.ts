/**
 * SceneAdapter 边界/异常注入测试
 *
 * 覆盖：double renderAnimation、unmount 后调用方法、state flags 重置
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SceneAdapter } from '../../src/app/scene-adapter';
import type { ScenePageOptions } from '../../src/app/scene-bootstrapper-types';
import type { LayoutSlots } from '../../src/app/layouts/types';

function createMockScene() {
  return {
    init: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    setTheme: vi.fn(),
    setMode: vi.fn(),
    startAll: vi.fn(),
    pauseAll: vi.fn(),
    setTimeScale: vi.fn(),
    getState: vi.fn(() => ({})),
    subscribe: vi.fn(() => vi.fn())
  };
}

function createAdapter(options?: Partial<ScenePageOptions>): SceneAdapter {
  return new SceneAdapter({
    meta: {
      id: 'test',
      title: '测试',
      category: 'mechanics',
      subject: 'test',
      concept: 'test',
      subConcepts: ['a', 'b'] as [string, string],
      keywords: [],
      objective: '',
      defaultParams: {},
      path: '/test'
    },
    createScene: () => createMockScene() as never,
    ...options
  } as ScenePageOptions);
}

function mountAdapter(adapter: SceneAdapter): {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
} {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);

  adapter.renderAnimation(container, {
    animation: container,
    control: container
  } as LayoutSlots);

  return { container, canvas };
}

describe('SceneAdapter edge cases', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
  });

  afterEach(() => {
    appDiv.remove();
    vi.clearAllMocks();
  });

  it('second renderAnimation reattaches without dispose or createScene', () => {
    const scene1 = createMockScene();
    let callCount = 0;
    const adapter = createAdapter({
      createScene: () => {
        callCount++;
        return scene1 as never;
      }
    });

    mountAdapter(adapter);
    adapter.startAll();
    const next = document.createElement('div');
    const canvas2 = document.createElement('canvas');
    canvas2.className = 'stage-canvas';
    next.appendChild(canvas2);
    adapter.renderAnimation(next, {
      animation: next,
      control: next
    } as LayoutSlots);

    expect(scene1.dispose).not.toHaveBeenCalled();
    expect(callCount).toBe(1);
    expect(scene1.resize).toHaveBeenCalled();
    expect(scene1.render).toHaveBeenCalled();
    expect(adapter.getTransportState().isPlaying).toBe(true);
  });

  it('pauses shell when scene getTransportState reports stopped', () => {
    const listeners: Array<() => void> = [];
    const scene = {
      ...createMockScene(),
      getTransportState: vi.fn(() => ({ isPlaying: true, speed: 1 })),
      subscribe: vi.fn((listener: () => void) => {
        listeners.push(listener);
        return () => undefined;
      })
    };
    const adapter = createAdapter({
      createScene: () => scene as never
    });
    mountAdapter(adapter);
    adapter.startAll();
    expect(adapter.getTransportState().isPlaying).toBe(true);

    scene.getTransportState.mockReturnValue({ isPlaying: false, speed: 1 });
    listeners.forEach((fn) => fn());
    expect(adapter.getTransportState().isPlaying).toBe(false);
    expect(scene.pauseAll).toHaveBeenCalled();
  });

  it('unmount should reset state flags for re-mount', () => {
    const adapter = createAdapter();
    const { container: c1 } = mountAdapter(adapter);
    adapter.unmount();

    // Re-mount should work — flags are reset
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    c1.appendChild(canvas);
    expect(() => {
      adapter.renderAnimation(c1, {
        animation: c1,
        control: c1
      } as LayoutSlots);
    }).not.toThrow();
  });

  it('methods after unmount should be safe no-ops', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    mountAdapter(adapter);
    adapter.unmount();

    // None of these should throw
    expect(() => adapter.startAll()).not.toThrow();
    expect(() => adapter.pauseAll()).not.toThrow();
    expect(() => adapter.reset()).not.toThrow();
    expect(() => adapter.setTheme('dark')).not.toThrow();
    expect(() => adapter.setMode('presentation')).not.toThrow();
    expect(() => adapter.setTimeScale(2)).not.toThrow();
    expect(() => adapter.getTransportState()).not.toThrow();
    expect(() => adapter.getReadoutItems()).not.toThrow();
  });

  it('getTransportState after unmount should return defaults', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const state = adapter.getTransportState();
    expect(state).toEqual({ isPlaying: false, speed: 1 });
  });

  it('getReadoutItems after unmount should return empty array', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const items = adapter.getReadoutItems();
    expect(items).toEqual([]);
  });

  it('startAll/pauseAll before renderAnimation should be safe no-ops', () => {
    const adapter = createAdapter();
    expect(() => adapter.startAll()).not.toThrow();
    expect(() => adapter.pauseAll()).not.toThrow();
    expect(() => adapter.reset()).not.toThrow();
  });

  it('subscribe after unmount should still return unsubscribe function', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const listener = vi.fn();
    const unsub = adapter.subscribe(listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('renderGraph before renderAnimation should be safe', () => {
    const adapter = createAdapter();
    const container = document.createElement('div');
    expect(() => adapter.renderGraph(container)).not.toThrow();
    // Should not render anything without a scene
    expect(container.innerHTML).toBe('');
  });

  it('resizes attached graph canvases when a hidden graph slot becomes visible', async () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const callbacks: ResizeObserverCallback[] = [];
    const observed: Element[] = [];
    const disconnect = vi.fn();

    globalThis.ResizeObserver = class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback);
      }

      observe(target: Element): void {
        observed.push(target);
      }
      unobserve(): void {}
      disconnect(): void {
        disconnect();
      }
    };

    try {
      const scene = {
        ...createMockScene(),
        attachGraphCanvas: vi.fn()
      };
      const adapter = createAdapter({ createScene: () => scene as never });
      mountAdapter(adapter);
      const graphContainer = document.createElement('div');

      adapter.renderGraph(graphContainer);
      expect(observed).toContain(graphContainer);
      scene.resize.mockClear();
      scene.render.mockClear();

      const graphObserver = callbacks.at(-1);
      expect(graphObserver).toBeDefined();
      graphObserver?.(
        [{ contentRect: { width: 300, height: 120 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );

      // 0→非 0 的可见性跃迁立即 resize（不走 rAF 合帧，避免 hidden tab
      // 里的 1×1 canvas 在可见后仍保持旧尺寸数帧）
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      expect(scene.resize).toHaveBeenCalledOnce();
      expect(scene.render).toHaveBeenCalledOnce();

      adapter.unmount();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });

  it('renderControl before renderAnimation should defer', () => {
    const createControls = vi.fn(() => ({ dispose: vi.fn() }));
    const scene = createMockScene();
    const adapter = createAdapter({
      createScene: () => scene as never,
      createControls
    });
    const controlContainer = document.createElement('div');
    adapter.renderControl(controlContainer);

    // Controls not created yet
    expect(createControls).not.toHaveBeenCalled();

    // After renderAnimation, controls should be created
    const animationContainer = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    animationContainer.appendChild(canvas);
    adapter.renderAnimation(animationContainer, {
      animation: animationContainer,
      control: controlContainer
    } as LayoutSlots);

    expect(createControls).toHaveBeenCalled();
  });
});

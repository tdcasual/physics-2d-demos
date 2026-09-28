import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SceneAdapter,
  bootScenePage,
  type ScenePageOptions
} from '../../src/app/scene-bootstrapper';
import type { LayoutSlots } from '../../src/app/layouts/types';
import type { StandardSceneCreateParams } from '../../src/app/scene-bootstrapper-types';
import { layoutRegistry } from '../../src/app/layouts/registry';

// Mock createSceneContainer to avoid heavy DOM layout logic
vi.mock('../../src/app/layouts/container', () => ({
  createSceneContainer: vi.fn(() => ({
    setScene: vi.fn().mockResolvedValue(undefined),
    setTheme: vi.fn(),
    on: vi.fn(() => vi.fn()),
    currentLayout: null,
    updateStatus: vi.fn()
  }))
}));

import { createSceneContainer } from '../../src/app/layouts/container';

type MockFn = ReturnType<typeof vi.fn>;

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
    subscribe: vi.fn(() => vi.fn()) as MockFn & {
      mock: { calls: [listener: () => void][] };
    }
  };
}

describe('SceneAdapter', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
  });

  afterEach(() => {
    appDiv.remove();
    vi.clearAllMocks();
    layoutRegistry.clear();
  });

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

  it('should store id and preferredLayout from options', () => {
    const adapter = createAdapter({ preferredLayout: 'mobile-stack' });
    expect(adapter.id).toBe('test');
    expect(adapter.preferredLayout).toBe('mobile-stack');
  });

  it('renderAnimation should find canvas and create scene', () => {
    const adapter = createAdapter();
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    // Scene should be created and initialized
    // We verify by checking renderAnimation succeeded without error
    expect(container.querySelector('.stage-canvas')).toBe(canvas);
  });

  it('renderAnimation supports a non-canvas render surface (no canvas → uses container)', () => {
    let received: StandardSceneCreateParams | undefined;
    const createScene = vi.fn((params: StandardSceneCreateParams) => {
      received = params;
      return createMockScene() as never;
    });
    const adapter = createAdapter({ createScene } as Partial<ScenePageOptions>);
    const container = document.createElement('div');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    // 不再因缺少 canvas 报错，而是把容器作为渲染面创建场景
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(createScene).toHaveBeenCalledTimes(1);
    expect(received?.container).toBe(container);
    expect(received?.canvas).toBeUndefined();
    // 非 canvas 渲染面被标注为图像
    expect(container.getAttribute('role')).toBe('img');
    consoleSpy.mockRestore();
  });

  it('renderControl should defer if scene not ready', () => {
    const adapter = createAdapter();
    const container = document.createElement('div');
    adapter.renderControl(container);
    // Deferred; controls should be created after renderAnimation
    expect(adapter).toBeDefined();
  });

  it('renderControl should do nothing if createControls not provided', () => {
    const adapter = new SceneAdapter({
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
      createScene: () => createMockScene() as never
    });
    const container = document.createElement('div');
    // Should not throw
    expect(() => adapter.renderControl(container)).not.toThrow();
  });

  it('setMode should propagate to scene', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.setMode('presentation');

    expect(scene.setMode).toHaveBeenCalledWith('presentation');
    expect(scene.resize).toHaveBeenCalled();
    expect(scene.render).toHaveBeenCalled();
  });

  it('setTheme should propagate to scene', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.setTheme('dark');

    expect(scene.setTheme).toHaveBeenCalledWith('dark');
    expect(scene.render).toHaveBeenCalled();
  });

  it('startAll should call transport play and scene startAll', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.startAll();

    expect(scene.startAll).toHaveBeenCalled();
  });

  it('pauseAll should call transport pause and scene pauseAll', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.pauseAll();

    expect(scene.pauseAll).toHaveBeenCalled();
  });

  it('space key toggles through startAll/pauseAll (keeps scene hooks in sync)', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    const pressSpace = () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true
        })
      );

    pressSpace();
    expect(scene.startAll).toHaveBeenCalledTimes(1);
    expect(adapter.getTransportState().isPlaying).toBe(true);

    pressSpace();
    expect(scene.pauseAll).toHaveBeenCalledTimes(1);
    expect(adapter.getTransportState().isPlaying).toBe(false);

    adapter.unmount();
  });

  it('keyboard r goes through adapter.reset so controls project', () => {
    const scene = {
      ...createMockScene(),
      getParams: vi.fn(() => ({ speed: 12 }))
    };
    const setValueSilently = vi.fn();
    const adapter = createAdapter({
      createScene: () => scene as never,
      createControls: () => ({
        fieldTypes: new Map([['speed', 'slider']]),
        setValueSilently,
        dispose: () => {}
      })
    } as Partial<ScenePageOptions>);
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);
    const controls = document.createElement('div');

    adapter.renderAnimation(container, {
      animation: container,
      control: controls
    } as LayoutSlots);
    adapter.renderControl(controls);

    const resetSpy = vi.spyOn(adapter, 'reset');
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'r',
        bubbles: true,
        cancelable: true
      })
    );

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(scene.reset).toHaveBeenCalled();
    expect(scene.render).toHaveBeenCalled();
    expect(setValueSilently).toHaveBeenCalledWith('speed', 12);

    adapter.unmount();
  });

  it('autoPlay starts through startAll (scene hooks included)', () => {
    const scene = createMockScene();
    const adapter = createAdapter({
      createScene: () => scene as never,
      autoPlay: true
    } as Partial<ScenePageOptions>);
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    expect(scene.startAll).toHaveBeenCalledTimes(1);
    expect(adapter.getTransportState().isPlaying).toBe(true);

    adapter.unmount();
  });

  it('shouldAutoPlay skips startAll when restored autoRun=0', () => {
    window.history.replaceState({}, '', '/src/pages/test.html?autoRun=0');
    const scene = {
      ...createMockScene(),
      getParams: vi.fn(() => ({ autoRun: 0 }))
    };
    const adapter = createAdapter({
      meta: {
        id: 'test',
        title: '测试',
        category: 'mechanics',
        subject: 'test',
        concept: 'test',
        subConcepts: ['a', 'b'] as [string, string],
        keywords: [],
        objective: '',
        defaultParams: { autoRun: 1 },
        urlSyncKeys: ['autoRun'],
        path: '/test'
      },
      createScene: () => scene as never,
      shouldAutoPlay: (_params, urlParams) =>
        urlParams.autoRun === undefined ? true : Number(urlParams.autoRun) !== 0
    } as Partial<ScenePageOptions>);
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    expect(scene.startAll).not.toHaveBeenCalled();
    adapter.unmount();
    window.history.replaceState({}, '', '/');
  });

  it('reset should call transport reset and scene reset', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.reset();

    expect(scene.reset).toHaveBeenCalled();
    expect(scene.render).toHaveBeenCalled();
  });

  it('setTimeScale should propagate to scene', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.setTimeScale(2);

    expect(scene.setTimeScale).toHaveBeenCalledWith(2);
  });

  it('getTransportState should return default when no transport', () => {
    const adapter = createAdapter();
    expect(adapter.getTransportState()).toEqual({ isPlaying: false, speed: 1 });
  });

  it('getReadoutItems should return empty array by default', () => {
    const adapter = createAdapter();
    expect(adapter.getReadoutItems()).toEqual([]);
  });

  it('subscribe and unsubscribe should work', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);

    // Trigger subscription by calling scene's subscribe callback
    const sceneSubscribeCallback = vi.mocked(scene.subscribe).mock.calls[0][0];
    sceneSubscribeCallback();
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    sceneSubscribeCallback();
    expect(listener).not.toHaveBeenCalled();
  });

  it('unmount should dispose scene and lifecycle', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    adapter.unmount();

    expect(scene.dispose).toHaveBeenCalled();
  });

  it('renderGraph should attach graph canvas when scene supports it', () => {
    const scene = {
      ...createMockScene(),
      attachGraphCanvas: vi.fn()
    };
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);

    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    const graphContainer = document.createElement('div');
    adapter.renderGraph(graphContainer);

    expect(scene.attachGraphCanvas).toHaveBeenCalled();
    expect(graphContainer.querySelector('canvas')).toBeTruthy();
  });

  it('renderGraph should do nothing when scene does not support attachGraphCanvas', () => {
    const adapter = createAdapter();
    const container = document.createElement('div');
    adapter.renderGraph(container);
    expect(container.innerHTML).toBe('');
  });

  it('getReadoutItems should use formatReadout when scene provides getState', () => {
    const scene = createMockScene();
    const formatReadout = vi.fn((state) => [
      { label: 'Val', value: String(state.val) }
    ]);
    const adapter = new SceneAdapter({
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
      createScene: () => scene as never,
      formatReadout
    });

    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);
    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    scene.getState.mockReturnValue({ val: 42 });
    expect(adapter.getReadoutItems()).toEqual([{ label: 'Val', value: '42' }]);
    expect(formatReadout).toHaveBeenCalledWith({ val: 42 });
  });

  it('getReadoutItems should use scene.getReadoutItems when available', () => {
    const scene = {
      ...createMockScene(),
      getReadoutItems: vi.fn(() => [{ label: 'Speed', value: '10 m/s' }])
    };
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);
    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    expect(adapter.getReadoutItems()).toEqual([
      { label: 'Speed', value: '10 m/s' }
    ]);
  });

  it('getTransportState should use scene.getTransportState when available', () => {
    const scene = {
      ...createMockScene(),
      getTransportState: vi.fn(() => ({ isPlaying: true, speed: 2 }))
    };
    const adapter = createAdapter({ createScene: () => scene as never });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    container.appendChild(canvas);
    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);
    expect(adapter.getTransportState()).toEqual({ isPlaying: true, speed: 2 });
  });
});

describe('bootScenePage', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    appDiv.remove();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
    layoutRegistry.clear();
  });

  it('should throw when #app container is missing', () => {
    appDiv.remove();
    expect(() =>
      bootScenePage({
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
        createScene: () => createMockScene() as never
      })
    ).toThrow('Missing mount container: #app');
  });

  it('should create scene container with injected meta.title', () => {
    bootScenePage({
      meta: {
        id: 'test',
        title: '测试标题',
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
      preferredLayout: 'split-right',
      layoutConfig: { hasGraph: false }
    });

    expect(createSceneContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        mount: appDiv,
        defaultTheme: 'light',
        layoutConfig: expect.objectContaining({
          title: '测试标题',
          hasGraph: false
        })
      })
    );
  });

  it('should use default layout when preferredLayout not specified', () => {
    bootScenePage({
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
      createScene: () => createMockScene() as never
    });

    expect(createSceneContainer).toHaveBeenCalled();
  });

  it('should accept a registered layout override from the URL', () => {
    window.history.replaceState({}, '', '?layout=mobile-stack');

    bootScenePage({
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
      preferredLayout: 'split-right'
    });

    const mockContainer = vi.mocked(createSceneContainer).mock.results[0]
      .value as { setScene: MockFn };
    const adapter = mockContainer.setScene.mock.calls[0][0] as SceneAdapter;
    expect(adapter.preferredLayout).toBe('mobile-stack');
    window.history.replaceState({}, '', '/');
  });

  it('should ignore an unregistered layout override', () => {
    window.history.replaceState({}, '', '?layout=not-a-layout');

    bootScenePage({
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
      preferredLayout: 'split-right'
    });

    const mockContainer = vi.mocked(createSceneContainer).mock.results[0]
      .value as { setScene: MockFn };
    const adapter = mockContainer.setScene.mock.calls[0][0] as SceneAdapter;
    expect(adapter.preferredLayout).toBe('split-right');
    window.history.replaceState({}, '', '/');
  });

  it('should call container.setScene with adapter', () => {
    const mockSetScene = vi.fn().mockResolvedValue(undefined);
    const mockContainer = {
      setScene: mockSetScene,
      setTheme: vi.fn(),
      on: vi.fn(() => vi.fn()),
      currentLayout: null
    };
    (createSceneContainer as ReturnType<typeof vi.fn>).mockReturnValue(
      mockContainer
    );

    bootScenePage({
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
      createScene: () => createMockScene() as never
    });

    expect(mockSetScene).toHaveBeenCalledTimes(1);
    // Verify it's a SceneAdapter instance
    expect(mockSetScene.mock.calls[0][0]).toBeInstanceOf(SceneAdapter);
  });

  describe('theme resolution', () => {
    function boot() {
      bootScenePage({
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
        createScene: () => createMockScene() as never
      });
    }

    it('should fall back to light when nothing is stored (happy-dom prefers light)', () => {
      boot();
      expect(createSceneContainer).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTheme: 'light' })
      );
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should use the stored theme from theme-store', () => {
      localStorage.setItem(
        'physics-lab-theme',
        JSON.stringify({ v: 1, theme: 'dark' })
      );
      boot();
      expect(createSceneContainer).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTheme: 'dark' })
      );
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should migrate theme from legacy container state', () => {
      localStorage.setItem(
        'physics-demos-container-state',
        JSON.stringify({ v: 1, theme: 'dark' })
      );
      boot();
      expect(createSceneContainer).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTheme: 'dark' })
      );
    });

    it('should let ?theme= URL param win over stored theme', () => {
      localStorage.setItem(
        'physics-lab-theme',
        JSON.stringify({ v: 1, theme: 'dark' })
      );
      window.history.replaceState({}, '', '?theme=light');
      boot();
      expect(createSceneContainer).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTheme: 'light' })
      );
    });

    it('should persist container theme changes to theme-store', () => {
      let themeChangeHandler:
        | ((payload: { from: string; to: 'light' | 'dark' }) => void)
        | undefined;
      const mockContainer = {
        setScene: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn(),
        on: vi.fn((event: string, handler: never) => {
          if (event === 'theme:change') themeChangeHandler = handler;
          return vi.fn();
        }),
        currentLayout: null
      };
      (createSceneContainer as ReturnType<typeof vi.fn>).mockReturnValue(
        mockContainer
      );

      boot();
      expect(mockContainer.on).toHaveBeenCalledWith(
        'theme:change',
        expect.any(Function)
      );

      themeChangeHandler?.({ from: 'light', to: 'dark' });
      const raw = localStorage.getItem('physics-lab-theme');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual({ v: 1, theme: 'dark' });
    });

    it('should inject onToggleTheme that delegates to container.setTheme', () => {
      const mockContainer = {
        setScene: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn(),
        on: vi.fn(() => vi.fn()),
        currentLayout: null
      };
      (createSceneContainer as ReturnType<typeof vi.fn>).mockReturnValue(
        mockContainer
      );

      boot();

      const adapter = mockContainer.setScene.mock
        .calls[0][0] as unknown as SceneAdapter;
      const options = (
        adapter as unknown as {
          options: { onToggleTheme?: (next: 'light' | 'dark') => void };
        }
      ).options;
      expect(typeof options.onToggleTheme).toBe('function');
      options.onToggleTheme?.('dark');
      expect(mockContainer.setTheme).toHaveBeenCalledWith('dark');
    });
  });
});

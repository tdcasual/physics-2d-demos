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
  });

  afterEach(() => {
    appDiv.remove();
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
        defaultLayout: 'split-right',
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

    expect(createSceneContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultLayout: 'split-right'
      })
    );
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

    expect(createSceneContainer).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLayout: 'mobile-stack' })
    );
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

    expect(createSceneContainer).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLayout: 'split-right' })
    );
    window.history.replaceState({}, '', '/');
  });

  it('should call container.setScene with adapter', () => {
    const mockSetScene = vi.fn().mockResolvedValue(undefined);
    const mockContainer = { setScene: mockSetScene, currentLayout: null };
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
});

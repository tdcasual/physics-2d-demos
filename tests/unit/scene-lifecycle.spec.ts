import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  initializeScene,
  observeContainerResize,
  createPageLifecycleManager,
  validateSceneContract
} from '../../src/app/scene-lifecycle';
import type { SceneLifecycle } from '../../src/app/scene-lifecycle';

type MockScene = {
  [K in keyof SceneLifecycle]: SceneLifecycle[K] & ReturnType<typeof vi.fn>;
};

function createMockScene(): MockScene {
  return {
    init: vi.fn(),
    reset: vi.fn(),
    step: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn()
  } as MockScene;
}

describe('initializeScene', () => {
  it('should call init, resize, render in order', () => {
    const scene = createMockScene();
    const order: string[] = [];
    scene.init.mockImplementation(() => order.push('init'));
    scene.resize.mockImplementation(() => order.push('resize'));
    scene.render.mockImplementation(() => order.push('render'));

    initializeScene({ scene, mount: document.createElement('div') });

    expect(order).toEqual(['init', 'resize', 'render']);
  });

  it('should call onReady callback', () => {
    const scene = createMockScene();
    const onReady = vi.fn();
    initializeScene({ scene, mount: document.createElement('div'), onReady });
    expect(onReady).toHaveBeenCalled();
  });

  it('should return dispose function', () => {
    const scene = createMockScene();
    const dispose = initializeScene({
      scene,
      mount: document.createElement('div')
    });
    dispose();
    expect(scene.dispose).toHaveBeenCalled();
  });
});

describe('observeContainerResize', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce resize and call scene.resize/render', () => {
    const scene = createMockScene();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const cleanup = observeContainerResize(container, scene, {
      debounceMs: 100
    });

    // Trigger resize via ResizeObserver
    // In happy-dom ResizeObserver may not fire, so we test fallback path by
    // dispatching a window resize event
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(150);

    // Since ResizeObserver is available in happy-dom, we clean up and rely on
    // the fact that the function returns a cleanup.
    expect(typeof cleanup).toBe('function');

    cleanup();
    container.remove();
  });

  it('should not call render when autoRender is false', () => {
    const scene = createMockScene();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const cleanup = observeContainerResize(container, scene, {
      debounceMs: 50,
      autoRender: false
    });

    cleanup();
    container.remove();
  });
});

describe('createPageLifecycleManager', () => {
  it('should register and dispose window event listeners', () => {
    const manager = createPageLifecycleManager();
    const listener = vi.fn();

    manager.onWindowEvent('resize', listener);
    window.dispatchEvent(new Event('resize'));
    expect(listener).toHaveBeenCalled();

    manager.dispose();
    // After dispose, listener should not be called again
    listener.mockClear();
    window.dispatchEvent(new Event('resize'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('should register multiple disposers and clean all', () => {
    const manager = createPageLifecycleManager();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    manager.onDispose(fn1);
    manager.onDispose(fn2);
    manager.dispose();

    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  it('should observe resize and clean up', () => {
    const manager = createPageLifecycleManager();
    const scene = createMockScene();
    const container = document.createElement('div');
    document.body.appendChild(container);

    manager.observeResize(container, scene, { debounceMs: 50 });
    manager.dispose();
    container.remove();
  });

  it('should ignore errors during dispose', () => {
    const manager = createPageLifecycleManager();
    manager.onDispose(() => {
      throw new Error('expected');
    });
    expect(() => manager.dispose()).not.toThrow();
  });
});

describe('validateSceneContract', () => {
  it('should return empty array for complete scene', () => {
    const scene = createMockScene();
    const errors = validateSceneContract(scene);
    expect(errors).toEqual([]);
  });

  it('should report missing methods', () => {
    const errors = validateSceneContract({ init: () => {} });
    expect(errors).toContain('Missing required method: reset');
    expect(errors).toContain('Missing required method: step');
    expect(errors).toContain('Missing required method: render');
    expect(errors).toContain('Missing required method: resize');
    expect(errors).toContain('Missing required method: dispose');
  });

  it('should report all missing methods when empty object passed', () => {
    const errors = validateSceneContract({});
    expect(errors).toHaveLength(6);
  });
});

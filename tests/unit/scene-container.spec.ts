import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SceneContainerImpl,
  createSceneContainer
} from '../../src/app/layouts/container';
import type { Scene } from '../../src/app/layouts/types';

// Mock layout registry
vi.mock('../../src/app/layouts/registry', () => ({
  layoutRegistry: {
    has: vi.fn(() => true),
    create: vi.fn((id: string) => ({
      id,
      mount: vi.fn().mockResolvedValue(undefined),
      unmount: vi.fn().mockResolvedValue(undefined),
      enter: vi.fn().mockResolvedValue(undefined),
      exit: vi.fn().mockResolvedValue(undefined),
      setTheme: vi.fn(),
      handleResize: vi.fn(),
      getSlots: vi.fn(() => ({
        header: document.createElement('div'),
        control: document.createElement('div'),
        animation: document.createElement('div'),
        graph: document.createElement('div'),
        readout: document.createElement('div')
      }))
    })),
    getAllMetadata: vi.fn(() => [])
  },
  saveLayoutPreference: vi.fn()
}));

// Mock layout selector
vi.mock('../../src/app/layouts/selector', () => ({
  layoutSelector: {
    select: vi.fn(() => 'split-right')
  }
}));

describe('SceneContainerImpl', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
    mount.style.width = '1200px';
    mount.style.height = '800px';
    document.body.appendChild(mount);
    localStorage.clear();
  });

  afterEach(() => {
    mount.remove();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create container with default theme', () => {
    const container = createSceneContainer({ mount });

    expect(container.getTheme()).toBe('light');
    expect(mount.style.width).toBe('100%');
  });

  it('should create container with custom theme', () => {
    const container = createSceneContainer({ mount, defaultTheme: 'dark' });

    expect(container.getTheme()).toBe('dark');
  });

  it('should set and get theme', () => {
    const container = createSceneContainer({ mount });

    container.setTheme('dark');
    expect(container.getTheme()).toBe('dark');

    container.setTheme('light');
    expect(container.getTheme()).toBe('light');
  });

  it('should not change theme if same', () => {
    const container = createSceneContainer({ mount, defaultTheme: 'dark' });
    const eventSpy = vi.fn();
    container.on('theme:change', eventSpy);

    container.setTheme('dark');
    expect(eventSpy).not.toHaveBeenCalled();
  });

  it('should emit theme change event', () => {
    const container = createSceneContainer({ mount });
    const eventSpy = vi.fn();
    container.on('theme:change', eventSpy);

    container.setTheme('dark');
    expect(eventSpy).toHaveBeenCalledWith({ from: 'light', to: 'dark' });
  });

  it('should persist state to localStorage', () => {
    const container = createSceneContainer({ mount, storageKey: 'test-state' });

    container.setTheme('dark');

    const saved = localStorage.getItem('test-state');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.theme).toBe('dark');
  });

  it('should restore persisted state', () => {
    localStorage.setItem(
      'test-state',
      JSON.stringify({
        v: 1,
        theme: 'dark',
        preferredLayout: 'split-right'
      })
    );

    const container = createSceneContainer({ mount, storageKey: 'test-state' });
    expect(container.getTheme()).toBe('dark');
  });

  it('should set and get user preferred layout', () => {
    const container = createSceneContainer({ mount });

    container.setUserPreferredLayout('mobile-stack');
    expect(container.getUserPreferredLayout()).toBe('mobile-stack');
  });

  it('should support event subscription and unsubscription', () => {
    const container = createSceneContainer({ mount });
    const listener = vi.fn();

    const unsubscribe = container.on('theme:change', listener);
    container.setTheme('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    container.setTheme('light');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should dispose without throwing', () => {
    const container = createSceneContainer({ mount });
    expect(() => container.dispose()).not.toThrow();
  });

  it('should create layout instance on switchLayout', async () => {
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({ mount });

    await container.switchLayout('split-right', { animate: false });

    expect(layoutRegistry.create).toHaveBeenCalledWith(
      'split-right',
      mount,
      expect.objectContaining({ theme: 'light' })
    );
  });

  it('should throw when switching to unknown layout', async () => {
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    vi.mocked(layoutRegistry.has).mockReturnValueOnce(false);

    const container = createSceneContainer({ mount });
    await expect(container.switchLayout('unknown')).rejects.toThrow(
      'Layout "unknown" not found'
    );
  });

  it('should not switch to same layout', async () => {
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({ mount });

    await container.switchLayout('split-right', { animate: false });
    vi.clearAllMocks();

    await container.switchLayout('split-right');
    expect(layoutRegistry.create).not.toHaveBeenCalled();
  });

  it('should emit layout change event', async () => {
    const container = createSceneContainer({ mount });
    const listener = vi.fn();
    container.on('layout:change', listener);

    await container.switchLayout('split-right', { animate: false });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'split-right',
        reason: 'manual'
      })
    );
  });

  it('should save layout preference when requested', async () => {
    const { saveLayoutPreference } =
      await import('../../src/app/layouts/registry');
    const container = createSceneContainer({ mount });

    await container.switchLayout('split-right', {
      animate: false,
      savePreference: true
    });
    expect(saveLayoutPreference).toHaveBeenCalledWith('split-right');
  });

  it('should restore scene state from localStorage', () => {
    localStorage.setItem(
      'test-state-scene-projectile',
      JSON.stringify({
        v: 1,
        state: { angle: 45, speed: 10 }
      })
    );

    const container = new SceneContainerImpl({
      mount,
      storageKey: 'test-state'
    });
    const state = (
      container as unknown as {
        restoreSceneState: (id: string) => object | null;
      }
    ).restoreSceneState('projectile');

    expect(state).toEqual({ angle: 45, speed: 10 });
  });

  it('should set scene and mount it', async () => {
    const container = createSceneContainer({ mount });

    const mockScene = {
      id: 'test-scene',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      renderHeader: vi.fn(),
      renderGraph: vi.fn(),
      renderReadout: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      saveState: vi.fn(() => ({ test: true })),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene);

    expect(container.currentScene).toBe(mockScene);
    expect(mockScene.renderAnimation).toHaveBeenCalled();
    expect(mockScene.mount).toHaveBeenCalled();

    container.dispose();
  });

  it('should handle event listener errors gracefully', () => {
    const container = createSceneContainer({ mount });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    container.on('theme:change', () => {
      throw new Error('listener error');
    });

    container.setTheme('dark');

    expect(errorSpy).toHaveBeenCalledWith(
      '[SceneContainer] Event handler error for theme:change:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
    container.dispose();
  });

  it('should clear layout switch timer on dispose', async () => {
    const container = createSceneContainer({ mount });
    await container.switchLayout('split-right', { animate: false });
    expect(() => container.dispose()).not.toThrow();
  });

  it('should unmount current scene when setting new scene', async () => {
    const container = createSceneContainer({ mount });

    const mockScene1 = {
      id: 'scene-1',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      saveState: vi.fn(() => null),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    const mockScene2 = {
      id: 'scene-2',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      saveState: vi.fn(() => null),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene1);
    await container.setScene(mockScene2);

    expect(mockScene1.unmount).toHaveBeenCalled();
    expect(container.currentScene).toBe(mockScene2);

    container.dispose();
  });

  it('should emit scene:mount event when setting scene', async () => {
    const container = createSceneContainer({ mount });
    const listener = vi.fn();
    container.on('scene:mount', listener);

    const mockScene = {
      id: 'test-scene',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      saveState: vi.fn(() => null),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene);

    expect(listener).toHaveBeenCalledWith({ sceneId: 'test-scene' });

    container.dispose();
  });

  it('should restore scene state on mount if available', async () => {
    localStorage.setItem(
      'physics-demos-container-state-scene-test-scene',
      JSON.stringify({ v: 1, state: { angle: 45 } })
    );

    const container = createSceneContainer({ mount });
    const restoreState = vi.fn();

    const mockScene = {
      id: 'test-scene',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      restoreState,
      saveState: vi.fn(() => null),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene);

    expect(restoreState).toHaveBeenCalledWith({ angle: 45 });

    container.dispose();
  });
});

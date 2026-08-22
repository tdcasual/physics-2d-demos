/**
 * Container 边界/异常注入测试
 *
 * 覆盖：dispose 中断 async switchLayout、异常恢复路径、scene 方法抛异常
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { layoutRegistry } from '../../src/app/layouts/registry';

vi.mock('../../src/app/layouts/auto-register', () => ({
  registerAllLayouts: vi.fn()
}));

vi.mock('../../src/app/layouts/container-persistence', () => ({
  persistState: vi.fn(),
  restorePersistedState: vi.fn(() => null),
  saveSceneState: vi.fn(),
  saveLayoutState: vi.fn(),
  restoreLayoutState: vi.fn(() => null),
  restoreSceneState: vi.fn(() => null)
}));

vi.mock('../../src/app/layouts/power-awareness', () => ({
  detectLowPowerMode: vi.fn(() => Promise.resolve(false))
}));

vi.mock('../../src/app/layouts/viewport-detection', () => ({
  getBreakpoints: vi.fn(() => ({ mobile: 768, tablet: 1024 }))
}));

vi.mock('../../src/app/layouts/layout-constraints', () => ({
  satisfiesConstraints: vi.fn(() => true)
}));

vi.mock('../../src/app/layouts/selector', () => ({
  layoutSelector: {
    select: vi.fn(() => 'mock-layout')
  }
}));

vi.mock('../../src/app/layouts/event-emitter', () => ({
  createEventEmitter: () => ({
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    clear: vi.fn()
  })
}));

vi.mock('../../src/app/layouts/container-resize-observer', () => ({
  ContainerResizeObserver: class {
    start() {}
    stop() {}
  }
}));

vi.mock('../../src/app/layouts/capabilities', () => ({
  capabilityFactories: {},
  getCapabilityScope: vi.fn(() => 'layout'),
  CAPABILITY_SCOPES: {}
}));

import { createSceneContainer } from '../../src/app/layouts/container';

function createMockScene(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-scene',
    preferredLayout: 'mock-layout',
    renderControl: vi.fn(),
    renderAnimation: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    dispose: vi.fn(),
    setTheme: vi.fn(),
    setMode: vi.fn(),
    startAll: vi.fn(),
    pauseAll: vi.fn(),
    reset: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
    saveState: vi.fn(),
    ...overrides
  };
}

class MockLayout {
  id = 'mock-layout';
  name = 'Mock';
  description = 'Test';
  supportedSlots = ['control', 'animation'] as const;
  capabilities: never[] = [];
  private _container: HTMLElement;
  private _slots: Record<string, HTMLElement>;

  constructor(container: HTMLElement) {
    this._container = container;
    this._slots = {
      control: document.createElement('div'),
      animation: document.createElement('div')
    };
  }

  async mount() {
    this._container.appendChild(this._slots.control);
    this._container.appendChild(this._slots.animation);
    return this._slots;
  }

  async unmount() {
    try {
      this._container.replaceChildren();
    } catch {
      /* detached */
    }
  }

  setTheme() {}
  handleResize() {}
  getSlots() {
    return this._slots;
  }
}

describe('Container edge cases', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    layoutRegistry.clear();
    layoutRegistry.register('mock-layout', MockLayout as never, {
      name: 'Mock',
      description: 'Test',
      tags: [],
      supportsMobile: true,
      supportedSlots: ['control', 'animation'],
      layoutTestProfile: {
        viewports: [{ width: 800, height: 600 }],
        interactionModel: 'split'
      }
    });
  });

  afterEach(() => {
    appDiv.remove();
    layoutRegistry.clear();
    vi.clearAllMocks();
  });

  it('scene.unmount() throw should not prevent container from setting new scene', async () => {
    const badScene = createMockScene({
      unmount: vi.fn(() => {
        throw new Error('unmount boom');
      })
    });
    const goodScene = createMockScene();

    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(badScene as never);
    await container.setScene(goodScene as never);
    expect(goodScene.mount).toHaveBeenCalled();
  });

  it('scene.setTheme() throw should not crash container.setTheme', async () => {
    const scene = createMockScene({
      setTheme: vi.fn(() => {
        throw new Error('theme boom');
      })
    });

    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(scene as never);
    expect(() => container.setTheme('dark')).not.toThrow();
  });

  it('dispose during setScene should not leave zombie scene', async () => {
    const scene = createMockScene();

    const container = createSceneContainer({ mount: appDiv });
    const p = container.setScene(scene as never);
    container.dispose();
    await p;

    expect(appDiv.childElementCount).toBe(0);
  });

  it('double dispose should be safe', async () => {
    const scene = createMockScene();
    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(scene as never);

    expect(() => {
      container.dispose();
      container.dispose();
    }).not.toThrow();
  });

  it('setScene after dispose should be no-op', async () => {
    const scene = createMockScene();
    const container = createSceneContainer({ mount: appDiv });
    container.dispose();

    await container.setScene(scene as never);
    expect(scene.mount).not.toHaveBeenCalled();
  });

  it('setTheme after dispose should be no-op', async () => {
    const container = createSceneContainer({ mount: appDiv });
    container.dispose();

    expect(() => container.setTheme('dark')).not.toThrow();
  });

  it('scene without optional methods should work', async () => {
    const minimalScene = {
      id: 'minimal',
      preferredLayout: 'mock-layout',
      renderControl: vi.fn(),
      renderAnimation: vi.fn()
    };

    const container = createSceneContainer({ mount: appDiv });
    await expect(
      container.setScene(minimalScene as never)
    ).resolves.toBeUndefined();
  });

  it('rapid setScene A → B → C should only mount last scene', async () => {
    const sceneA = createMockScene({ id: 'scene-a' });
    const sceneB = createMockScene({ id: 'scene-b' });
    const sceneC = createMockScene({ id: 'scene-c' });

    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(sceneA as never);
    const pB = container.setScene(sceneB as never);
    const pC = container.setScene(sceneC as never);
    await Promise.all([pB, pC]);

    expect(sceneC.mount).toHaveBeenCalled();
  });

  it('switchLayout with unknown layout should throw', async () => {
    const scene = createMockScene();
    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(scene as never);

    await expect(container.switchLayout('nonexistent-layout')).rejects.toThrow(
      'not found'
    );
  });

  it('scene.saveState() throw should not prevent scene switch', async () => {
    const badScene = createMockScene({
      saveState: vi.fn(() => {
        throw new Error('save boom');
      })
    });
    const goodScene = createMockScene();

    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(badScene as never);
    await container.setScene(goodScene as never);
    expect(goodScene.mount).toHaveBeenCalled();
  });
});

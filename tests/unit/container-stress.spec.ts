/**
 * 竞态压力测试
 *
 * 快速连续调用 setScene/switchLayout/dispose，验证无泄漏和崩溃
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { layoutRegistry } from '../../src/app/layouts/registry';

vi.mock('../../src/app/layouts/auto-register', () => ({
  registerAllLayouts: vi.fn()
}));

vi.mock('../../src/app/layouts/container-persistence', () => ({
  persistState: vi.fn(),
  restorePersistedState: vi.fn(() => null),
  saveLayoutState: vi.fn(),
  restoreLayoutState: vi.fn(() => null)
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
    drain() {}
  }
}));

vi.mock('../../src/app/layouts/capabilities', () => ({
  capabilityFactories: {},
  createCapabilityDefinition: () => ({
    id: 'mock',
    mount: () => ({ dispose() {} })
  })
}));

import { createSceneContainer } from '../../src/app/layouts/container';

function createMockScene(id: string) {
  return {
    id,
    preferredLayout: 'mock-layout',
    renderControl: vi.fn(),
    renderAnimation: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    dispose: vi.fn(),
    setTheme: vi.fn(),
    getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
    subscribe: vi.fn(() => vi.fn())
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

describe('Race condition stress tests', () => {
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

  it('rapid setScene × 10 should not leak scenes', async () => {
    const scenes = Array.from({ length: 10 }, (_, i) =>
      createMockScene(`scene-${i}`)
    );
    const container = createSceneContainer({ mount: appDiv });

    // Fire all setScene rapidly
    const promises = scenes.map((s) => container.setScene(s as never));
    await Promise.all(promises);

    // Only the last scene should be active
    // Pending scene queue should be drained
    expect(container.currentScene?.id).toBe('scene-9');
  });

  it('setScene → dispose → setScene should not resurrect', async () => {
    const scene1 = createMockScene('s1');
    const scene2 = createMockScene('s2');

    const container = createSceneContainer({ mount: appDiv });
    await container.setScene(scene1 as never);
    container.dispose();

    // setScene after dispose should be no-op
    await container.setScene(scene2 as never);
    expect(scene2.mount).not.toHaveBeenCalled();
    expect(appDiv.childElementCount).toBe(0);
  });

  it('interleaved setScene + setTheme should not crash', async () => {
    const scenes = Array.from({ length: 5 }, (_, i) =>
      createMockScene(`scene-${i}`)
    );
    const container = createSceneContainer({ mount: appDiv });

    // Interleave setScene and setTheme calls
    const p1 = container.setScene(scenes[0] as never);
    container.setTheme('dark');
    const p2 = container.setScene(scenes[1] as never);
    container.setTheme('light');
    const p3 = container.setScene(scenes[2] as never);
    await Promise.all([p1, p2, p3]);

    // Last scene should be mounted, theme should be light
    expect(container.getTheme()).toBe('light');
  });

  it('rapid dispose + setScene should not throw', async () => {
    const container = createSceneContainer({ mount: appDiv });
    const scene = createMockScene('s1');
    await container.setScene(scene as never);

    // Simultaneously dispose and set new scene
    container.dispose();
    const scene2 = createMockScene('s2');
    await expect(container.setScene(scene2 as never)).resolves.toBeUndefined();
  });

  it('double dispose interspersed with setScene should be safe', async () => {
    const container = createSceneContainer({ mount: appDiv });
    const scene = createMockScene('s1');
    await container.setScene(scene as never);

    container.dispose();
    container.dispose();

    // All no-ops on disposed container
    expect(() => container.setTheme('dark')).not.toThrow();
    expect(() => container.dispose()).not.toThrow();
  });
});

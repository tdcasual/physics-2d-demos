import { setTimeout as realSetTimeout } from 'node:timers/promises';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createSceneContainer } from '../../src/app/layouts/container';
import type {
  ILayout,
  ILayoutConstructor,
  LayoutConfig,
  LayoutSlots,
  Scene
} from '../../src/app/layouts/types';
import {
  layoutRegistry,
  registerLayout,
  registerLazyLayout,
  registerLayoutTestAdapter
} from '../../src/app/layouts/registry';

const testMeta = {
  name: 'Test',
  description: 'test',
  tags: ['test'],
  supportsMobile: true,
  supportedSlots: ['control', 'animation'] as Array<
    'header' | 'control' | 'animation' | 'graph' | 'readout'
  >,
  layoutTestProfile: {
    viewports: [{ width: 800, height: 600 }],
    interactionModel: 'custom' as const,
    adapter: 'registry-container-adapter'
  }
};

function layoutClass(id: string, onConstruct?: () => void): ILayoutConstructor {
  return class TestLayout implements ILayout {
    readonly id = id;
    readonly name = id;
    readonly description = id;
    readonly supportedSlots: Array<
      'header' | 'control' | 'animation' | 'graph' | 'readout'
    > = ['control', 'animation'];
    readonly capabilities = [];
    private slots: LayoutSlots = {
      control: document.createElement('div'),
      animation: document.createElement('div')
    };

    constructor(
      private readonly host: HTMLElement,
      private cfg: LayoutConfig = {}
    ) {
      onConstruct?.();
    }

    _updateConfig(config?: LayoutConfig): void {
      if (config) this.cfg = { ...this.cfg, ...config };
    }

    async mount(): Promise<LayoutSlots> {
      const control = document.createElement('div');
      const animation = document.createElement('div');
      const canvas =
        this.cfg.preservedCanvas ?? document.createElement('canvas');
      canvas.dataset.layoutId = id;
      animation.appendChild(canvas);
      this.host.append(control, animation);
      this.slots = { control, animation };
      return this.slots;
    }

    async unmount(): Promise<void> {
      this.host.replaceChildren();
    }

    setTheme(): void {}
    handleResize(): void {}
    getSlots(): LayoutSlots {
      return this.slots;
    }
  } as unknown as ILayoutConstructor;
}

function makeScene(id = 'scene-a'): Scene {
  return {
    id,
    preferredLayout: 'layout-a',
    renderAnimation: vi.fn(),
    renderControl: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    requestStageRepaint: vi.fn(),
    getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
    subscribe: vi.fn(() => vi.fn())
  } as unknown as Scene;
}

const FAKE_TIMER_APIS = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'Date'
] as const;

async function waitUntilSwitching(container: {
  getSwitchState(): string;
}): Promise<void> {
  for (let i = 0; i < 400; i++) {
    if (container.getSwitchState() === 'switching') return;
    await realSetTimeout(5);
  }
  throw new Error('layout switch did not enter switching');
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('SceneContainer + production layoutRegistry abort race', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    layoutRegistry.clear();
    registerLayoutTestAdapter('registry-container-adapter');
    mount = document.createElement('div');
    mount.style.width = '1200px';
    mount.style.height = '800px';
    document.body.appendChild(mount);
  });

  afterEach(() => {
    mount.remove();
    layoutRegistry.clear();
  });

  describe('watchdog and ack with fake timers', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('rolls back a hung lazy create, drains the pending target, and ignores a late import', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-c', layoutClass('layout-c'), testMeta);

      let constructB = 0;
      let resolveB!: (ctor: ILayoutConstructor) => void;
      registerLazyLayout(
        'layout-b',
        () =>
          new Promise<ILayoutConstructor>((resolve) => {
            resolveB = resolve;
          }),
        testMeta
      );

      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(makeScene());
      const canvas = mount.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(container.currentLayout?.id).toBe('layout-a');

      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      const queued = container.switchLayout('layout-c', { reason: 'manual' });

      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      await hung;
      await queued;
      await flushMicrotasks();

      expect(container.currentLayout?.id).toBe('layout-c');
      expect(container.getSwitchState()).toBe('idle');
      expect(mount.querySelector('canvas')).toBe(canvas);

      resolveB(
        layoutClass('layout-b', () => {
          constructB += 1;
        })
      );
      await flushMicrotasks();
      expect(constructB).toBe(0);
      expect(mount.querySelector('[data-layout-id="layout-b"]')).toBeNull();
      container.dispose();
    });

    it('quarantines an unacked onLayoutWillChange and rejects later switches', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      scene.onLayoutWillChange = () => new Promise(() => {});
      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      vi.advanceTimersByTime(1_000);
      await flushMicrotasks();
      await hung.catch(() => undefined);
      expect(container.getSwitchState()).toBe('quarantined');
      await expect(container.switchLayout('layout-b')).rejects.toMatchObject({
        name: 'SwitchQuarantinedError'
      });
      expect(() => container.resetSwitchQuarantine()).toThrow(
        /Cannot reset switch quarantine|SwitchQuarantinedError/
      );
      expect(container.getSwitchState()).toBe('quarantined');
      container.dispose();
    });

    it('accepts quarantine reset after a delayed willChange ack', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      let release!: () => void;
      scene.onLayoutWillChange = () =>
        new Promise<void>((resolve) => {
          release = resolve;
        });
      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      vi.advanceTimersByTime(1_000);
      await flushMicrotasks();
      await hung.catch(() => undefined);
      expect(container.getSwitchState()).toBe('quarantined');
      release();
      await flushMicrotasks();
      expect(container.resetSwitchQuarantine()).toBe(true);
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });
  });

  it('cleans up a thrown mount without leaving a duplicate canvas', async () => {
    registerLayout('layout-a', layoutClass('layout-a'), testMeta);
    const Boom = class {
      readonly id = 'layout-b';
      readonly name = 'layout-b';
      readonly description = 'layout-b';
      readonly supportedSlots = ['control', 'animation'] as const;
      readonly capabilities = [];
      constructor(private readonly host: HTMLElement) {}
      async mount() {
        const control = document.createElement('div');
        const animation = document.createElement('div');
        animation.appendChild(document.createElement('canvas'));
        this.host.append(control, animation);
        throw new Error('mount exploded');
      }
      async unmount() {
        this.host.replaceChildren();
      }
      setTheme() {}
      handleResize() {}
      getSlots() {
        return {
          control: document.createElement('div'),
          animation: document.createElement('div')
        };
      }
    } as unknown as ILayoutConstructor;
    registerLayout('layout-b', Boom, testMeta);
    const container = createSceneContainer({
      mount,
      forceLayout: 'layout-a'
    });
    await container.setScene(makeScene());
    const before = mount.querySelectorAll('canvas').length;
    await container
      .switchLayout('layout-b', { animate: false })
      .catch(() => undefined);
    expect(mount.querySelectorAll('canvas').length).toBe(before);
    expect(container.currentLayout?.id).toBe('layout-a');
    container.dispose();
  });

  it('recovers with an explicit null preservedCanvas and does not duplicate canvas', async () => {
    registerLayout('layout-a', layoutClass('layout-a'), testMeta);
    registerLayout('layout-b', layoutClass('layout-b'), testMeta);
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({
      mount,
      forceLayout: 'layout-a'
    });
    await container.setScene(makeScene());
    const original = mount.querySelector('canvas');
    expect(original).not.toBeNull();

    const create = layoutRegistry.create.bind(layoutRegistry);
    const spy = vi.spyOn(layoutRegistry, 'create');
    spy.mockImplementation(async (id, host, config, options) => {
      if (id === 'layout-b') {
        throw new Error('incoming failed');
      }
      expect(config).toEqual(
        expect.objectContaining({ preservedCanvas: expect.anything() })
      );
      if (id === 'layout-a' && spy.mock.calls.length > 1) {
        expect(
          Object.prototype.hasOwnProperty.call(config, 'preservedCanvas')
        ).toBe(true);
      }
      return create(id, host, config, options);
    });

    await container
      .switchLayout('layout-b', { animate: false })
      .catch(() => undefined);
    expect(mount.querySelectorAll('canvas').length).toBe(1);
    expect(container.currentLayout?.id).toBe('layout-a');
    spy.mockRestore();
    container.dispose();
  });

  it('recovery passes explicit preservedCanvas null when no live canvas exists', async () => {
    const Bare = class {
      readonly id = 'layout-a';
      readonly name = 'layout-a';
      readonly description = 'layout-a';
      readonly supportedSlots = ['control', 'animation'] as const;
      readonly capabilities = [];
      constructor(private readonly host: HTMLElement) {}
      async mount() {
        const control = document.createElement('div');
        const animation = document.createElement('div');
        this.host.append(control, animation);
        return { control, animation };
      }
      async unmount() {
        this.host.replaceChildren();
      }
      setTheme() {}
      handleResize() {}
      getSlots() {
        const animation = this.host.children[1] as HTMLElement;
        const control = this.host.children[0] as HTMLElement;
        return { control, animation };
      }
    } as unknown as ILayoutConstructor;
    registerLayout('layout-a', Bare, testMeta);
    registerLayout('layout-b', layoutClass('layout-b'), testMeta);
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({
      mount,
      forceLayout: 'layout-a'
    });
    await container.setScene(makeScene());
    expect(mount.querySelector('canvas')).toBeNull();

    const create = layoutRegistry.create.bind(layoutRegistry);
    const spy = vi.spyOn(layoutRegistry, 'create');
    spy.mockImplementation(async (id, host, config, options) => {
      if (id === 'layout-b') throw new Error('incoming failed');
      expect(config).toEqual(
        expect.objectContaining({ preservedCanvas: null })
      );
      return create(id, host, config, options);
    });

    await container
      .switchLayout('layout-b', { animate: false })
      .catch(() => undefined);
    expect(mount.querySelectorAll('canvas').length).toBe(0);
    expect(container.currentLayout?.id).toBe('layout-a');
    spy.mockRestore();
    container.dispose();
  });
});

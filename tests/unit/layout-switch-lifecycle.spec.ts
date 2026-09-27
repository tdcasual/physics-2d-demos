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
import { registerDefaultStrategies } from '../../src/app/layouts/default-strategies';
import {
  SWITCH_QUARANTINE_MESSAGE,
  SWITCH_STATUS_ATTR
} from '../../src/app/layouts/switch-errors';
import type { LayoutSwitchRuntime } from '../../src/app/layouts/layout-switch-runtime';

const testMeta = {
  name: 'Test',
  description: 'test',
  tags: ['test'],
  supportsMobile: true,
  supportedSlots: ['control', 'animation', 'graph'] as Array<
    'header' | 'control' | 'animation' | 'graph' | 'readout'
  >,
  layoutTestProfile: {
    viewports: [{ width: 800, height: 600 }],
    interactionModel: 'custom' as const,
    adapter: 'switch-lifecycle-adapter'
  }
};

function layoutClass(
  id: string,
  onConstruct?: () => void,
  onDomWrite?: () => void
): ILayoutConstructor {
  return class TestLayout implements ILayout {
    readonly id = id;
    readonly name = id;
    readonly description = id;
    readonly supportedSlots: Array<
      'header' | 'control' | 'animation' | 'graph' | 'readout'
    > = ['control', 'animation', 'graph'];
    readonly capabilities = [];
    private slots: LayoutSlots = {
      control: document.createElement('div'),
      animation: document.createElement('div'),
      graph: document.createElement('div')
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
      onDomWrite?.();
      const control = document.createElement('div');
      const animation = document.createElement('div');
      const graph = document.createElement('div');
      const canvas =
        this.cfg.preservedCanvas ?? document.createElement('canvas');
      canvas.dataset.layoutId = id;
      animation.appendChild(canvas);
      this.host.append(control, animation, graph);
      this.slots = { control, animation, graph };
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

function makeScene(id = 'scene-a', preferredLayout = 'layout-a'): Scene {
  return {
    id,
    preferredLayout,
    renderAnimation: vi.fn(),
    renderControl: vi.fn(),
    renderGraph: vi.fn(),
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

function runtimeOf(container: unknown): LayoutSwitchRuntime {
  return (container as { _switch: LayoutSwitchRuntime })._switch;
}

describe('Layout switch lifecycle (Wave B)', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    layoutRegistry.clear();
    registerLayoutTestAdapter('switch-lifecycle-adapter');
    registerDefaultStrategies();
    mount = document.createElement('div');
    mount.style.width = '1200px';
    mount.style.height = '800px';
    document.body.appendChild(mount);
  });

  afterEach(() => {
    mount.remove();
    layoutRegistry.clear();
    vi.restoreAllMocks();
  });

  describe('B1 canvas custody + switch-error surface', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('resets quarantine when a graph canvas sits beside the stage canvas', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      const graphCanvas = document.createElement('canvas');
      graphCanvas.dataset.role = 'graph';
      mount.appendChild(graphCanvas);
      expect(mount.querySelectorAll('canvas').length).toBeGreaterThan(1);

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

    it('surfaces layout:switch-error on a status bar and console', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      scene.onLayoutWillChange = () => new Promise(() => {});
      const errorSpy = vi.fn();
      container.on('layout:switch-error', errorSpy);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      vi.advanceTimersByTime(1_000);
      await flushMicrotasks();
      await hung.catch(() => undefined);

      expect(container.getSwitchState()).toBe('quarantined');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'quarantined' })
      );
      expect(consoleSpy).toHaveBeenCalled();
      const bar = mount.querySelector(`[${SWITCH_STATUS_ATTR}]`);
      expect(bar).not.toBeNull();
      expect(bar?.textContent).toBe(SWITCH_QUARANTINE_MESSAGE);
      expect(bar?.getAttribute('role')).toBe('status');
      container.dispose();
    });
  });

  describe('B2 dispose cancels in-flight switch', () => {
    it('writes no DOM after dispose during a deferred loader', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
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
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      container.dispose();
      const htmlAfterDispose = mount.innerHTML;
      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((list) => {
        mutations.push(...list);
      });
      observer.observe(mount, {
        childList: true,
        subtree: true,
        attributes: true
      });
      resolveB(
        layoutClass('layout-b', () => {
          constructB += 1;
        })
      );
      await hung.catch(() => undefined);
      await flushMicrotasks();
      observer.disconnect();
      expect(constructB).toBe(0);
      expect(mount.innerHTML).toBe(htmlAfterDispose);
      expect(mutations).toHaveLength(0);
      expect(mount.querySelector('[data-layout-id="layout-b"]')).toBeNull();
    });

    it('writes no committed layout after dispose during a deferred mount', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      let releaseMount!: () => void;
      const mountGate = new Promise<void>((resolve) => {
        releaseMount = resolve;
      });
      let domWrites = 0;
      const Deferred = class {
        readonly id = 'layout-b';
        readonly name = 'layout-b';
        readonly description = 'layout-b';
        readonly supportedSlots = ['control', 'animation'] as const;
        readonly capabilities = [];
        constructor(private readonly host: HTMLElement) {}
        async mount() {
          await mountGate;
          domWrites += 1;
          const control = document.createElement('div');
          const animation = document.createElement('div');
          const canvas = document.createElement('canvas');
          canvas.dataset.layoutId = 'layout-b';
          animation.appendChild(canvas);
          this.host.append(control, animation);
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
      registerLayout('layout-b', Deferred, testMeta);
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(makeScene());
      const hung = container.switchLayout('layout-b', {
        reason: 'manual',
        animate: false
      });
      await waitUntilSwitching(container);
      container.dispose();
      expect(container.currentLayout).toBeNull();
      expect(mount.dataset.layoutId).toBeUndefined();
      releaseMount();
      await hung.catch(() => undefined);
      await flushMicrotasks();
      expect(container.currentLayout).toBeNull();
      expect(mount.dataset.layoutId).toBeUndefined();
      expect(mount.querySelector('[data-layout-id="layout-b"]')).toBeNull();
      expect(domWrites === 0 || mount.childElementCount === 0).toBe(true);
    });
  });

  describe('B3 throw-before-teardown', () => {
    it('keeps the old layout, returns to idle, and reports without quarantining', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      scene.onLayoutWillChange = async () => {
        throw new Error('willChange boom');
      };
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      const errorSpy = vi.fn();
      container.on('layout:switch-error', errorSpy);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await container
        .switchLayout('layout-b', { reason: 'manual' })
        .catch(() => undefined);

      expect(container.currentLayout?.id).toBe('layout-a');
      expect(container.getSwitchState()).toBe('idle');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'idle' })
      );
      expect(consoleSpy).toHaveBeenCalled();
      expect(mount.querySelector('[data-layout-id="layout-b"]')).toBeNull();
      expect(mount.querySelector(`[${SWITCH_STATUS_ATTR}]`)).toBeNull();
      container.dispose();
    });
  });

  describe('B5 onLayoutWillChange object', () => {
    it('does not fire onLayoutWillChange on the incoming scene during scene replacement', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const sceneA = makeScene('scene-a', 'layout-a');
      const willA = vi.fn().mockResolvedValue(undefined);
      sceneA.onLayoutWillChange = willA;
      const sceneB = makeScene('scene-b', 'layout-b');
      const willB = vi.fn().mockResolvedValue(undefined);
      sceneB.onLayoutWillChange = willB;

      const container = createSceneContainer({ mount });
      await container.setScene(sceneA);
      expect(container.currentLayout?.id).toBe('layout-a');

      await container.setScene(sceneB);

      expect(container.currentScene).toBe(sceneB);
      expect(container.currentLayout?.id).toBe('layout-b');
      expect(willB).not.toHaveBeenCalled();
      expect(sceneA.unmount).toHaveBeenCalled();
      expect(sceneB.mount).toHaveBeenCalled();
      container.dispose();
    });
  });

  describe('B6 pending queue vs drain order', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('drops quarantine-era pending targets so the next idle switch cannot drain them', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      registerLayout('layout-c', layoutClass('layout-c'), testMeta);
      const scene1 = makeScene('scene-1', 'layout-a');
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene1);
      let release!: () => void;
      scene1.onLayoutWillChange = () =>
        new Promise<void>((resolve) => {
          release = resolve;
        });

      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      const scene2 = makeScene('scene-2', 'layout-a');
      void container.setScene(scene2);
      await container.switchLayout('layout-c', { reason: 'manual' });
      const sw = runtimeOf(container);
      expect(sw.pendingScene).toBe(scene2);
      expect(sw.pendingSwitchId).toBe('layout-c');

      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      vi.advanceTimersByTime(1_000);
      await flushMicrotasks();
      await hung.catch(() => undefined);
      expect(container.getSwitchState()).toBe('quarantined');
      expect(sw.pendingScene).toBeNull();
      expect(sw.pendingSwitchId).toBeNull();

      release();
      await flushMicrotasks();
      expect(container.resetSwitchQuarantine()).toBe(true);
      expect(sw.pendingScene).toBeNull();
      expect(sw.pendingSwitchId).toBeNull();

      scene1.onLayoutWillChange = undefined;
      await container.switchLayout('layout-b', {
        reason: 'manual',
        animate: false
      });
      expect(container.currentScene).toBe(scene1);
      expect(container.currentLayout?.id).toBe('layout-b');
      container.dispose();
    });
  });
});

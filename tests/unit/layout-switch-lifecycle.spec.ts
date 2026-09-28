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
import { LayoutSwitchRuntime } from '../../src/app/layouts/layout-switch-runtime';

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

async function waitUntil(pred: () => boolean, message: string): Promise<void> {
  for (let i = 0; i < 400; i++) {
    if (pred()) return;
    await realSetTimeout(5);
  }
  throw new Error(message);
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

function runtimeOf(container: unknown): LayoutSwitchRuntime {
  return (container as { _switch: LayoutSwitchRuntime })._switch;
}

function animationSlotOf(container: {
  currentLayout: ILayout | null;
}): HTMLElement {
  const slot = container.currentLayout?.getSlots?.()?.animation;
  if (!slot) throw new Error('expected animation slot');
  return slot;
}

async function quarantineHungWillChange(
  container: {
    switchLayout: (id: string, options?: { reason?: string }) => Promise<void>;
    getSwitchState: () => string;
  },
  scene: Scene,
  layoutId: string
): Promise<() => void> {
  let release!: () => void;
  scene.onLayoutWillChange = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
  const hung = container.switchLayout(layoutId, { reason: 'manual' });
  await waitUntilSwitching(container);
  vi.advanceTimersByTime(10_000);
  await flushMicrotasks();
  vi.advanceTimersByTime(1_000);
  await flushMicrotasks();
  await hung.catch(() => undefined);
  expect(container.getSwitchState()).toBe('quarantined');
  return release;
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

    it('seeds canvasOwner on first switch with three in-slot canvases', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      const slot = animationSlotOf(container);
      const owned = slot.querySelector('canvas');
      expect(owned).not.toBeNull();
      const extraA = document.createElement('canvas');
      extraA.dataset.role = 'instrument';
      const extraB = document.createElement('canvas');
      extraB.dataset.role = 'instrument';
      slot.append(extraA, extraB);
      expect(slot.querySelectorAll('canvas').length).toBe(3);

      const release = await quarantineHungWillChange(
        container,
        scene,
        'layout-b'
      );
      expect(runtimeOf(container).canvasOwner?.node).toBe(owned);
      expect(slot.querySelectorAll('canvas').length).toBe(3);
      release();
      await flushMicrotasks();
      expect(container.resetSwitchQuarantine()).toBe(true);
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });

    it('resets quarantine when instrument canvases share the animation slot', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      await container.switchLayout('layout-b', { animate: false });
      const slot = animationSlotOf(container);
      const owned = slot.querySelector('canvas');
      expect(owned).not.toBeNull();
      expect(runtimeOf(container).canvasOwner?.node).toBe(owned);
      const instrumentA = document.createElement('canvas');
      instrumentA.dataset.role = 'instrument';
      const instrumentB = document.createElement('canvas');
      instrumentB.dataset.role = 'instrument';
      slot.append(instrumentA, instrumentB);
      expect(slot.querySelectorAll('canvas').length).toBe(3);

      const release = await quarantineHungWillChange(
        container,
        scene,
        'layout-a'
      );
      expect(slot.querySelectorAll('canvas').length).toBe(3);
      release();
      await flushMicrotasks();
      expect(container.resetSwitchQuarantine()).toBe(true);
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });

    it('keeps quarantine when the owned stage canvas has been displaced', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);
      await container.switchLayout('layout-b', { animate: false });
      const slot = animationSlotOf(container);
      const owned = slot.querySelector('canvas');
      expect(owned).not.toBeNull();
      expect(runtimeOf(container).canvasOwner?.node).toBe(owned);
      owned!.remove();
      const replacement = document.createElement('canvas');
      replacement.dataset.role = 'replacement';
      slot.appendChild(replacement);
      expect(owned!.isConnected).toBe(false);
      expect(slot.contains(owned!)).toBe(false);
      expect(slot.querySelector('canvas')).toBe(replacement);

      const release = await quarantineHungWillChange(
        container,
        scene,
        'layout-a'
      );
      release();
      await flushMicrotasks();
      expect(runtimeOf(container).resetSwitchQuarantine()).toBe(false);
      expect(container.getSwitchState()).toBe('quarantined');
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

    it('clears data-layout-id when disposed during rollback (G4)', async () => {
      const origCreate = layoutRegistry.create.bind(layoutRegistry);
      let createCalls = 0;
      let releaseRollback: (() => void) | undefined;
      vi.spyOn(layoutRegistry, 'create').mockImplementation(
        async (id, el, cfg, opts) => {
          createCalls += 1;
          if (createCalls === 1) {
            return origCreate(id, el, cfg, opts);
          }
          if (id === 'layout-b') {
            throw new Error('incoming layout failed');
          }
          return new Promise((resolve) => {
            releaseRollback = () => {
              const Ctor = layoutClass(id);
              resolve(new Ctor(el, cfg));
            };
          });
        }
      );
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(makeScene());
      expect(mount.dataset.layoutId).toBe('layout-a');

      const hung = container.switchLayout('layout-b', {
        reason: 'manual',
        animate: false
      });
      await waitUntilSwitching(container);
      await waitUntil(
        () => typeof releaseRollback === 'function',
        'rollback create did not start'
      );

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
      releaseRollback?.();
      await hung.catch(() => undefined);
      await flushMicrotasks();
      observer.disconnect();

      expect(mutations).toHaveLength(0);
      expect(mount.innerHTML).toBe(htmlAfterDispose);
      expect(mount.dataset.layoutId).toBeUndefined();
      expect(mount.hasAttribute('data-layout-id')).toBe(false);
      expect(mount.querySelector('[data-layout-id]')).toBeNull();
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

  describe('G2 boot drain vs concurrent switchLayout', () => {
    it('second setScene during boot plus concurrent switchLayout keeps a single owner', async () => {
      let resolveA!: (ctor: ILayoutConstructor) => void;
      registerLazyLayout(
        'layout-a',
        () =>
          new Promise<ILayoutConstructor>((resolve) => {
            resolveA = resolve;
          }),
        testMeta
      );
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      registerLayout('layout-c', layoutClass('layout-c'), testMeta);

      const orig = LayoutSwitchRuntime.prototype.switchLayout;
      let active = 0;
      let maxActive = 0;
      vi.spyOn(
        LayoutSwitchRuntime.prototype,
        'switchLayout'
      ).mockImplementation(function (
        this: LayoutSwitchRuntime,
        ...args: Parameters<LayoutSwitchRuntime['switchLayout']>
      ) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        return Promise.resolve(orig.apply(this, args)).finally(() => {
          active -= 1;
        });
      });

      const container = createSceneContainer({ mount });
      const scene1 = makeScene('scene-1', 'layout-a');
      const scene2 = makeScene('scene-2', 'layout-b');
      const p1 = container.setScene(scene1);
      await waitUntil(
        () => typeof resolveA === 'function',
        'layout-a loader did not start'
      );
      const p2 = container.setScene(scene2);
      const p3 = container.switchLayout('layout-c', {
        reason: 'manual',
        animate: false
      });

      resolveA(layoutClass('layout-a'));
      await Promise.all([p1, p2, p3]);

      expect(maxActive).toBeLessThanOrEqual(1);
      expect(container.currentScene).toBe(scene2);
      expect(container.currentLayout?.id).toBe('layout-c');
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });

    it('switchLayout issued during boot drain waits until drain finishes', async () => {
      let resolveA!: (ctor: ILayoutConstructor) => void;
      let resolveB!: (ctor: ILayoutConstructor) => void;
      registerLazyLayout(
        'layout-a',
        () =>
          new Promise<ILayoutConstructor>((resolve) => {
            resolveA = resolve;
          }),
        testMeta
      );
      registerLazyLayout(
        'layout-b',
        () =>
          new Promise<ILayoutConstructor>((resolve) => {
            resolveB = resolve;
          }),
        testMeta
      );
      let cConstructs = 0;
      registerLayout(
        'layout-c',
        layoutClass('layout-c', () => {
          cConstructs += 1;
        }),
        testMeta
      );

      const orig = LayoutSwitchRuntime.prototype.switchLayout;
      const entered: string[] = [];
      vi.spyOn(
        LayoutSwitchRuntime.prototype,
        'switchLayout'
      ).mockImplementation(function (
        this: LayoutSwitchRuntime,
        layoutId: string,
        options?: Parameters<LayoutSwitchRuntime['switchLayout']>[1]
      ) {
        entered.push(layoutId);
        return orig.apply(this, [layoutId, options]);
      });

      const container = createSceneContainer({ mount });
      const scene1 = makeScene('scene-1', 'layout-a');
      const scene2 = makeScene('scene-2', 'layout-b');
      const p1 = container.setScene(scene1);
      await flushMicrotasks();
      const p2 = container.setScene(scene2);
      resolveA(layoutClass('layout-a'));
      await waitUntil(
        () => typeof resolveB === 'function',
        'boot drain did not start layout-b create'
      );

      let p3Settled = false;
      const p3 = container
        .switchLayout('layout-c', {
          reason: 'manual',
          animate: false
        })
        .finally(() => {
          p3Settled = true;
        });
      await flushMicrotasks();
      expect(entered).toEqual(['layout-b']);
      expect(cConstructs).toBe(0);
      expect(p3Settled).toBe(false);

      resolveB(layoutClass('layout-b'));
      await Promise.all([p1, p2, p3]);

      expect(p3Settled).toBe(true);
      expect(entered.filter((id) => id === 'layout-c')).toHaveLength(1);
      expect(cConstructs).toBe(1);
      expect(container.currentScene).toBe(scene2);
      expect(container.currentLayout?.id).toBe('layout-c');
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });
  });

  describe('G5 hardening guards', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('flushAckWaiters on dispose so abort-path waiters do not hang', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene = makeScene();
      scene.onLayoutWillChange = () => new Promise<void>(() => undefined);
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene);

      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();

      let settled = false;
      void hung.finally(() => {
        settled = true;
      });
      container.dispose();
      await flushMicrotasks();
      await flushMicrotasks();
      expect(settled).toBe(true);
    });

    it('drainPending restores only pendingSwitchId when scene apply succeeded', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
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

      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const hung = container.switchLayout('layout-b', {
        reason: 'manual',
        animate: false
      });
      await waitUntilSwitching(container);

      const scene2 = makeScene('scene-2', 'layout-a');
      const p2 = container.setScene(scene2);
      const sw = runtimeOf(container);
      sw.pendingSwitchId = 'layout-missing';
      expect(sw.pendingScene).toBe(scene2);
      expect(sw.pendingSwitchId).toBe('layout-missing');

      release();
      await hung.catch(() => undefined);
      await p2;
      await flushMicrotasks();
      await flushMicrotasks();

      expect(container.currentScene).toBe(scene2);
      expect(sw.pendingScene).toBeNull();
      expect(sw.pendingSwitchId).toBe('layout-missing');
      container.dispose();
    });
  });

  describe('G′ switching-queue deferred', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('setScene during switching returns a deferred; replaced requests resolve', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
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

      const hung = container.switchLayout('layout-b', {
        reason: 'manual',
        animate: false
      });
      await waitUntilSwitching(container);

      const scene2 = makeScene('scene-2', 'layout-a');
      const scene3 = makeScene('scene-3', 'layout-a');
      let p2Settled = false;
      const p2 = container.setScene(scene2).finally(() => {
        p2Settled = true;
      });
      await flushMicrotasks();
      expect(p2Settled).toBe(false);

      const p3 = container.setScene(scene3);
      await flushMicrotasks();
      expect(p2Settled).toBe(true);
      await expect(p2).resolves.toBeUndefined();

      release();
      await Promise.all([hung, p3]);
      expect(container.currentScene).toBe(scene3);
      expect(container.getSwitchState()).toBe('idle');
      container.dispose();
    });

    it('quarantine settles the queued setScene deferred (G″ 条款 18)', async () => {
      registerLayout('layout-a', layoutClass('layout-a'), testMeta);
      registerLayout('layout-b', layoutClass('layout-b'), testMeta);
      const scene1 = makeScene('scene-1', 'layout-a');
      const container = createSceneContainer({
        mount,
        forceLayout: 'layout-a'
      });
      await container.setScene(scene1);

      scene1.onLayoutWillChange = () => new Promise<void>(() => undefined);

      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
      const hung = container.switchLayout('layout-b', { reason: 'manual' });
      await waitUntilSwitching(container);

      const scene2 = makeScene('scene-2', 'layout-a');
      let p2Outcome: 'pending' | 'fulfilled' | 'rejected' = 'pending';
      const p2 = container.setScene(scene2);
      void p2.then(
        () => {
          p2Outcome = 'fulfilled';
        },
        () => {
          p2Outcome = 'rejected';
        }
      );
      await flushMicrotasks();
      expect(p2Outcome).toBe('pending');
      expect(runtimeOf(container).pendingScene).toBe(scene2);

      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      vi.advanceTimersByTime(1_000);
      await flushMicrotasks();
      await hung.catch(() => undefined);

      await expect(p2).resolves.toBeUndefined();
      expect(container.getSwitchState()).toBe('quarantined');
      expect(p2Outcome).toBe('fulfilled');
      expect(runtimeOf(container).pendingScene).toBeNull();
      expect(runtimeOf(container).pendingApplyNotify).toBeNull();
      expect(
        (container as unknown as { _switchQueued: unknown })._switchQueued
      ).toBeNull();
      expect(container.currentScene).toBe(scene1);
      container.dispose();
    });
  });
});

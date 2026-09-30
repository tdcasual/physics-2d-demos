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
    adapter: 'initial-mount-adapter'
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

async function waitUntil(pred: () => boolean, message: string): Promise<void> {
  for (let i = 0; i < 400; i++) {
    if (pred()) return;
    await realSetTimeout(5);
  }
  throw new Error(message);
}

function makeScene(id = 'scene-a', preferredLayout = 'layout-a'): Scene {
  return {
    id,
    preferredLayout,
    renderAnimation: vi.fn(),
    renderControl: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    requestStageRepaint: vi.fn(),
    getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
    subscribe: vi.fn(() => vi.fn())
  } as unknown as Scene;
}

describe('SceneContainer initial mount serialization', () => {
  let mountEl: HTMLElement;

  beforeEach(() => {
    layoutRegistry.clear();
    registerLayoutTestAdapter('initial-mount-adapter');
    registerDefaultStrategies();
    mountEl = document.createElement('div');
    mountEl.style.width = '1200px';
    mountEl.style.height = '800px';
    document.body.appendChild(mountEl);
  });

  afterEach(() => {
    mountEl.remove();
    layoutRegistry.clear();
  });

  it('applies the latest concurrent setScene after the initial empty-container mount', async () => {
    let resolveLoader!: (ctor: ILayoutConstructor) => void;
    registerLazyLayout(
      'layout-a',
      () =>
        new Promise<ILayoutConstructor>((resolve) => {
          resolveLoader = resolve;
        }),
      testMeta
    );

    const container = createSceneContainer({
      mount: mountEl,
      forceLayout: 'layout-a'
    });
    const first = makeScene('scene-1');
    const second = makeScene('scene-2');
    const p1 = container.setScene(first);
    await Promise.resolve();
    await Promise.resolve();
    expect(typeof resolveLoader).toBe('function');

    const p2 = container.setScene(second);
    resolveLoader(layoutClass('layout-a'));
    await Promise.all([p1, p2]);

    expect(container.currentScene).toBe(second);
    expect(container.currentLayout?.id).toBe('layout-a');
    expect(first.mount).toHaveBeenCalled();
    expect(second.mount).toHaveBeenCalled();
    container.dispose();
  });

  it('dispose settles a boot-queued setScene deferred', async () => {
    let resolveLoader!: (ctor: ILayoutConstructor) => void;
    registerLazyLayout(
      'layout-a',
      () =>
        new Promise<ILayoutConstructor>((resolve) => {
          resolveLoader = resolve;
        }),
      testMeta
    );
    const container = createSceneContainer({
      mount: mountEl,
      forceLayout: 'layout-a'
    });
    const first = makeScene('scene-1');
    const second = makeScene('scene-2');
    const p1 = container.setScene(first);
    const bootOwner = container as unknown as { _boot: Promise<void> | null };
    for (let i = 0; i < 40; i++) {
      if (typeof resolveLoader === 'function' && bootOwner._boot) break;
      await Promise.resolve();
    }
    expect(typeof resolveLoader).toBe('function');
    expect(bootOwner._boot).toBeTruthy();
    const p2 = container.setScene(second);
    let p2Outcome: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    void p2.then(
      () => {
        p2Outcome = 'fulfilled';
      },
      () => {
        p2Outcome = 'rejected';
      }
    );
    container.dispose();
    await expect(p2).resolves.toBeUndefined();
    expect(p2Outcome).toBe('fulfilled');
    resolveLoader(layoutClass('layout-a'));
    await p1.catch(() => undefined);
  });

  it('propagates a capability-load failure after the scene has attached', async () => {
    registerLayout('layout-a', layoutClass('layout-a'), testMeta);
    const container = createSceneContainer({
      mount: mountEl,
      forceLayout: 'layout-a'
    });
    const orch = (
      container as unknown as {
        _orchestrator: { preload: () => Promise<unknown> };
      }
    )._orchestrator;
    vi.spyOn(orch, 'preload').mockRejectedValue(
      new Error('capability load failed')
    );
    const scene = makeScene();
    await expect(container.setScene(scene)).rejects.toThrow(
      'capability load failed'
    );
    expect(scene.mount).toHaveBeenCalled();
    expect(mountEl.querySelector('canvas')).not.toBeNull();
    container.dispose();
  });

  it('does not load the switch coordinator during construct or initial setScene', async () => {
    registerLayout('layout-a', layoutClass('layout-a'), testMeta);
    const container = createSceneContainer({
      mount: mountEl,
      forceLayout: 'layout-a'
    });
    const internals = container as unknown as {
      _switch: unknown;
      _switchReady: unknown;
    };
    expect(internals._switch).toBeNull();
    expect(internals._switchReady).toBeNull();
    await container.setScene(makeScene());
    expect(internals._switch).toBeNull();
    expect(internals._switchReady).toBeNull();
    container.dispose();
  });

  it('passes explicit preservedCanvas null on the initial create', async () => {
    registerLayout('layout-a', layoutClass('layout-a'), testMeta);
    const create = vi.spyOn(layoutRegistry, 'create');
    const container = createSceneContainer({
      mount: mountEl,
      forceLayout: 'layout-a'
    });
    await container.setScene(makeScene());
    expect(create).toHaveBeenCalledWith(
      'layout-a',
      mountEl,
      expect.objectContaining({ preservedCanvas: null })
    );
    const options = create.mock.calls[0]?.[3];
    expect(options).toBeUndefined();
    container.dispose();
    create.mockRestore();
  });

  it('applies a queued setScene after a failed lazy boot (G′ F1)', async () => {
    let rejectA!: (reason: Error) => void;
    registerLazyLayout(
      'layout-a',
      () =>
        new Promise<ILayoutConstructor>((_resolve, reject) => {
          rejectA = reject;
        }),
      testMeta
    );
    registerLayout('layout-b', layoutClass('layout-b'), testMeta);

    const container = createSceneContainer({ mount: mountEl });
    const scene1 = makeScene('scene-1', 'layout-a');
    const scene2 = makeScene('scene-2', 'layout-b');
    const errors: Array<{ error: unknown }> = [];
    container.on('layout:switch-error', (payload) => {
      errors.push(payload);
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const p1 = container.setScene(scene1);
    await waitUntil(
      () => typeof rejectA === 'function',
      'layout-a loader did not start'
    );

    const p2 = container.setScene(scene2);
    rejectA(new Error('boot boom'));

    const r1 = await p1.then(
      () => 'fulfilled' as const,
      (err: unknown) =>
        `rejected(${err instanceof Error ? err.message : String(err)})`
    );
    const r2 = await p2.then(
      () => 'fulfilled' as const,
      (err: unknown) =>
        `rejected(${err instanceof Error ? err.message : String(err)})`
    );

    expect(r1).toBe('rejected(boot boom)');
    expect(r2).toBe('fulfilled');
    expect(container.currentScene).toBe(scene2);
    expect(container.currentLayout?.id).toBe('layout-b');
    expect(mountEl.childElementCount).toBeGreaterThan(0);
    expect(scene2.mount).toHaveBeenCalled();
    expect(errors).toHaveLength(0);
    container.dispose();
  });

  it('rejects the queued setScene and reports when recovery boot also fails', async () => {
    let rejectA!: (reason: Error) => void;
    let rejectB!: (reason: Error) => void;
    registerLazyLayout(
      'layout-a',
      () =>
        new Promise<ILayoutConstructor>((_resolve, reject) => {
          rejectA = reject;
        }),
      testMeta
    );
    registerLazyLayout(
      'layout-b',
      () =>
        new Promise<ILayoutConstructor>((_resolve, reject) => {
          rejectB = reject;
        }),
      testMeta
    );

    const container = createSceneContainer({ mount: mountEl });
    const scene1 = makeScene('scene-1', 'layout-a');
    const scene2 = makeScene('scene-2', 'layout-b');
    const errors: Array<{ error: unknown }> = [];
    container.on('layout:switch-error', (payload) => {
      errors.push(payload);
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const p1 = container.setScene(scene1);
    await waitUntil(
      () => typeof rejectA === 'function',
      'layout-a loader did not start'
    );
    const p2 = container.setScene(scene2);
    rejectA(new Error('boot boom'));
    await waitUntil(
      () => typeof rejectB === 'function',
      'recovery boot did not start layout-b create'
    );
    rejectB(new Error('recovery boom'));

    await expect(p1).rejects.toThrow('boot boom');
    await expect(p2).rejects.toThrow('recovery boom');
    expect(container.currentLayout).toBeNull();
    expect(mountEl.childElementCount).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(String((errors[0]?.error as Error)?.message ?? '')).toContain(
      'recovery boom'
    );
    container.dispose();
  });
});

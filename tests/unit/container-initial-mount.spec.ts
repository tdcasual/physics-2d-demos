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

describe('SceneContainer initial mount serialization', () => {
  let mountEl: HTMLElement;

  beforeEach(() => {
    layoutRegistry.clear();
    registerLayoutTestAdapter('initial-mount-adapter');
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
});

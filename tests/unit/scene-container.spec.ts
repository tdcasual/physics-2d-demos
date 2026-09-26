import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createSceneContainer } from '../../src/app/layouts/container';
import type { Scene } from '../../src/app/layouts/types';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';

// Mock layout registry
vi.mock('../../src/app/layouts/registry', () => ({
  layoutRegistry: {
    has: vi.fn(() => true),
    create: vi.fn((id: string) => ({
      id,
      capabilities: [],
      mount: vi.fn().mockResolvedValue(undefined),
      unmount: vi.fn().mockResolvedValue(undefined),
      enter: vi.fn().mockResolvedValue(undefined),
      exit: vi.fn().mockResolvedValue(undefined),
      setTheme: vi.fn(),
      handleResize: vi.fn(),
      _updateConfig: vi.fn(),
      getSlots: vi.fn(() => ({
        header: document.createElement('div'),
        control: document.createElement('div'),
        animation: document.createElement('div'),
        graph: document.createElement('div'),
        readout: document.createElement('div')
      }))
    })),
    getAllMetadata: vi.fn(() => []),
    returnInstance: vi.fn(),
    clearPool: vi.fn()
  }
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
    expect(mount.style.overflow).toBe('hidden');
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

  it('should persist layout preference to localStorage (without theme field)', () => {
    const container = createSceneContainer({ mount, storageKey: 'test-state' });

    container.setUserPreferredLayout('mobile-stack');

    const saved = localStorage.getItem('test-state');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.preferredLayout).toBe('mobile-stack');
    // 主题不再写入容器状态，由 theme-store 统一管理
    expect('theme' in parsed).toBe(false);
  });

  it('should restore preferred layout from persisted state', () => {
    localStorage.setItem(
      'test-state',
      JSON.stringify({
        v: 1,
        preferredLayout: 'split-right'
      })
    );

    const container = createSceneContainer({ mount, storageKey: 'test-state' });
    expect(container.getUserPreferredLayout()).toBe('split-right');
  });

  it('should restore theme from the unified theme-store key', () => {
    localStorage.setItem(
      'physics-lab-theme',
      JSON.stringify({ v: 1, theme: 'dark' })
    );

    const container = createSceneContainer({ mount, storageKey: 'test-state' });
    expect(container.getTheme()).toBe('dark');
  });

  it('should migrate theme from legacy container state', () => {
    localStorage.setItem(
      'physics-demos-container-state',
      JSON.stringify({ v: 1, theme: 'dark', preferredLayout: 'split-right' })
    );

    const container = createSceneContainer({ mount });
    expect(container.getTheme()).toBe('dark');
  });

  it('should prefer explicit defaultTheme over stored theme', () => {
    localStorage.setItem(
      'physics-lab-theme',
      JSON.stringify({ v: 1, theme: 'dark' })
    );

    const container = createSceneContainer({ mount, defaultTheme: 'light' });
    expect(container.getTheme()).toBe('light');
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

  it('should merge config overrides only for the selected layout', async () => {
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({
      mount,
      layoutConfig: {
        hasGraph: false,
        readoutCollapsed: true,
        layoutOverrides: {
          'mobile-stack': { hasGraph: true }
        }
      }
    });

    await container.switchLayout('split-right', { animate: false });
    expect(layoutRegistry.create).toHaveBeenLastCalledWith(
      'split-right',
      mount,
      expect.objectContaining({
        hasGraph: false,
        readoutCollapsed: true
      })
    );

    await container.switchLayout('mobile-stack', { animate: false });
    const mobileConfig = vi
      .mocked(layoutRegistry.create)
      .mock.calls.at(-1)?.[2];
    expect(mobileConfig).toEqual(
      expect.objectContaining({
        hasGraph: true,
        readoutCollapsed: true
      })
    );
    expect(mobileConfig).not.toHaveProperty('layoutOverrides');
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
    const container = createSceneContainer({ mount });

    await container.switchLayout('split-right', {
      animate: false,
      savePreference: true
    });
    expect(container.getUserPreferredLayout()).toBe('split-right');
  });

  it('should restore focus by stable data identity across layout rebuilds', async () => {
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    const container = createSceneContainer({ mount });

    await container.switchLayout('split-right', { animate: false });

    const outgoing = document.createElement('button');
    outgoing.className = 'control-[contains-special-selector-chars]';
    outgoing.dataset.controlKey = 'velocity';
    mount.appendChild(outgoing);
    outgoing.focus();

    const incoming = document.createElement('button');
    incoming.className = 'new-layout-control';
    incoming.dataset.controlKey = 'velocity';
    vi.mocked(layoutRegistry.create).mockImplementationOnce(
      async (id: string, target: HTMLElement) => ({
        id,
        name: id,
        description: 'test layout',
        supportedSlots: [] as never[],
        capabilities: [],
        mount: vi.fn().mockImplementation(async () => {
          target.appendChild(incoming);
        }),
        unmount: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn().mockResolvedValue(undefined),
        exit: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn(),
        handleResize: vi.fn(),
        _updateConfig: vi.fn(),
        getSlots: vi.fn(() => ({}))
      })
    );

    await container.switchLayout('mobile-stack', { animate: false });

    expect(document.activeElement).toBe(incoming);
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
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene);

    expect(listener).toHaveBeenCalledWith({ sceneId: 'test-scene' });

    container.dispose();
  });

  it('does not read or write leftover scene-id localStorage keys', async () => {
    const leftoverKey = 'physics-demos-container-state-scene-test-scene';
    localStorage.setItem(
      leftoverKey,
      JSON.stringify({ v: 1, state: { angle: 45 } })
    );

    const container = createSceneContainer({ mount });
    const mockScene = {
      id: 'test-scene',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;

    await container.setScene(mockScene);
    expect(localStorage.getItem(leftoverKey)).toBe(
      JSON.stringify({ v: 1, state: { angle: 45 } })
    );

    const mockScene2 = {
      id: 'other-scene',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;
    await container.setScene(mockScene2);

    expect(localStorage.getItem(leftoverKey)).toBe(
      JSON.stringify({ v: 1, state: { angle: 45 } })
    );
    expect(
      Object.keys(localStorage).filter((k) => k.includes('-scene-'))
    ).toEqual([leftoverKey]);

    container.dispose();
  });

  // Integration: real layouts build a canvas that renderAnimation must find.
  // The mock-based tests above can't catch bugs where the canvas is
  // accidentally destroyed — the mock getSlots() returns empty divs with no
  // canvas, and the mock scene has no renderAnimation to call querySelector.
  describe('canvas survival (real layout DOM)', () => {
    it('should preserve canvas in animation slot after slot clearing', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      const slots = layout.getSlots();
      const canvas = slots?.animation?.querySelector('canvas');
      expect(canvas).not.toBeNull();

      // This is what renderSceneToSlots does: clear control/graph/readout
      // but NOT animation (canvas must survive)
      if (slots?.control) slots.control.innerHTML = '';
      if (slots?.graph) slots.graph.innerHTML = '';
      if (slots?.readout) slots.readout.innerHTML = '';

      // Animation slot must still contain the canvas
      const canvasAfter = slots?.animation?.querySelector('canvas');
      expect(canvasAfter).not.toBeNull();
      expect(canvasAfter).toBe(canvas); // same element, not replaced

      await layout.unmount();
      container.remove();
    });

    it('should allow renderAnimation to find canvas via querySelector', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      const slots = layout.getSlots();
      const animSlot = slots?.animation;
      expect(animSlot).toBeDefined();

      // Simulate what SceneAdapter.renderAnimation does
      const canvas = animSlot!.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);

      // Verify the canvas is a child of the animation slot
      expect(animSlot!.contains(canvas!)).toBe(true);

      await layout.unmount();
      container.remove();
    });

    it('should work with MobileStackLayout as well', async () => {
      const container = document.createElement('div');
      container.style.width = '400px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new MobileStackLayout(container);
      await layout.mount();

      const slots = layout.getSlots();
      const canvas = slots?.animation?.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);

      await layout.unmount();
      container.remove();
    });

    it('should survive unmount and remount cycle', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      // First render
      const slots1 = layout.getSlots();
      const canvas1 = slots1?.animation?.querySelector('canvas');
      expect(canvas1).not.toBeNull();

      await layout.unmount();
      container.replaceChildren();

      // Second mount — fresh layout
      const layout2 = new SplitRightLayout(container, { hideHeader: true });
      await layout2.mount();

      const slots2 = layout2.getSlots();
      const canvas2 = slots2?.animation?.querySelector('canvas');
      expect(canvas2).not.toBeNull();
      expect(canvas2).toBeInstanceOf(HTMLCanvasElement);

      await layout2.unmount();
      container.remove();
    });

    it('should keep canvas after multiple getSlots calls', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      // getSlots must be idempotent — calling it multiple times returns same canvas
      const slots1 = layout.getSlots();
      const canvas1 = slots1?.animation?.querySelector('canvas');
      const slots2 = layout.getSlots();
      const canvas2 = slots2?.animation?.querySelector('canvas');

      expect(canvas1).toBe(canvas2);

      await layout.unmount();
      container.remove();
    });
  });

  // Verifies applyResponsiveColumns doesn't overwrite sidebar-hidden state (H2 fix)
  describe('responsive columns & sidebar hidden state', () => {
    it('should preserve 0px first column when sidebar is hidden', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      // Simulate sidebar-toggle hiding the sidebar
      container.style.gridTemplateColumns = '0px 0px 1fr';

      // Trigger resize — this calls handleResize → applyResponsiveColumns
      layout.handleResize(1100, 800);

      // Sidebar should still be hidden (0px first two columns)
      expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

      await layout.unmount();
      container.remove();
    });

    it('should preserve 0px first column at tablet breakpoint', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, {
        hideHeader: true,
        tabletBreakpoint: 1100
      });
      await layout.mount();

      // Hide sidebar, then resize to tablet width
      container.style.gridTemplateColumns = '0px 0px 1fr';
      layout.handleResize(900, 800);

      expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

      await layout.unmount();
      container.remove();
    });

    it('should NOT preserve sidebar hidden at mobile breakpoint', async () => {
      const container = document.createElement('div');
      container.style.width = '1200px';
      container.style.height = '800px';
      document.body.appendChild(container);

      const layout = new SplitRightLayout(container, {
        hideHeader: true,
        mobileBreakpoint: 500
      });
      await layout.mount();

      // Hide the sidebar, then resize to mobile width
      container.style.gridTemplateColumns = '0px 8px 1fr';
      layout.handleResize(400, 800);

      // At mobile breakpoint, the layout switches to single-column
      expect(container.style.gridTemplateColumns).toBe('1fr');

      await layout.unmount();
      container.remove();
    });
  });

  // Verifies the stale style cleanup doesn't break container-level styles
  describe('container style management', () => {
    it('should preserve constructor-set styles after layout mount', async () => {
      const container = document.createElement('div');
      // Simulate constructor cssText
      container.style.cssText =
        'width: 100%; height: 100%; overflow: hidden; position: relative;';
      document.body.appendChild(container);

      // Simulate stale inline style cleanup (as done in _setupIncomingLayout)
      container.style.display = '';
      container.style.gridTemplateColumns = '';
      container.style.gridTemplateRows = '';

      const layout = new SplitRightLayout(container, { hideHeader: true });
      await layout.mount();

      // Layout sets display, height, overflow, gridTemplateColumns
      // but must NOT clear width or position (constructor-set)
      expect(container.style.width).toBe('100%');
      expect(container.style.position).toBe('relative');
      expect(container.style.display).toBe('grid');

      await layout.unmount();
      container.remove();
    });

    it('should not clear constructor height on mobile layout mount', async () => {
      const container = document.createElement('div');
      container.style.cssText =
        'width: 100%; height: 100%; overflow: hidden; position: relative;';
      document.body.appendChild(container);

      // Simulate stale style cleanup
      container.style.display = '';
      container.style.gridTemplateColumns = '';
      container.style.gridTemplateRows = '';

      const layout = new MobileStackLayout(container);
      await layout.mount();

      // Constructor-set properties must survive
      expect(container.style.width).toBe('100%');
      expect(container.style.position).toBe('relative');

      await layout.unmount();
      container.remove();
    });
  });
});

describe('SceneContainerImpl selection & concurrency (Fix 1 / Fix 5)', () => {
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

  function makeScene(): Scene {
    return {
      id: 'scene-fix',
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;
  }

  const flush = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it('passes forceLayout into the selection context (Fix 1)', async () => {
    const { layoutSelector } = await import('../../src/app/layouts/selector');
    const captured: Array<Record<string, unknown>> = [];
    (layoutSelector.select as ReturnType<typeof vi.fn>).mockImplementation(
      (ctx: Record<string, unknown>) => {
        captured.push(ctx);
        return 'split-right';
      }
    );

    const container = createSceneContainer({ mount, forceLayout: 'lab-stage' });
    await container.setScene(makeScene());

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].forcedLayout).toBe('lab-stage');
    container.dispose();
  });

  it('leaves forcedLayout undefined without the option (Fix 1)', async () => {
    const { layoutSelector } = await import('../../src/app/layouts/selector');
    const captured: Array<Record<string, unknown>> = [];
    (layoutSelector.select as ReturnType<typeof vi.fn>).mockImplementation(
      (ctx: Record<string, unknown>) => {
        captured.push(ctx);
        return 'split-right';
      }
    );

    const container = createSceneContainer({ mount });
    await container.setScene(makeScene());

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].forcedLayout).toBeUndefined();
    container.dispose();
  });

  it('queues a concurrent manual switch and drains it after the current one (Fix 5)', async () => {
    const container = createSceneContainer({ mount });
    await container.setScene(makeScene());
    expect(container.currentLayout?.id).toBe('split-right');

    const first = container.switchLayout('mobile-stack', { reason: 'manual' });
    const second = container.switchLayout('lab-stage', { reason: 'manual' });
    await Promise.all([first, second]);
    await flush();

    expect(container.currentLayout?.id).toBe('lab-stage');
    container.dispose();
  });

  it('drops a concurrent auto switch without queueing (Fix 5)', async () => {
    const container = createSceneContainer({ mount });
    await container.setScene(makeScene());

    const first = container.switchLayout('mobile-stack', { reason: 'manual' });
    const second = container.switchLayout('lab-stage', {
      reason: 'auto',
      animate: false
    });
    await Promise.all([first, second]);
    await flush();

    expect(container.currentLayout?.id).toBe('mobile-stack');
    container.dispose();
  });

  it('abandons a timed-out switch at the await boundary and drains the queue (Fix 5)', async () => {
    vi.useFakeTimers();
    try {
      const container = createSceneContainer({ mount });
      await container.setScene(makeScene());
      expect(container.currentLayout?.id).toBe('split-right');

      // 下一次 registry.create 挂起（模拟惰性 chunk 网络悬挂）
      const { layoutRegistry } = await import('../../src/app/layouts/registry');
      let releaseCreate: (value: unknown) => void = () => {};
      const gate = new Promise((resolve) => {
        releaseCreate = resolve;
      });
      (
        layoutRegistry.create as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(() => gate);

      const hung = container.switchLayout('mobile-stack', {
        reason: 'manual'
      });
      await vi.advanceTimersByTimeAsync(0);
      // 拆卸已完成、装配挂起：当前布局被清空
      expect(container.currentLayout).toBeNull();

      // 悬挂期间的手动切换进入队列
      const queued = container.switchLayout('lab-stage', { reason: 'manual' });

      // 安全计时器判死当前代并交棒：排队中的 lab-stage 立即被 drain 执行
      await vi.advanceTimersByTimeAsync(10_000);
      expect(container.currentLayout?.id).toBe('lab-stage');

      // 旧协程迟完成：在 await 边界作废，不得挂载其布局
      const lateLayout = {
        id: 'mobile-stack',
        capabilities: [],
        mount: vi.fn(),
        unmount: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn(),
        handleResize: vi.fn(),
        getSlots: () => ({
          control: document.createElement('div'),
          animation: document.createElement('div')
        })
      };
      releaseCreate(lateLayout);
      await vi.advanceTimersByTimeAsync(0);
      await hung;
      await queued;

      expect(lateLayout.mount).not.toHaveBeenCalled();
      expect(container.currentLayout?.id).toBe('lab-stage');
      container.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('SceneContainerImpl Codex-challenged edge cases (Fix 1 / Fix 5 / Fix 6)', () => {
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

  function makeScene(id = 'scene-fix'): Scene {
    return {
      id,
      preferredLayout: 'split-right',
      renderAnimation: vi.fn(),
      renderControl: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn(() => vi.fn())
    } as unknown as Scene;
  }

  const flush = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it('keeps the forced layout under low-power mode (Fix 1)', async () => {
    const { layoutSelector } = await import('../../src/app/layouts/selector');
    (layoutSelector.select as ReturnType<typeof vi.fn>).mockImplementation(
      () => 'split-right'
    );

    const container = createSceneContainer({ mount, forceLayout: 'lab-stage' });
    // 低功耗模式会试图把无偏好的选择覆盖为 mobile-stack；
    // 强制档不可被覆盖。
    (container as unknown as { _lowPowerMode: boolean })._lowPowerMode = true;
    await container.setScene(makeScene());

    expect(container.currentLayout?.id).toBe('split-right');
    container.dispose();
  });

  it('still applies the low-power override without forceLayout (Fix 1)', async () => {
    const { layoutSelector } = await import('../../src/app/layouts/selector');
    (layoutSelector.select as ReturnType<typeof vi.fn>).mockImplementation(
      () => 'split-right'
    );

    // 注册表 mock 的元数据为空：注入无约束的 mobile-stack 元数据，
    // 隔离验证低功耗覆盖逻辑本身。
    const { layoutRegistry } = await import('../../src/app/layouts/registry');
    (layoutRegistry.getAllMetadata as ReturnType<typeof vi.fn>).mockReturnValue(
      [
        {
          id: 'mobile-stack',
          priority: 100,
          autoSelectable: true,
          constraints: {}
        }
      ]
    );

    const container = createSceneContainer({ mount });
    (container as unknown as { _lowPowerMode: boolean })._lowPowerMode = true;
    await container.setScene(makeScene());

    expect(container.currentLayout?.id).toBe('mobile-stack');
    container.dispose();
  });

  it('does not emit events or persist preference when enter-hang is abandoned (Fix 5)', async () => {
    vi.useFakeTimers();
    try {
      const { layoutRegistry } = await import('../../src/app/layouts/registry');
      const container = createSceneContainer({ mount });
      await container.setScene(makeScene());

      let releaseEnter: (value: undefined) => void = () => {};
      const enterGate = new Promise<undefined>((resolve) => {
        releaseEnter = resolve;
      });
      (
        layoutRegistry.create as ReturnType<typeof vi.fn>
      ).mockImplementationOnce((id: string) => ({
        id,
        capabilities: [],
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(() => enterGate),
        exit: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn(),
        handleResize: vi.fn(),
        _updateConfig: vi.fn(),
        getSlots: () => ({
          control: document.createElement('div'),
          animation: document.createElement('div')
        })
      }));
      const changeSpy = vi.fn();
      container.on('layout:change', changeSpy);

      const hung = container.switchLayout('lab-stage', {
        reason: 'manual',
        savePreference: true
      });
      await vi.advanceTimersByTimeAsync(0);
      // enter 挂起期间到达超时：判死当前代
      await vi.advanceTimersByTimeAsync(10_000);
      releaseEnter(undefined);
      await vi.advanceTimersByTimeAsync(0);
      await hung;

      // 旧代不得写事件与偏好
      expect(
        changeSpy.mock.calls.filter((call) => call[0].to === 'lab-stage')
      ).toHaveLength(0);
      const stored = JSON.parse(
        localStorage.getItem('physics-demos-container-state') ?? '{}'
      );
      expect(stored.preferredLayout).not.toBe('lab-stage');
      container.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('drains pendingScene before pendingSwitchId (Fix 5)', async () => {
    const container = createSceneContainer({ mount });
    const scene1 = makeScene('scene-1');
    await container.setScene(scene1);

    const switchPromise = container.switchLayout('lab-stage', {
      reason: 'manual'
    });
    // 切换进行中：排入 pendingScene（last-wins）与 pendingSwitchId
    const scene2 = makeScene('scene-2');
    const setPromise = container.setScene(scene2);
    const layoutPromise = container.switchLayout('lab-stage', {
      reason: 'manual'
    });
    await Promise.all([switchPromise, setPromise, layoutPromise]);
    await flush();

    // pendingScene 先（setScene 自行解析布局），pendingSwitchId 后
    expect(container.currentScene).toBe(scene2);
    expect(container.currentLayout?.id).toBe('lab-stage');
    container.dispose();
  });
});

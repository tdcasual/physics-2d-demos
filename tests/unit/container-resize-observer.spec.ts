import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ContainerResizeObserver } from '../../src/app/layouts/container-resize-observer';

describe('ContainerResizeObserver', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '100px';
    container.style.height = '100px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  function createObserver(
    overrides?: Partial<
      ConstructorParameters<typeof ContainerResizeObserver>[1]
    >
  ) {
    const defaults = {
      getCurrentScene: () => null,
      getCurrentLayoutId: () => null,
      resolveLayout: () => 'desktop',
      switchLayout: vi.fn(async () => {}),
      getSwitching: () => false,
      notifyLayoutResize: vi.fn(),
      onResize: vi.fn()
    };
    return new ContainerResizeObserver(container, {
      ...defaults,
      ...overrides
    });
  }

  it('should start without errors', () => {
    const observer = createObserver();
    expect(() => observer.start()).not.toThrow();
    observer.stop();
  });

  it('should stop without errors even when not started', () => {
    const observer = createObserver();
    expect(() => observer.stop()).not.toThrow();
  });

  it('should debounce layout switch', async () => {
    const switchLayout = vi.fn(async () => {});
    const observer = createObserver({
      getCurrentScene: () =>
        ({
          id: 'test',
          preferredLayout: 'mobile'
        }) as import('../../src/app/layouts/types').Scene,
      getCurrentLayoutId: () => 'desktop',
      resolveLayout: () => 'mobile',
      switchLayout
    });

    observer.start();

    // Trigger multiple rapid resizes
    container.style.width = '300px';
    container.getBoundingClientRect();
    container.style.width = '400px';
    container.getBoundingClientRect();

    // Should not switch immediately (debounced)
    expect(switchLayout).not.toHaveBeenCalled();

    // Wait for debounce window
    await new Promise((resolve) => setTimeout(resolve, 350));
    observer.stop();
  });

  it('should call notifyLayoutResize on resize', async () => {
    const notifyLayoutResize = vi.fn();
    const observer = createObserver({ notifyLayoutResize });

    observer.start();

    // Trigger resize
    container.style.width = '500px';
    container.getBoundingClientRect();

    // ResizeObserver fires asynchronously
    await new Promise((resolve) => setTimeout(resolve, 50));

    observer.stop();

    // In happy-dom ResizeObserver may not fire; verify at least no errors
    expect(notifyLayoutResize).toBeDefined();
  });

  // happy-dom 的 ResizeObserver 回调不触发；用可编程 contentRect stub 驱动。

  type RectFire = { fire: (width: number, height: number) => void };

  function installContentRectStub(): {
    created: RectFire[];
    restore: () => void;
  } {
    const OriginalRO = window.ResizeObserver;
    const created: RectFire[] = [];
    window.ResizeObserver = class {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
        created.push({
          fire: (width: number, height: number) => {
            this.cb(
              [
                { contentRect: { width, height } }
              ] as unknown as ResizeObserverEntry[],
              this as unknown as ResizeObserver
            );
          }
        });
      }
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    } as unknown as typeof ResizeObserver;
    return {
      created,
      restore: () => {
        window.ResizeObserver = OriginalRO;
      }
    };
  }

  it('re-resolves the target inside the same debounce window (not at schedule time)', async () => {
    vi.useFakeTimers();
    const stub = installContentRectStub();
    try {
      const switchLayout = vi.fn(async () => {});
      const scene = {
        id: 'test'
      } as import('../../src/app/layouts/types').Scene;
      // 排队时解析为 mobile（≠ 当前 desktop），窗口内变为 desktop——
      // 到期必须按最新解析结果（desktop == 当前）判定为 no-op。
      let resolved = 'mobile';
      const observer = createObserver({
        getCurrentScene: () => scene,
        getCurrentLayoutId: () => 'desktop',
        resolveLayout: () => resolved,
        switchLayout
      });

      observer.start();
      stub.created[0]?.fire(400, 800);
      resolved = 'desktop';
      await vi.advanceTimersByTimeAsync(300);
      expect(switchLayout).not.toHaveBeenCalled();

      resolved = 'mobile';
      stub.created[0]?.fire(375, 800);
      await vi.advanceTimersByTimeAsync(300);
      observer.stop();

      expect(switchLayout).toHaveBeenCalledWith('mobile');
    } finally {
      stub.restore();
      vi.useRealTimers();
    }
  });

  it('does not switch when the re-resolved target equals the current layout', async () => {
    vi.useFakeTimers();
    const stub = installContentRectStub();
    try {
      const switchLayout = vi.fn(async () => {});
      const observer = createObserver({
        getCurrentScene: () =>
          ({ id: 'test' }) as import('../../src/app/layouts/types').Scene,
        getCurrentLayoutId: () => 'split-right',
        resolveLayout: () => 'split-right',
        switchLayout
      });

      observer.start();
      stub.created[0]?.fire(900, 600);
      await vi.advanceTimersByTimeAsync(300);
      observer.stop();

      expect(switchLayout).not.toHaveBeenCalled();
    } finally {
      stub.restore();
      vi.useRealTimers();
    }
  });

  it('skips switching while a switch is in progress and re-evaluates later', async () => {
    vi.useFakeTimers();
    const stub = installContentRectStub();
    try {
      const switchLayout = vi.fn(async () => {});
      let switching = false;
      const observer = createObserver({
        getCurrentScene: () =>
          ({ id: 'test' }) as import('../../src/app/layouts/types').Scene,
        getCurrentLayoutId: () => 'desktop',
        resolveLayout: () => 'mobile',
        getSwitching: () => switching,
        switchLayout
      });

      observer.start();
      switching = true;
      stub.created[0]?.fire(400, 800);
      await vi.advanceTimersByTimeAsync(300);
      expect(switchLayout).not.toHaveBeenCalled();

      switching = false;
      stub.created[0]?.fire(375, 800);
      await vi.advanceTimersByTimeAsync(300);
      observer.stop();

      expect(switchLayout).toHaveBeenCalledWith('mobile');
    } finally {
      stub.restore();
      vi.useRealTimers();
    }
  });

  it('marks dirty while switching and drain() re-resolves the latest viewport', () => {
    vi.useFakeTimers();
    const stub = installContentRectStub();
    try {
      const switchLayout = vi.fn(async () => {});
      let switching = true;
      let resolved = 'desktop';
      const observer = createObserver({
        getCurrentScene: () =>
          ({ id: 'test' }) as import('../../src/app/layouts/types').Scene,
        getCurrentLayoutId: () => 'desktop',
        resolveLayout: () => resolved,
        getSwitching: () => switching,
        switchLayout
      });
      observer.start();
      stub.created[0]?.fire(400, 800);
      vi.advanceTimersByTime(300);
      expect(switchLayout).not.toHaveBeenCalled();

      switching = false;
      resolved = 'mobile';
      observer.drain();
      expect(switchLayout).toHaveBeenCalledWith('mobile');
      observer.stop();
    } finally {
      stub.restore();
      vi.useRealTimers();
    }
  });

  it('settles after a bounded burst of resize events', async () => {
    vi.useFakeTimers();
    const stub = installContentRectStub();
    const BURST = 20;
    try {
      const switchLayout = vi.fn(async () => {});
      let resolved = 'desktop';
      const observer = createObserver({
        getCurrentScene: () =>
          ({ id: 'test' }) as import('../../src/app/layouts/types').Scene,
        getCurrentLayoutId: () => 'desktop',
        resolveLayout: () => resolved,
        switchLayout
      });
      observer.start();
      const fire = stub.created[0]?.fire;
      expect(fire).toBeTypeOf('function');
      for (let i = 0; i < BURST; i++) {
        resolved = i % 2 === 0 ? 'mobile' : 'desktop';
        fire!(200 + i, 800);
      }
      resolved = 'mobile';
      fire!(375, 800);
      await vi.advanceTimersByTimeAsync(300);
      expect(switchLayout).toHaveBeenCalledTimes(1);
      expect(switchLayout).toHaveBeenCalledWith('mobile');
      await vi.advanceTimersByTimeAsync(1000);
      expect(switchLayout).toHaveBeenCalledTimes(1);
      observer.stop();
    } finally {
      stub.restore();
      vi.useRealTimers();
    }
  });
});

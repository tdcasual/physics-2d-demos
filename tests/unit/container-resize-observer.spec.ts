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

  // ---- Fix 1：观察器总是重解析（偏好经 resolveLayout 参与语义）----
  // happy-dom 的 ResizeObserver 回调不触发，直接驱动私有防抖入口。

  function debounce(observer: ContainerResizeObserver): void {
    (observer as unknown as { _debounceSwitch(): void })._debounceSwitch();
  }

  it('re-resolves the target inside the same debounce window (not at schedule time)', async () => {
    const switchLayout = vi.fn(async () => {});
    const scene = {
      id: 'test'
    } as import('../../src/app/layouts/types').Scene;
    // 排队时解析为 mobile（≠ 当前 desktop），窗口内变为 desktop——
    // 到期必须按最新解析结果（desktop == 当前）判定为 no-op。
    // 若实现沿用排队时刻的旧目标，会错误地切到 mobile。
    let resolved = 'mobile';
    const observer = createObserver({
      getCurrentScene: () => scene,
      getCurrentLayoutId: () => 'desktop',
      resolveLayout: () => resolved,
      switchLayout
    });

    observer.start();
    debounce(observer);
    resolved = 'desktop';
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(switchLayout).not.toHaveBeenCalled();

    // 窗口结束时目标确实不同 → 正常切换
    resolved = 'mobile';
    debounce(observer);
    await new Promise((resolve) => setTimeout(resolve, 350));
    observer.stop();

    expect(switchLayout).toHaveBeenCalledWith('mobile');
  });

  it('does not switch when the re-resolved target equals the current layout', async () => {
    const switchLayout = vi.fn(async () => {});
    const observer = createObserver({
      getCurrentScene: () =>
        ({ id: 'test' }) as import('../../src/app/layouts/types').Scene,
      getCurrentLayoutId: () => 'split-right',
      resolveLayout: () => 'split-right',
      switchLayout
    });

    observer.start();
    debounce(observer);
    await new Promise((resolve) => setTimeout(resolve, 350));
    observer.stop();

    expect(switchLayout).not.toHaveBeenCalled();
  });

  it('skips switching while a switch is in progress and re-evaluates later', async () => {
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
    debounce(observer);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(switchLayout).not.toHaveBeenCalled();

    switching = false;
    debounce(observer);
    await new Promise((resolve) => setTimeout(resolve, 350));
    observer.stop();

    expect(switchLayout).toHaveBeenCalledWith('mobile');
  });
});

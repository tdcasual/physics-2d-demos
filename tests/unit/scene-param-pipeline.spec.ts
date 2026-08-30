/**
 * bootScenePage URL 参数管线集成测试
 *
 * 验证 bootstrapper 在 createControls 包装中注入的
 * urlParams / writeParam，以及 createControls 返回后统一执行的
 * applySceneUrlParams 管线（readSceneParams → setParams → 句柄回写 → 首绘）。
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { bootScenePage } from '../../src/app/scene-bootstrapper';
import { SceneAdapter } from '../../src/app/scene-adapter';
import type { LayoutSlots } from '../../src/app/layouts/types';
import type { SceneMeta } from '../../src/platform/scene-contract';
import { layoutRegistry } from '../../src/app/layouts/registry';

// Mock createSceneContainer to avoid heavy DOM layout logic
vi.mock('../../src/app/layouts/container', () => ({
  createSceneContainer: vi.fn(() => ({
    setScene: vi.fn().mockResolvedValue(undefined),
    setTheme: vi.fn(),
    on: vi.fn(() => vi.fn()),
    currentLayout: null,
    updateStatus: vi.fn()
  }))
}));

import { createSceneContainer } from '../../src/app/layouts/container';

const testMeta: SceneMeta = {
  id: 'test',
  title: '测试',
  category: 'mechanics',
  subject: 'test',
  concept: 'test',
  subConcepts: ['a', 'b'] as [string, string],
  keywords: [],
  objective: '',
  defaultParams: { speed: 20, ratio: 1.5 },
  urlSyncKeys: ['mode'],
  path: '/test'
};

function createMockScene() {
  return {
    init: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    step: vi.fn(),
    setTheme: vi.fn(),
    setMode: vi.fn(),
    setParams: vi.fn(),
    subscribe: vi.fn(() => vi.fn())
  };
}

type CapturedControlOpts = {
  mount: HTMLElement;
  scene: ReturnType<typeof createMockScene>;
  onStatus?: (text: string) => void;
  scheduleRender?: () => void;
  urlParams?: Record<string, number | string>;
  writeParam?: (key: string, value: number | string | boolean) => void;
};

function bootWithControls(
  createControls: (opts: CapturedControlOpts) => unknown,
  options?: Parameters<typeof bootScenePage>[0] extends infer O
    ? Partial<Omit<O, 'meta' | 'createScene' | 'createControls'>>
    : never
): void {
  bootScenePage({
    meta: testMeta,
    createScene: () => createMockScene() as never,
    createControls: createControls as never,
    ...options
  });
}

/** 取出 mock container 捕获的 adapter 并驱动场景与控制面板创建 */
function driveAdapter(): SceneAdapter {
  const mockContainer = (createSceneContainer as ReturnType<typeof vi.fn>).mock
    .results[0].value as { setScene: ReturnType<typeof vi.fn> };
  const adapter = mockContainer.setScene.mock.calls[0][0] as SceneAdapter;

  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  adapter.renderAnimation(container, {
    animation: container,
    control: container
  } as LayoutSlots);
  adapter.renderControl(document.createElement('div'));
  return adapter;
}

describe('bootScenePage URL param pipeline', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    localStorage.clear();
  });

  afterEach(() => {
    appDiv.remove();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
    layoutRegistry.clear();
  });

  it('injects urlParams and writeParam into createControls', () => {
    window.history.replaceState({}, '', '/test.html?speed=30&bogus=1');
    let captured: CapturedControlOpts | undefined;
    bootWithControls((opts) => {
      captured = opts;
      return { dispose: vi.fn() };
    });
    driveAdapter();

    expect(captured).toBeDefined();
    // 合法键快照（bogus 被过滤）
    expect(captured!.urlParams).toEqual({ speed: 30 });
    expect(typeof captured!.writeParam).toBe('function');
    expect(typeof captured!.scheduleRender).toBe('function');
  });

  it('applies URL params to scene and reflects into controls handle, then renders', () => {
    window.history.replaceState({}, '', '/test.html?speed=30&mode=fast');
    let scene: ReturnType<typeof createMockScene> | undefined;
    const setValue = vi.fn();
    const setActive = vi.fn();
    bootWithControls((opts) => {
      scene = opts.scene;
      return { setValue, setActive, dispose: vi.fn() };
    });
    driveAdapter();

    expect(scene!.setParams).toHaveBeenCalledWith({ speed: 30 });
    expect(scene!.setParams).toHaveBeenCalledWith({ mode: 'fast' });
    expect(setValue).toHaveBeenCalledWith('speed', 30);
    expect(setActive).toHaveBeenCalledWith('mode', 'fast');
    expect(scene!.render).toHaveBeenCalled();
  });

  it('is a no-op when URL has no legal params', () => {
    window.history.replaceState({}, '', '/test.html?bogus=1');
    let scene: ReturnType<typeof createMockScene> | undefined;
    const setValue = vi.fn();
    bootWithControls((opts) => {
      scene = opts.scene;
      return { setValue, dispose: vi.fn() };
    });
    driveAdapter();

    expect(scene!.setParams).not.toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
  });

  it('writeParam writes legal keys and silently drops illegal ones', async () => {
    let captured: CapturedControlOpts | undefined;
    bootWithControls((opts) => {
      captured = opts;
      return { dispose: vi.fn() };
    });
    driveAdapter();

    const flush = () => new Promise((resolve) => setTimeout(resolve, 200));

    captured!.writeParam!('speed', 40);
    await flush();
    expect(new URL(window.location.href).searchParams.get('speed')).toBe('40');

    captured!.writeParam!('preset', 'earth'); // preset 是合法键
    await flush();
    expect(new URL(window.location.href).searchParams.get('preset')).toBe(
      'earth'
    );

    captured!.writeParam!('bogus', 1);
    await flush();
    const url = new URL(window.location.href);
    expect(url.searchParams.has('bogus')).toBe(false);
    // 既有合法参数不受影响
    expect(url.searchParams.get('speed')).toBe('40');
  });

  it('invokes paramSync.applyParam hook through the pipeline', () => {
    window.history.replaceState({}, '', '/test.html?preset=moon&speed=25');
    let scene: ReturnType<typeof createMockScene> | undefined;
    const applyParam = vi.fn((key: string) => key === 'preset');
    bootWithControls(
      (opts) => {
        scene = opts.scene;
        return { dispose: vi.fn() };
      },
      { paramSync: { applyParam } as never }
    );
    driveAdapter();

    expect(applyParam).toHaveBeenCalledWith(
      'preset',
      'moon',
      expect.objectContaining({ scene: scene! })
    );
    // preset 被钩子接管；speed 走默认管线
    expect(scene!.setParams).toHaveBeenCalledTimes(1);
    expect(scene!.setParams).toHaveBeenCalledWith({ speed: 25 });
  });
});

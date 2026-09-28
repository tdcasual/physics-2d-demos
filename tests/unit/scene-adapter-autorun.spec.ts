/**
 * B22 平台 fallback 三态（snapshot 闸门）。
 *
 * 与生产同源：renderAnimation → captureUrlSnapshot(readSceneParams(meta))
 * → _shouldAutoPlay。自建 meta 同时含 defaultParams.autoRun 与 urlSyncKeys
 * autoRun；不走 shouldAutoPlay 钩子。信号源是 snapshot（hasOwnProperty），
 * 不是 live getParams。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SceneAdapter, coerceAutoRun } from '../../src/app/scene-adapter';
import type { ScenePageOptions } from '../../src/app/scene-bootstrapper-types';
import type { LayoutSlots } from '../../src/app/layouts/types';
import type { SceneMeta } from '../../src/platform/scene-contract';

function createMockScene(params: Record<string, unknown> = {}) {
  return {
    init: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    setTheme: vi.fn(),
    setMode: vi.fn(),
    startAll: vi.fn(),
    pauseAll: vi.fn(),
    setTimeScale: vi.fn(),
    getState: vi.fn(() => ({})),
    getParams: vi.fn(() => params),
    subscribe: vi.fn(() => vi.fn())
  };
}

function autoRunMeta(defaultAutoRun: number): SceneMeta {
  return {
    id: 'test-autorun',
    title: '测试',
    category: 'mechanics',
    subject: 'test',
    concept: 'test',
    subConcepts: ['a', 'b'],
    keywords: [],
    objective: '',
    defaultParams: { autoRun: defaultAutoRun },
    urlSyncKeys: ['autoRun'],
    path: '/test'
  };
}

function createAdapter(
  options: Partial<ScenePageOptions> & { meta: SceneMeta }
): SceneAdapter {
  return new SceneAdapter({
    createScene: () => createMockScene() as never,
    ...options
  } as ScenePageOptions);
}

function mountAdapter(adapter: SceneAdapter) {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);
  adapter.renderAnimation(container, {
    animation: container,
    control: container
  } as LayoutSlots);
  return container;
}

describe('coerceAutoRun', () => {
  it.each([
    [0, false],
    ['0', false],
    [false, false],
    ['false', false],
    [Number.NaN, false],
    [1, true],
    ['1', true],
    [true, true],
    ['true', true],
    ['abc', true]
  ] as const)('coerceAutoRun(%j) → %s', (value, expected) => {
    expect(coerceAutoRun(value)).toBe(expected);
  });
});

describe('SceneAdapter autoRun snapshot gate (B22)', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    window.history.replaceState({}, '', '/src/pages/test.html');
  });

  afterEach(() => {
    appDiv.remove();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('snapshot autoRun=0 does not startAll (live autoRun true is ignored)', () => {
    window.history.replaceState({}, '', '/src/pages/test.html?autoRun=0');
    const scene = createMockScene({ autoRun: true });
    const adapter = createAdapter({
      meta: autoRunMeta(1),
      createScene: () => scene as never,
      autoPlay: true
    });
    mountAdapter(adapter);
    expect(scene.startAll).not.toHaveBeenCalled();
    adapter.unmount();
  });

  it('snapshot without autoRun still startAll even when live autoRun is false', () => {
    const scene = createMockScene({ autoRun: false });
    const adapter = createAdapter({
      meta: autoRunMeta(0),
      createScene: () => scene as never,
      autoPlay: true
    });
    mountAdapter(adapter);
    expect(scene.startAll).toHaveBeenCalledTimes(1);
    adapter.unmount();
  });

  it('autoPlay false does not startAll when live autoRun is true and snapshot is empty', () => {
    const scene = createMockScene({ autoRun: true });
    const adapter = createAdapter({
      meta: autoRunMeta(1),
      createScene: () => scene as never,
      autoPlay: false
    });
    mountAdapter(adapter);
    expect(scene.startAll).not.toHaveBeenCalled();
    adapter.unmount();
  });

  it('snapshot autoRun=1 startAll (restore-true branch)', () => {
    window.history.replaceState({}, '', '/src/pages/test.html?autoRun=1');
    const scene = createMockScene({ autoRun: false });
    const adapter = createAdapter({
      meta: autoRunMeta(1),
      createScene: () => scene as never,
      autoPlay: true
    });
    mountAdapter(adapter);
    expect(scene.startAll).toHaveBeenCalledTimes(1);
    adapter.unmount();
  });

  it('snapshot autoRun=abc (NaN) does not startAll', () => {
    window.history.replaceState({}, '', '/src/pages/test.html?autoRun=abc');
    const scene = createMockScene({ autoRun: true });
    const adapter = createAdapter({
      meta: autoRunMeta(1),
      createScene: () => scene as never,
      autoPlay: true
    });
    mountAdapter(adapter);
    expect(scene.startAll).not.toHaveBeenCalled();
    adapter.unmount();
  });
});

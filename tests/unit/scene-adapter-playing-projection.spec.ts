/**
 * SceneAdapter `data-scene-playing` 只读投影（Phase C 机制，Phase F 回归）。
 *
 * visual-regression 对 dynamic 场景在 first-frame 读该属性并按空格暂停。
 * 投影宿主与 data-first-frame 相同（.layout-master）。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SceneAdapter } from '../../src/app/scene-adapter';
import type { ScenePageOptions } from '../../src/app/scene-bootstrapper-types';
import type { LayoutSlots } from '../../src/app/layouts/types';

function createMockScene() {
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
    subscribe: vi.fn(() => vi.fn())
  };
}

function createAdapter(options?: Partial<ScenePageOptions>): SceneAdapter {
  return new SceneAdapter({
    meta: {
      id: 'test',
      title: '测试',
      category: 'mechanics',
      subject: 'test',
      concept: 'test',
      subConcepts: ['a', 'b'] as [string, string],
      keywords: [],
      objective: '',
      defaultParams: {},
      path: '/test'
    },
    createScene: () => createMockScene() as never,
    ...options
  } as ScenePageOptions);
}

function mountAdapter(adapter: SceneAdapter): HTMLDivElement {
  const master = document.createElement('div');
  master.className = 'layout-master';
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  master.appendChild(canvas);
  document.body.appendChild(master);
  adapter.renderAnimation(master, {
    animation: master,
    control: master
  } as LayoutSlots);
  return master;
}

describe('SceneAdapter data-scene-playing projection', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
  });

  afterEach(() => {
    appDiv.remove();
    document.querySelectorAll('.layout-master').forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  it('projects playing state onto layout-master after startAll / pauseAll / reset', () => {
    const adapter = createAdapter();
    const master = mountAdapter(adapter);

    expect(master.getAttribute('data-scene-playing')).toBe('false');

    adapter.startAll();
    expect(master.getAttribute('data-scene-playing')).toBe('true');

    adapter.pauseAll();
    expect(master.getAttribute('data-scene-playing')).toBe('false');

    adapter.startAll();
    expect(master.getAttribute('data-scene-playing')).toBe('true');

    adapter.reset();
    expect(master.getAttribute('data-scene-playing')).toBe('false');

    adapter.unmount();
  });
});

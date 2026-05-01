/**
 * SceneAdapter 边界/异常注入测试
 *
 * 覆盖：double renderAnimation、unmount 后调用方法、state flags 重置
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

function mountAdapter(adapter: SceneAdapter): { container: HTMLDivElement; canvas: HTMLCanvasElement } {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);

  adapter.renderAnimation(container, {
    animation: container,
    control: container
  } as LayoutSlots);

  return { container, canvas };
}

describe('SceneAdapter edge cases', () => {
  let appDiv: HTMLDivElement;

  beforeEach(() => {
    appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
  });

  afterEach(() => {
    appDiv.remove();
    vi.clearAllMocks();
  });

  it('double renderAnimation should dispose old scene before creating new one', () => {
    const scene1 = createMockScene();
    const scene2 = createMockScene();
    let callCount = 0;
    const adapter = createAdapter({
      createScene: () => {
        callCount++;
        return (callCount === 1 ? scene1 : scene2) as never;
      }
    });

    const { container } = mountAdapter(adapter);
    // Second renderAnimation — old scene should be disposed
    const canvas2 = document.createElement('canvas');
    canvas2.className = 'stage-canvas';
    container.appendChild(canvas2);
    adapter.renderAnimation(container, {
      animation: container,
      control: container
    } as LayoutSlots);

    expect(scene1.dispose).toHaveBeenCalled();
    expect(callCount).toBe(2);
  });

  it('unmount should reset state flags for re-mount', () => {
    const adapter = createAdapter();
    const { container: c1 } = mountAdapter(adapter);
    adapter.unmount();

    // Re-mount should work — flags are reset
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    c1.appendChild(canvas);
    expect(() => {
      adapter.renderAnimation(c1, {
        animation: c1,
        control: c1
      } as LayoutSlots);
    }).not.toThrow();
  });

  it('methods after unmount should be safe no-ops', () => {
    const scene = createMockScene();
    const adapter = createAdapter({ createScene: () => scene as never });
    mountAdapter(adapter);
    adapter.unmount();

    // None of these should throw
    expect(() => adapter.startAll()).not.toThrow();
    expect(() => adapter.pauseAll()).not.toThrow();
    expect(() => adapter.reset()).not.toThrow();
    expect(() => adapter.setTheme('dark')).not.toThrow();
    expect(() => adapter.setMode('presentation')).not.toThrow();
    expect(() => adapter.setTimeScale(2)).not.toThrow();
    expect(() => adapter.getTransportState()).not.toThrow();
    expect(() => adapter.getReadoutItems()).not.toThrow();
  });

  it('getTransportState after unmount should return defaults', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const state = adapter.getTransportState();
    expect(state).toEqual({ isPlaying: false, speed: 1 });
  });

  it('getReadoutItems after unmount should return empty array', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const items = adapter.getReadoutItems();
    expect(items).toEqual([]);
  });

  it('startAll/pauseAll before renderAnimation should be safe no-ops', () => {
    const adapter = createAdapter();
    expect(() => adapter.startAll()).not.toThrow();
    expect(() => adapter.pauseAll()).not.toThrow();
    expect(() => adapter.reset()).not.toThrow();
  });

  it('subscribe after unmount should still return unsubscribe function', () => {
    const adapter = createAdapter();
    mountAdapter(adapter);
    adapter.unmount();

    const listener = vi.fn();
    const unsub = adapter.subscribe(listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('renderGraph before renderAnimation should be safe', () => {
    const adapter = createAdapter();
    const container = document.createElement('div');
    expect(() => adapter.renderGraph(container)).not.toThrow();
    // Should not render anything without a scene
    expect(container.innerHTML).toBe('');
  });

  it('renderControl before renderAnimation should defer', () => {
    const createControls = vi.fn(() => ({ dispose: vi.fn() }));
    const scene = createMockScene();
    const adapter = createAdapter({
      createScene: () => scene as never,
      createControls
    });
    const controlContainer = document.createElement('div');
    adapter.renderControl(controlContainer);

    // Controls not created yet
    expect(createControls).not.toHaveBeenCalled();

    // After renderAnimation, controls should be created
    const animationContainer = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    animationContainer.appendChild(canvas);
    adapter.renderAnimation(animationContainer, {
      animation: animationContainer,
      control: controlContainer
    } as LayoutSlots);

    expect(createControls).toHaveBeenCalled();
  });
});

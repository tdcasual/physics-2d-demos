import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readSceneParams,
  writeSceneParams,
  resolveUrlSyncKeys,
  applySceneUrlParams
} from '../../src/app/url-sync';
import type { SceneMeta } from '../../src/platform/scene-contract';
import type {
  ParamSyncContext,
  SceneInstance
} from '../../src/app/scene-bootstrapper-types';

describe('url-sync', () => {
  const mockMeta: SceneMeta = {
    id: 'test',
    title: 'Test',
    path: '/test.html',
    keywords: [],
    objective: 'test',
    defaultParams: {
      speed: 20,
      angle: 45,
      count: 10
    },
    subject: '力学',
    concept: '测试',
    subConcepts: ['a', 'b']
  };

  beforeEach(() => {
    // Clean URL before each test
    window.history.replaceState({}, '', '/test.html');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  describe('readSceneParams', () => {
    it('reads numeric params and converts to correct types', () => {
      window.history.replaceState(
        {},
        '',
        '/test.html?speed=30&angle=60&count=5'
      );
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(30);
      expect(params.angle).toBe(60);
      expect(params.count).toBe(5);
    });

    it('preserves float params', () => {
      window.history.replaceState({}, '', '/test.html?speed=25.5&angle=45.7');
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(25.5);
      expect(params.angle).toBe(45.7);
    });

    it('ignores unknown params', () => {
      window.history.replaceState({}, '', '/test.html?speed=30&unknown=foo');
      const params = readSceneParams(mockMeta);
      expect(params.speed).toBe(30);
      expect(params.unknown).toBeUndefined();
    });

    it('supports preset param', () => {
      window.history.replaceState({}, '', '/test.html?preset=moon');
      const params = readSceneParams(mockMeta);
      expect(params.preset).toBe('moon');
    });

    it('returns empty object when no matching params', () => {
      window.history.replaceState({}, '', '/test.html?foo=bar');
      const params = readSceneParams(mockMeta);
      expect(Object.keys(params)).toHaveLength(0);
    });
  });

  describe('writeSceneParams', () => {
    it('writes params to URL', () => {
      writeSceneParams({ speed: 30, angle: 60 });
      // Wait for debounce
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.get('speed')).toBe('30');
          expect(url.searchParams.get('angle')).toBe('60');
          resolve();
        }, 200);
      });
    });

    it('deletes params when value is undefined', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      writeSceneParams({ speed: undefined });
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.has('speed')).toBe(false);
          resolve();
        }, 200);
      });
    });

    it('preserves existing unrelated params', () => {
      window.history.replaceState({}, '', '/test.html?existing=foo');
      writeSceneParams({ speed: 30 });
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          expect(url.searchParams.get('existing')).toBe('foo');
          expect(url.searchParams.get('speed')).toBe('30');
          resolve();
        }, 200);
      });
    });
  });

  describe('resolveUrlSyncKeys', () => {
    it('returns defaultParams ∪ urlSyncKeys ∪ {preset}', () => {
      const meta: SceneMeta = {
        ...mockMeta,
        urlSyncKeys: ['mode', 'speed'] // 与 defaultParams 有重叠
      };
      const keys = resolveUrlSyncKeys(meta);
      expect(keys).toEqual(
        new Set(['speed', 'angle', 'count', 'mode', 'preset'])
      );
    });

    it('always includes preset even without urlSyncKeys', () => {
      const keys = resolveUrlSyncKeys(mockMeta);
      expect(keys.has('preset')).toBe(true);
      expect(keys.size).toBe(4); // speed/angle/count/preset
    });
  });

  describe('applySceneUrlParams', () => {
    type FakeScene = SceneInstance & {
      setParams: ReturnType<typeof vi.fn>;
      render: ReturnType<typeof vi.fn>;
    };

    function createFakeScene(): FakeScene {
      return {
        init: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn(),
        step: vi.fn(),
        setTheme: vi.fn(),
        setMode: vi.fn(),
        setParams: vi.fn(),
        render: vi.fn()
      } as unknown as FakeScene;
    }

    function createTarget(scene: FakeScene, controls: unknown) {
      return {
        scene,
        controls,
        mount: document.createElement('div'),
        scheduleRender: vi.fn()
      };
    }

    it('is a no-op when URL has no legal params', () => {
      window.history.replaceState({}, '', '/test.html?unknown=1');
      const scene = createFakeScene();
      applySceneUrlParams(mockMeta, createTarget(scene, null));
      expect(scene.setParams).not.toHaveBeenCalled();
      expect(scene.render).not.toHaveBeenCalled();
    });

    it('applies numeric params via setParams and reflects via setValue', () => {
      window.history.replaceState({}, '', '/test.html?speed=30&angle=45.7');
      const scene = createFakeScene();
      const setValue = vi.fn();
      const setActive = vi.fn();
      applySceneUrlParams(
        mockMeta,
        createTarget(scene, { setValue, setActive })
      );

      expect(scene.setParams).toHaveBeenCalledWith({ speed: 30 });
      expect(scene.setParams).toHaveBeenCalledWith({ angle: 45.7 });
      expect(setValue).toHaveBeenCalledWith('speed', 30);
      expect(setValue).toHaveBeenCalledWith('angle', 45.7);
      expect(setActive).not.toHaveBeenCalled();
      // URL 非空 → 同步首绘
      expect(scene.render).toHaveBeenCalledTimes(1);
    });

    it('reflects string params (urlSyncKeys) via setActive', () => {
      const meta: SceneMeta = { ...mockMeta, urlSyncKeys: ['mode'] };
      window.history.replaceState({}, '', '/test.html?mode=fast');
      const scene = createFakeScene();
      const setValue = vi.fn();
      const setActive = vi.fn();
      applySceneUrlParams(meta, createTarget(scene, { setValue, setActive }));

      expect(scene.setParams).toHaveBeenCalledWith({ mode: 'fast' });
      expect(setActive).toHaveBeenCalledWith('mode', 'fast');
      expect(setValue).not.toHaveBeenCalled();
    });

    it('skips preset by default (scene-specific semantics)', () => {
      window.history.replaceState({}, '', '/test.html?preset=moon');
      const scene = createFakeScene();
      applySceneUrlParams(mockMeta, createTarget(scene, null));
      expect(scene.setParams).not.toHaveBeenCalled();
      expect(scene.render).toHaveBeenCalledTimes(1);
    });

    it('applies paramMap mapping to setParams key but reflects the meta key', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      const scene = createFakeScene();
      const setValue = vi.fn();
      applySceneUrlParams(mockMeta, createTarget(scene, { setValue }), {
        paramMap: { speed: 'velocity' }
      });
      expect(scene.setParams).toHaveBeenCalledWith({ velocity: 30 });
      expect(setValue).toHaveBeenCalledWith('speed', 30);
    });

    it('activeKeys force setActive for numeric params', () => {
      window.history.replaceState({}, '', '/test.html?count=3');
      const scene = createFakeScene();
      const setValue = vi.fn();
      const setActive = vi.fn();
      applySceneUrlParams(
        mockMeta,
        createTarget(scene, { setValue, setActive }),
        {
          activeKeys: ['count']
        }
      );
      expect(setActive).toHaveBeenCalledWith('count', '3');
      expect(setValue).not.toHaveBeenCalledWith('count', expect.anything());
    });

    it('applyParam hook takes over a key when returning true', () => {
      window.history.replaceState({}, '', '/test.html?speed=30&angle=60');
      const scene = createFakeScene();
      const setValue = vi.fn();
      const applyParam = vi.fn(
        (
          key: string,
          value: number | string,
          ctx: ParamSyncContext<FakeScene>
        ) => {
          if (key !== 'speed') return false;
          expect(value).toBe(30); // 已按 readSceneParams 规则解析
          expect(ctx.scene).toBe(scene);
          expect(typeof ctx.setControlValue).toBe('function');
          expect(typeof ctx.setControlActive).toBe('function');
          expect(typeof ctx.scheduleRender).toBe('function');
          ctx.setControlValue('speed', value);
          return true;
        }
      );
      applySceneUrlParams(mockMeta, createTarget(scene, { setValue }), {
        applyParam
      });
      expect(applyParam).toHaveBeenCalledTimes(2); // speed + angle 都会询问
      // speed 由钩子处理：默认 setParams 只收到 angle
      expect(scene.setParams).toHaveBeenCalledTimes(1);
      expect(scene.setParams).toHaveBeenCalledWith({ angle: 60 });
      expect(setValue).toHaveBeenCalledWith('speed', 30);
      expect(setValue).toHaveBeenCalledWith('angle', 60);
    });

    it('applyAll takes over the whole pipeline including first render', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      const scene = createFakeScene();
      const applyAll = vi.fn(
        (_urlParams: Record<string, number | string>, _ctx: unknown) => true
      );
      applySceneUrlParams(mockMeta, createTarget(scene, null), { applyAll });
      expect(applyAll).toHaveBeenCalledTimes(1);
      expect(applyAll.mock.calls[0][0]).toEqual({ speed: 30 });
      expect(scene.setParams).not.toHaveBeenCalled();
      // applyAll 返回 true → 首绘也由钩子接管
      expect(scene.render).not.toHaveBeenCalled();
    });

    it('afterApply runs after default application and before first render', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      const scene = createFakeScene();
      const order: string[] = [];
      scene.setParams.mockImplementation(() => order.push('setParams'));
      scene.render.mockImplementation(() => order.push('render'));
      applySceneUrlParams(mockMeta, createTarget(scene, null), {
        afterApply: () => order.push('afterApply')
      });
      expect(order).toEqual(['setParams', 'afterApply', 'render']);
    });

    it('falls back to setParam single-key API when setParams is absent', () => {
      window.history.replaceState({}, '', '/test.html?speed=30&angle=60');
      const scene = createFakeScene();
      const setParam = vi.fn();
      const noSetParams = { ...scene, setParams: undefined, setParam };
      applySceneUrlParams(
        mockMeta,
        createTarget(noSetParams as unknown as FakeScene, null)
      );
      expect(setParam).toHaveBeenCalledWith('speed', 30);
      expect(setParam).toHaveBeenCalledWith('angle', 60);
    });

    it('does not throw when controls handle lacks setValue/setActive', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      const scene = createFakeScene();
      expect(() =>
        applySceneUrlParams(mockMeta, createTarget(scene, { dispose() {} }))
      ).not.toThrow();
      expect(scene.setParams).toHaveBeenCalledWith({ speed: 30 });
      expect(scene.render).toHaveBeenCalledTimes(1);
    });

    it('uses preloadedParams instead of re-reading the URL', () => {
      window.history.replaceState({}, '', '/test.html?speed=30');
      const scene = createFakeScene();
      applySceneUrlParams(mockMeta, createTarget(scene, null), undefined, {
        speed: 99
      });
      expect(scene.setParams).toHaveBeenCalledWith({ speed: 99 });
      expect(scene.setParams).not.toHaveBeenCalledWith({ speed: 30 });
    });
  });
});

/**
 * 场景入口通用测试工厂
 *
 * 所有 createXxxScene 函数共享相同的生命周期模式：
 * - 创建 sim + view
 * - 返回 init/reset/step/render/resize/setMode/setTheme 等
 *
 * 用法：
 *   testSceneEntry('projectile', () => createProjectileScene({ canvas }));
 */

import { describe, expect, it, vi } from 'vitest';

export interface SceneEntryTestOptions {
  /** 是否需要 canvas（大多数场景需要） */
  needsCanvas?: boolean;
  /** 是否需要 stageSlot */
  needsStageSlot?: boolean;
  /** 场景是否支持 setParams */
  supportsSetParams?: boolean;
  /** 场景是否支持 getState */
  supportsGetState?: boolean;
  /** 场景是否支持 getReadoutItems */
  supportsGetReadoutItems?: boolean;
  /** 场景是否支持 subscribe */
  supportsSubscribe?: boolean;
  /** 场景是否支持 getSnapshot */
  supportsGetSnapshot?: boolean;
}

export function testSceneEntry(
  name: string,
  createScene: (opts: {
    canvas?: HTMLCanvasElement;
    stageSlot?: HTMLElement;
  }) => Record<string, unknown>,
  options: SceneEntryTestOptions = {}
) {
  const {
    needsCanvas = true,
    needsStageSlot = false,
    supportsSetParams = false,
    supportsGetState = false,
    supportsGetReadoutItems = false,
    supportsSubscribe = false,
    supportsGetSnapshot = false
  } = options;

  describe(`${name} scene entry`, () => {
    function makeOpts() {
      const opts: { canvas?: HTMLCanvasElement; stageSlot?: HTMLElement } = {};
      if (needsCanvas) {
        opts.canvas = document.createElement('canvas');
        opts.canvas.width = 400;
        opts.canvas.height = 300;
      }
      if (needsStageSlot) {
        opts.stageSlot = document.createElement('div');
      }
      return opts;
    }

    it('should create with default options', () => {
      const scene = createScene(makeOpts());
      expect(scene).toBeTruthy();
      expect(typeof scene.init).toBe('function');
      expect(typeof scene.reset).toBe('function');
      expect(typeof scene.render).toBe('function');
    });

    it('should init without throwing', () => {
      const scene = createScene(makeOpts()) as { init: () => void };
      expect(() => scene.init()).not.toThrow();
    });

    it('should reset without throwing', () => {
      const scene = createScene(makeOpts()) as { reset: () => void };
      expect(() => scene.reset()).not.toThrow();
    });

    it('should render without throwing', () => {
      const scene = createScene(makeOpts()) as { render: () => void };
      expect(() => scene.render()).not.toThrow();
    });

    it('should resize without throwing', () => {
      const scene = createScene(makeOpts()) as { resize: () => void };
      expect(() => scene.resize()).not.toThrow();
    });

    it('should setMode without throwing', () => {
      const scene = createScene(makeOpts()) as {
        setMode: (mode: string) => void;
      };
      if (typeof scene.setMode === 'function') {
        expect(() => scene.setMode('presentation')).not.toThrow();
      }
    });

    it('should setTheme without throwing', () => {
      const scene = createScene(makeOpts()) as {
        setTheme: (theme: string) => void;
      };
      if (typeof scene.setTheme === 'function') {
        expect(() => scene.setTheme('dark')).not.toThrow();
      }
    });

    if (supportsGetState) {
      it('should return state', () => {
        const scene = createScene(makeOpts()) as { getState: () => unknown };
        expect(() => scene.getState()).not.toThrow();
        expect(scene.getState()).toBeTruthy();
      });
    }

    if (supportsSetParams) {
      it('should update params', () => {
        const scene = createScene(makeOpts()) as {
          setParams: (p: Record<string, unknown>) => unknown;
        };
        expect(() => scene.setParams({})).not.toThrow();
      });
    }

    if (supportsGetReadoutItems) {
      it('should return readout items', () => {
        const scene = createScene(makeOpts()) as {
          getReadoutItems: () => Array<unknown>;
        };
        const items = scene.getReadoutItems();
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(0);
      });
    }

    if (supportsSubscribe) {
      it('should support subscribe and unsubscribe', () => {
        const scene = createScene(makeOpts()) as {
          subscribe: (cb: () => void) => () => void;
        };
        const listener = vi.fn();
        const unsubscribe = scene.subscribe(listener);
        expect(typeof unsubscribe).toBe('function');
        expect(() => unsubscribe()).not.toThrow();
      });
    }

    if (supportsGetSnapshot) {
      it('should return snapshot', () => {
        const scene = createScene(makeOpts()) as { getSnapshot: () => unknown };
        expect(() => scene.getSnapshot()).not.toThrow();
        expect(scene.getSnapshot()).toBeTruthy();
      });
    }
  });
}

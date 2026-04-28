/**
 * 场景冒烟测试工厂
 *
 * 最小化关键路径测试，每个场景都应在添加后自动覆盖。
 * 要添加新场景，只需在场景的 scene.entry.ts 导出 createXxxScene 函数。
 *
 * 用法（在 scene-entries.spec.ts 中动态发现）：
 *   import { testSceneSmoke } from '../helpers/scene-smoke';
 *   testSceneSmoke('projectile', createProjectileScene);
 */

import { describe, expect, it } from 'vitest';

function makeMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

export interface SceneSmokeOptions {
  /** 是否需要 canvas 参数（大多数场景需要，默认 true） */
  needsCanvas?: boolean;
  /** 是否支持 setMode 方法 */
  supportsSetMode?: boolean;
  /** 是否支持 setTheme 方法 */
  supportsSetTheme?: boolean;
  /** 是否支持 startAll/pauseAll */
  supportsTransport?: boolean;
  /** 是否支持 getState */
  supportsGetState?: boolean;
  /** 是否支持 getSnapshot */
  supportsGetSnapshot?: boolean;
}

export function testSceneSmoke(
  name: string,
  createScene: (opts: Record<string, unknown>) => Record<string, unknown>,
  options: SceneSmokeOptions = {}
): void {
  const {
    needsCanvas = true,
    supportsSetMode = true,
    supportsSetTheme = true,
    supportsTransport = false,
    supportsGetState = false,
    supportsGetSnapshot = true
  } = options;

  describe(`${name} smoke`, () => {
    function create(): Record<string, unknown> {
      const opts: Record<string, unknown> = {};
      if (needsCanvas) {
        opts.canvas = makeMockCanvas();
      }
      return createScene(opts);
    }

    it('create does not throw', () => {
      expect(() => create()).not.toThrow();
    });

    it('has required lifecycle methods', () => {
      const scene = create();
      expect(typeof scene.init).toBe('function');
      expect(typeof scene.reset).toBe('function');
      expect(typeof scene.render).toBe('function');
      expect(typeof scene.dispose).toBe('function');
    });

    it('init does not throw', () => {
      const scene = create();
      expect(() => (scene as { init: () => void }).init()).not.toThrow();
    });

    it('render does not throw', () => {
      const scene = create();
      expect(() => (scene as { render: () => void }).render()).not.toThrow();
    });

    it('render before init does not throw', () => {
      const scene = create();
      expect(() => (scene as { render: () => void }).render()).not.toThrow();
    });

    it('reset does not throw', () => {
      const scene = create();
      expect(() => (scene as { reset: () => void }).reset()).not.toThrow();
    });

    it('dispose is idempotent', () => {
      const scene = create();
      const s = scene as { init?: () => void; dispose: () => void };
      s.init?.();
      expect(() => {
        s.dispose();
        s.dispose();
      }).not.toThrow();
    });

    if (supportsSetMode) {
      it('setMode toggles without throw', () => {
        const scene = create();
        const s = scene as { setMode: (m: string) => void };
        if (typeof s.setMode === 'function') {
          expect(() => s.setMode('presentation')).not.toThrow();
          expect(() => s.setMode('normal')).not.toThrow();
        }
      });
    }

    if (supportsSetTheme) {
      it('setTheme toggles without throw', () => {
        const scene = create();
        const s = scene as { setTheme: (t: string) => void };
        if (typeof s.setTheme === 'function') {
          expect(() => s.setTheme('light')).not.toThrow();
          expect(() => s.setTheme('dark')).not.toThrow();
        }
      });
    }

    if (supportsTransport) {
      it('startAll / pauseAll / reset cycle without throw', () => {
        const scene = create();
        const s = scene as {
          init?: () => void;
          startAll?: () => void;
          pauseAll?: () => void;
          reset?: () => void;
        };
        s.init?.();
        expect(() => s.startAll?.()).not.toThrow();
        expect(() => s.pauseAll?.()).not.toThrow();
        expect(() => s.reset?.()).not.toThrow();
      });
    }

    if (supportsGetState) {
      it('getState returns truthy value', () => {
        const scene = create();
        const s = scene as { init?: () => void; getState?: () => unknown };
        s.init?.();
        if (typeof s.getState === 'function') {
          const state = s.getState();
          expect(state).toBeTruthy();
        }
      });
    }

    if (supportsGetSnapshot) {
      it('getSnapshot returns truthy value', () => {
        const scene = create();
        const s = scene as { init?: () => void; getSnapshot?: () => unknown };
        s.init?.();
        if (typeof s.getSnapshot === 'function') {
          const snap = s.getSnapshot();
          expect(snap).toBeTruthy();
        }
      });
    }
  });
}

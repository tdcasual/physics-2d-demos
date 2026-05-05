/**
 * 场景契约测试 — 动态发现
 *
 * 使用 import.meta.glob 自动发现所有 scene.entry.ts，
 * 新增场景无需手动注册即可纳入契约验证。
 *
 * 约定：每个场景目录下的 scene.entry.ts 必须导出一个
 * 名为 createXxxScene 的工厂函数。
 */

import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// 动态发现所有场景入口
// ---------------------------------------------------------------------------

const sceneModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);

interface DiscoveredScene {
  name: string;
  create: () => Record<string, unknown>;
}

const scenes: DiscoveredScene[] = [];

for (const [path, mod] of Object.entries(sceneModules)) {
  const dirName = path.split('/').slice(-2, -1)[0];

  // 查找导出的 createXxxScene 函数
  const createFn = Object.entries(mod).find(
    ([key, val]) =>
      key.startsWith('create') && key.endsWith('Scene') && typeof val === 'function'
  )?.[1] as ((opts?: Record<string, unknown>) => Record<string, unknown>) | undefined;

  if (createFn) {
    scenes.push({
      name: dirName,
      create: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        return createFn({ canvas });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 契约测试
// ---------------------------------------------------------------------------

describe('scene contract (dynamic discovery)', () => {
  it('discovers all 13 scenes', () => {
    expect(scenes).toHaveLength(13);
    const names = scenes.map(s => s.name).sort();
    expect(names).toEqual([
      'chase-meet',
      'double-slit',
      'electrification',
      'emf-analogy',
      'field-lines',
      'ganshe',
      'micrometer',
      'projectile',
      'spring-oscillator',
      'thin-film',
      'vernier-caliper',
      'vt-integral',
      'wedge'
    ]);
  });

  describe('required lifecycle methods', () => {
    it.each(scenes)('$name: init, reset, step, render, dispose', ({ create }) => {
      const scene = create();
      expect(typeof scene.init).toBe('function');
      expect(typeof scene.reset).toBe('function');
      expect(typeof scene.step).toBe('function');
      expect(typeof scene.render).toBe('function');
      expect(typeof scene.dispose).toBe('function');
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('render before init', () => {
    it.each(scenes)('$name: does not throw', ({ create }) => {
      const scene = create();
      expect(() => (scene as { render: () => void }).render()).not.toThrow();
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('dispose idempotency', () => {
    it.each(scenes)('$name: dispose twice does not throw', ({ create }) => {
      const scene = create();
      const s = scene as { init?: () => void; dispose: () => void };
      s.init?.();
      expect(() => {
        s.dispose();
        s.dispose();
      }).not.toThrow();
    });
  });

  describe('step return type', () => {
    it.each(scenes)('$name: returns void or object', ({ create }) => {
      const scene = create();
      const s = scene as { init?: () => void; step: (dt: number) => unknown };
      s.init?.();
      const result = s.step(1 / 60);
      expect(result === undefined || typeof result === 'object').toBe(true);
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('setMode toggling', () => {
    it.each(scenes)('$name: does not throw', ({ create }) => {
      const scene = create();
      const s = scene as { setMode: (m: string) => void };
      if (typeof s.setMode === 'function') {
        expect(() => s.setMode('presentation')).not.toThrow();
        expect(() => s.setMode('normal')).not.toThrow();
      }
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('getSnapshot', () => {
    it.each(scenes)('$name: returns truthy value', ({ create }) => {
      const scene = create();
      const s = scene as { init?: () => void; getSnapshot: () => unknown };
      s.init?.();
      if (typeof s.getSnapshot === 'function') {
        const snap = s.getSnapshot();
        expect(snap).toBeTruthy();
      }
      (scene as { dispose?: () => void }).dispose?.();
    });
  });
});

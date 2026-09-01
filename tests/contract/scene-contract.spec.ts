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
import { sceneRegistry } from '../../src/catalog/scene-registry';

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
      key.startsWith('create') &&
      key.endsWith('Scene') &&
      typeof val === 'function'
  )?.[1] as
    | ((opts?: Record<string, unknown>) => Record<string, unknown>)
    | undefined;

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
  it('discovers every scene in the catalog', () => {
    expect(
      scenes,
      '发现的场景入口数与 catalog 不一致：检查 src/scenes/<id>/scene.entry.ts ' +
        '是否导出了名为 createXxxScene 的工厂函数（以 create 开头、Scene 结尾），' +
        '参考 src/scenes/projectile/scene.entry.ts'
    ).toHaveLength(sceneRegistry.length);
    const names = scenes.map((s) => s.name).sort();
    expect(
      names,
      '发现的场景名与 registry 不一致：scene.entry.ts 缺 createXxxScene 导出 ' +
        '时该场景会被跳过，请对照 registry 中的 id 补齐，' +
        '参考 src/scenes/projectile/scene.entry.ts'
    ).toEqual(sceneRegistry.map((scene) => scene.id).sort());
  });

  describe('required lifecycle methods', () => {
    it.each(scenes)(
      '$name: init, reset, step, render, dispose',
      ({ name, create }) => {
        const scene = create();
        const missing = (method: string) =>
          `场景 "${name}" 缺少 ${method} 方法：在 ` +
          `src/scenes/${name}/scene.entry.ts 返回的对象中实现该方法，` +
          `参考 src/scenes/projectile/scene.entry.ts`;
        expect(typeof scene.init, missing('init')).toBe('function');
        expect(typeof scene.reset, missing('reset')).toBe('function');
        expect(typeof scene.step, missing('step')).toBe('function');
        expect(typeof scene.render, missing('render')).toBe('function');
        expect(typeof scene.dispose, missing('dispose')).toBe('function');
        (scene as { dispose?: () => void }).dispose?.();
      }
    );
  });

  describe('render before init', () => {
    it.each(scenes)('$name: does not throw', ({ name, create }) => {
      const scene = create();
      expect(
        () => (scene as { render: () => void }).render(),
        `场景 "${name}" 的 render() 在 init() 之前抛错：` +
          `src/scenes/${name}/scene.view.ts 的渲染必须容忍未初始化状态` +
          `（先画空场景/默认值），参考 src/scenes/projectile/scene.view.ts`
      ).not.toThrow();
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('dispose idempotency', () => {
    it.each(scenes)(
      '$name: dispose twice does not throw',
      ({ name, create }) => {
        const scene = create();
        const s = scene as { init?: () => void; dispose: () => void };
        s.init?.();
        expect(
          () => {
            s.dispose();
            s.dispose();
          },
          `场景 "${name}" 的 dispose() 重复调用抛错：` +
            `src/scenes/${name}/scene.entry.ts 中 dispose 需做幂等处理` +
            `（移除监听/取消 rAF 前先判空）`
        ).not.toThrow();
      }
    );
  });

  describe('step return type', () => {
    it.each(scenes)('$name: returns void or object', ({ name, create }) => {
      const scene = create();
      const s = scene as { init?: () => void; step: (dt: number) => unknown };
      s.init?.();
      const result = s.step(1 / 60);
      expect(
        result === undefined || typeof result === 'object',
        `场景 "${name}" 的 step() 返回值非法：应为 undefined 或对象，` +
          `请检查 src/scenes/${name}/scene.entry.ts 的 step 实现`
      ).toBe(true);
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('setMode toggling', () => {
    it.each(scenes)('$name: does not throw', ({ name, create }) => {
      const scene = create();
      const s = scene as { setMode: (m: string) => void };
      if (typeof s.setMode === 'function') {
        expect(
          () => s.setMode('presentation'),
          `场景 "${name}" 的 setMode('presentation') 抛错：` +
            `检查 src/scenes/${name}/scene.view.ts 的演示模式分支`
        ).not.toThrow();
        expect(
          () => s.setMode('normal'),
          `场景 "${name}" 的 setMode('normal') 抛错：` +
            `检查 src/scenes/${name}/scene.view.ts 的模式切换实现`
        ).not.toThrow();
      }
      (scene as { dispose?: () => void }).dispose?.();
    });
  });

  describe('getSnapshot', () => {
    it.each(scenes)('$name: returns truthy value', ({ name, create }) => {
      const scene = create();
      const s = scene as { init?: () => void; getSnapshot: () => unknown };
      s.init?.();
      if (typeof s.getSnapshot === 'function') {
        const snap = s.getSnapshot();
        expect(
          snap,
          `场景 "${name}" 的 getSnapshot() 返回空值：` +
            `在 src/scenes/${name}/scene.entry.ts 中返回当前状态快照对象`
        ).toBeTruthy();
      }
      (scene as { dispose?: () => void }).dispose?.();
    });
  });
});

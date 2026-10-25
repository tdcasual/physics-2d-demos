/**
 * 场景 URL 极值参数契约 — 对每个场景、每个 meta.defaultParams 数值键，
 * 以 readSceneParams 可放行的极端有限值（±1e308）调用 setParams，断言：
 * - setParams 与 render 不抛错（页面不因分享链接而无法启动）
 * - 同步返回（逐次 ±周期 的归一化循环在 1e308 下永不终止，会让整个
 *   测试进程卡住——曾发生于 vertical-circle 的 normalizeAngle）
 * - getParams 中该键仍为有限数（不把 Infinity/NaN 带进读数与绘制）
 *
 * NaN / 非数字串由 readSceneParams 在入口丢弃（parseNumericUrlParam），
 * 不在此重复覆盖。
 */

import { describe, expect, it } from 'vitest';
import type { SceneMeta } from '../../src/platform/scene-contract';

const EXTREMES = [1e308, -1e308] as const;

const metaModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.meta.ts',
  { eager: true }
);
const entryModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);

type ParamApi = {
  setParams?: (params: Record<string, number>) => unknown;
  setParam?: (key: string, value: number) => unknown;
  getParams?: () => Record<string, unknown>;
  render: () => void;
  dispose?: () => void;
};

function sceneIdOf(path: string): string {
  return path.split('/').slice(-2, -1)[0];
}

function findMeta(id: string): SceneMeta | undefined {
  const mod = metaModules[`../../src/scenes/${id}/scene.meta.ts`];
  if (!mod) return undefined;
  return Object.values(mod).find(
    (v): v is SceneMeta =>
      typeof v === 'object' && v !== null && 'defaultParams' in v
  );
}

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

describe('scene URL extreme params contract', () => {
  for (const [path, mod] of Object.entries(entryModules)) {
    const id = sceneIdOf(path);
    const meta = findMeta(id);
    const create = Object.entries(mod).find(
      ([name, value]) =>
        name.startsWith('create') &&
        name.endsWith('Scene') &&
        typeof value === 'function'
    )?.[1] as ((opts: Record<string, unknown>) => ParamApi) | undefined;
    if (!meta || !create) continue;

    const numericKeys = Object.entries(meta.defaultParams)
      .filter(([, value]) => typeof value === 'number')
      .map(([key]) => key);
    if (numericKeys.length === 0) continue;

    it(`${id}: setParams/render survive ±1e308`, () => {
      for (const key of numericKeys) {
        for (const extreme of EXTREMES) {
          const scene = create({
            canvas: makeCanvas(),
            theme: 'light',
            mode: 'classroom',
            urlParams: {}
          });
          const label = `${id}.${key}=${extreme}`;
          expect(() => {
            if (typeof scene.setParams === 'function') {
              scene.setParams({ [key]: extreme });
            } else {
              scene.setParam?.(key, extreme);
            }
          }, label).not.toThrow();
          const stored = scene.getParams?.()[key];
          if (typeof stored === 'number') {
            expect(Number.isFinite(stored), label).toBe(true);
          }
          expect(() => scene.render(), label).not.toThrow();
          scene.dispose?.();
        }
      }
    });
  }
});

/**
 * 场景入口冒烟测试 — 动态发现
 *
 * 使用 import.meta.glob 自动发现所有 scene.entry.ts 导出的
 * createXxxScene 工厂函数，并对每个场景运行最小化关键路径测试。
 *
 * 新增场景无需手动注册：只要 scene.entry.ts 导出了符合命名
 * 约定的 create 函数，就会被自动发现并纳入测试。
 *
 * 能力清单不再手动维护：
 * - hasTransport 描述布局运输条（adapter 自带 play/pause），不等于
 *   entry 暴露 startAll/pauseAll，故不把 hasTransport 当作 startAll 硬声明。
 * - getState / getSnapshot 不属于 testProfile 字段。
 * - scene-smoke：方法存在则硬断言；不存在则 skip（不是空转通过）。
 *   仅当 options 显式要求该能力时，缺失才 fail。
 */

import { testSceneSmoke } from '../helpers/scene-smoke';
import { sceneRegistry } from '../../src/catalog/scene-registry';

// ---------------------------------------------------------------------------
// 动态发现
// ---------------------------------------------------------------------------

const sceneModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);

const discovered: string[] = [];

for (const [path, mod] of Object.entries(sceneModules)) {
  const dirName = path.split('/').slice(-2, -1)[0];

  const createFn = Object.entries(mod).find(
    ([key, val]) =>
      key.startsWith('create') &&
      key.endsWith('Scene') &&
      typeof val === 'function'
  )?.[1] as
    | ((opts?: Record<string, unknown>) => Record<string, unknown>)
    | undefined;

  if (!createFn) continue;

  discovered.push(dirName);

  const registryEntry = sceneRegistry.find((entry) => entry.id === dirName);
  const testProfile = registryEntry?.testProfile;
  if (!testProfile) {
    throw new Error(
      `Scene "${dirName}" has no SceneMeta.testProfile; smoke tests cannot infer its capabilities.`
    );
  }

  // spring-oscillator 使用 graphCanvas/stageCanvas 而非 canvas，
  // 但传递 canvas 也无副作用（函数内解构忽略未知 key）
  const needsCanvas = true;

  testSceneSmoke(dirName, (opts) => createFn(opts), {
    needsCanvas,
    supportsSetMode: true,
    supportsSetTheme: true,
    // hasTransport 不等于 entry.startAll；缺失时 smoke 会 skip 而非空转通过
    supportsTransport: false,
    supportsGetState: false,
    supportsGetSnapshot: false
  });
}

// 确保没有场景被遗漏
if (discovered.length !== sceneRegistry.length) {
  throw new Error(
    `Expected ${sceneRegistry.length} catalog scenes but discovered ${discovered.length}: ${discovered.join(', ')}`
  );
}

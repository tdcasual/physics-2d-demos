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
 * - transport 能力直接派生自 SceneMeta.testProfile.hasTransport
 *   （契约测试 scene-standard.spec.ts 已强制每个场景声明 testProfile）
 * - getState / getSnapshot 由 scene-smoke 内部对实例做 typeof 探测，
 *   存在即断言返回值 truthy，缺失则安全跳过
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
    supportsTransport: testProfile.hasTransport,
    // getState/getSnapshot 不属于 testProfile 字段；scene-smoke 的能力
    // 测试内部按实例实际方法探测，恒为 true 即可全量自动覆盖
    supportsGetState: true,
    supportsGetSnapshot: true
  });
}

// 确保没有场景被遗漏
if (discovered.length !== sceneRegistry.length) {
  throw new Error(
    `Expected ${sceneRegistry.length} catalog scenes but discovered ${discovered.length}: ${discovered.join(', ')}`
  );
}

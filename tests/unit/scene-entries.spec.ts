/**
 * 场景入口冒烟测试 — 动态发现
 *
 * 使用 import.meta.glob 自动发现所有 scene.entry.ts 导出的
 * createXxxScene 工厂函数，并对每个场景运行最小化关键路径测试。
 *
 * 新增场景无需手动注册：只要 scene.entry.ts 导出了符合命名
 * 约定的 create 函数，就会被自动发现并纳入测试。
 */

import { testSceneSmoke } from '../helpers/scene-smoke';

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
      key.startsWith('create') && key.endsWith('Scene') && typeof val === 'function'
  )?.[1] as ((opts?: Record<string, unknown>) => Record<string, unknown>) | undefined;

  if (!createFn) continue;

  discovered.push(dirName);

  // spring-oscillator 使用 graphCanvas/stageCanvas 而非 canvas，
  // 但传递 canvas 也无副作用（函数内解构忽略未知 key）
  const needsCanvas = true;

  // 根据场景的实际接口能力设置选项
  const hasGetState = ['projectile', 'chase-meet', 'ganshe'].includes(dirName);
  const hasGetSnapshot = ['chase-meet', 'electrification', 'emf-analogy', 'field-lines', 'vt-integral'].includes(dirName);
  const hasTransport = ['spring-oscillator', 'chase-meet', 'projectile'].includes(dirName);

  testSceneSmoke(dirName, (opts) => createFn(opts), {
    needsCanvas,
    supportsSetMode: true,
    supportsSetTheme: true,
    supportsTransport: hasTransport,
    supportsGetState: hasGetState,
    supportsGetSnapshot: hasGetSnapshot
  });
}

// 确保没有场景被遗漏
if (discovered.length !== 8) {
  throw new Error(
    `Expected 8 scenes but discovered ${discovered.length}: ${discovered.join(', ')}`
  );
}

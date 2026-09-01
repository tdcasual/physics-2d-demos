/**
 * 脚手架自证明检查：pnpm check:scaffold
 *
 * 为什么存在：new-scene.ts 的模板引用了一批上层 API
 * （createStandardSceneEntry / renderSchema 句柄 / writeParam 上下文 /
 * sizeCanvasToFill / getRenderTokens …）。这些 API 演进时模板极易悄悄
 * 脱节——生成的场景一出生就挂。本脚本用真实 CLI 生成一个探针场景，
 * 对其跑结构检查、ESLint、tsc 与它的 sim 单测，证明「脚手架产物开箱
 * 即绿」，然后彻底清理。
 *
 * 设计说明：
 * - 做成脚本而非 vitest 用例：避免探针场景目录与并行 worker 的
 *   import.meta.glob 自动发现产生竞态。
 * - 探针 meta 的空字段（concept/objective/…）会被补丁为占位值——
 *   契约要求非空，而模板刻意留空提醒作者填写，两者不矛盾。
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const probeId = 'zz-scaffold-probe';
const probeDir = join(root, 'src/scenes', probeId);
const probeSpec = join(root, 'tests/unit', `${probeId}.sim.spec.ts`);
const isWin = process.platform === 'win32';

function run(name: string, command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin
  });
  if (result.status !== 0) {
    throw new Error(`${name} 失败`);
  }
  console.log(`✓ ${name}`);
}

function cleanup(): void {
  rmSync(probeDir, { recursive: true, force: true });
  rmSync(probeSpec, { force: true });
}

if (existsSync(probeDir) || existsSync(probeSpec)) {
  console.error(`✗ 探针残留已存在（${probeId}），请先手动清理后重跑`);
  process.exit(1);
}

try {
  console.log(`生成探针场景 ${probeId} …`);
  run('pnpm new:scene', 'pnpm', ['new:scene', probeId, '脚手架探针']);

  // 契约要求 meta 四字段非空；模板刻意留空提醒作者，探针补占位值
  const metaPath = join(probeDir, 'scene.meta.ts');
  const meta = readFileSync(metaPath, 'utf-8')
    .replace("concept: '',", "concept: '探针概念',")
    .replace("subConcepts: ['', ''],", "subConcepts: ['探针甲', '探针乙'],")
    .replace("objective: '',", "objective: '探针目标',")
    .replace("description: '',", "description: '探针描述',");
  writeFileSync(metaPath, meta);

  run('结构检查', 'pnpm', ['check:scenes']);
  run('ESLint（探针目录 + 探针测试）', 'npx', [
    'eslint',
    `src/scenes/${probeId}`,
    `tests/unit/${probeId}.sim.spec.ts`
  ]);
  run('类型检查（全量 tsc，捕捉模板引用的 API 漂移）', 'pnpm', ['typecheck']);
  run('探针 sim 单测', 'npx', [
    'vitest',
    'run',
    `tests/unit/${probeId}.sim.spec.ts`
  ]);

  console.log('\n✓ 脚手架产物开箱即绿（结构 / lint / 类型 / 单测全部通过）');
} catch (err) {
  console.error(
    `\n✗ 脚手架自证明失败：${err instanceof Error ? err.message : err}`
  );
  console.error(
    '  模板与上层 API 已脱节，请对照报错修复 scripts/new-scene.ts\n'
  );
  process.exitCode = 1;
} finally {
  cleanup();
}

/**
 * 单场景验证命令：pnpm verify:scene <id>
 *
 * 面向场景作者（含 AI 代理）的一站式验证回路：按依赖顺序执行
 * 结构 → 布局 → lint → 类型 → 单元/契约测试 → 构建 → bundle 预算，
 * 任一失败即停并打印「去哪修」指引。等价于新增场景的完整提交前门禁
 * （除浏览器测试：e2e/视觉回归仍走 pnpm quality:full / CI）。
 *
 * 用法：
 *   pnpm verify:scene projectile
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const id = (process.argv[2] ?? '').trim();

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  fail('用法: pnpm verify:scene <id>，例如 pnpm verify:scene projectile');
}
if (!existsSync(join(root, 'src/scenes', id))) {
  fail(`场景不存在: src/scenes/${id}（先运行 pnpm new:scene ${id}）`);
}

const isWin = process.platform === 'win32';

type Step = {
  name: string;
  command: string;
  args: string[];
  /** 失败时打印的修复指引 */
  hint: string;
};

function run(step: Step): void {
  console.log(`\n━━━ ${step.name} ━━━`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin
  });
  if (result.status !== 0) {
    console.error(`\n✗ 步骤失败: ${step.name}`);
    console.error(`  修复指引: ${step.hint}\n`);
    process.exit(1);
  }
  console.log(`✓ ${step.name}`);
}

// 该场景相关的单测文件（tests/unit/<id>*.spec.ts 及同名变体）
const unitDir = join(root, 'tests/unit');
const sceneSpecs = readdirSync(unitDir)
  .filter((f) => f.endsWith('.spec.ts') && f.includes(id))
  .map((f) => `tests/unit/${f}`);

const lintTargets = [`src/scenes/${id}`, ...sceneSpecs].filter((p) =>
  existsSync(resolve(root, p))
);

const testTargets = [
  'tests/contract',
  'tests/unit/scene-entries.spec.ts',
  ...sceneSpecs
];

const steps: Step[] = [
  {
    name: '场景结构检查 (check:scenes)',
    command: 'pnpm',
    args: ['check:scenes'],
    hint: '对照报错补齐/修正 src/scenes 下的文件；规则见 docs/new-scene-agent-contract.md'
  },
  {
    name: '布局契约检查 (check:layouts)',
    command: 'pnpm',
    args: ['check:layouts'],
    hint: '通常与场景无关；若失败先确认你没有改动 src/app/layouts'
  },
  {
    name: 'ESLint（场景目录 + 相关测试）',
    command: 'npx',
    args: ['eslint', ...lintTargets],
    hint: '多为分层导入或 unused 报错；层规则含义见 AGENTS.md「架构分层」'
  },
  {
    name: 'TypeScript 类型检查（全量）',
    command: 'pnpm',
    args: ['typecheck'],
    hint: 'strict 模式零错误才可通过；禁 any，未使用变量必须删除'
  },
  {
    name: '单元 + 契约测试（契约全量 + 场景相关）',
    command: 'npx',
    args: ['vitest', 'run', ...testTargets],
    hint: '契约测试的失败消息含修复处方，按其指示修改；物理正确性测试写法见 docs/physics-testing-guide.md'
  },
  {
    name: '生产构建 (build)',
    command: 'pnpm',
    args: ['build'],
    hint: '常见原因：import 了不存在的导出；虚拟场景页由 vite-plugin-scene-pages 自动派生，无需手写 HTML'
  },
  {
    name: 'Bundle 预算 (check:bundle)',
    command: 'pnpm',
    args: ['check:bundle'],
    hint: '场景页 JS 预算 180 kB；超标先检查是否意外引入新依赖或大体积静态数据'
  }
];

console.log(`验证场景: ${id}`);
console.log(`测试目标: ${testTargets.join(' ')}`);

for (const step of steps) {
  run(step);
}

console.log(`
✓ verify:scene ${id} 全部通过（${steps.length} 步）。

剩余无法自动验证的事项（提交前自行确认）：
  - 物理正确性：sim 测试的期望值是否有独立推导（docs/physics-testing-guide.md）
  - 视觉基线：Linux 用 scripts/visual-linux-container.sh update，Mac 用 pnpm test:visual:update
  - 浏览器行为：pnpm quality:full（e2e + 视觉回归，需本地浏览器环境）
`);

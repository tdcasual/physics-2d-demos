# 质量门禁与维护流程

本文档定义项目进入主干前必须满足的工程质量门禁。目标不是追求数字漂亮，而是让架构、体积、视觉和交互回归都能被自动化约束。

## 本地门禁

日常开发先运行快速门禁：

```bash
pnpm quality:core
```

合并或发布前运行完整门禁：

```bash
pnpm quality:full
```

`pnpm check:bundle` 依赖 `dist/`，因此必须在 `pnpm build` 之后运行。
`quality:core` 与 CI 的静态段对齐：结构检查（`check:scenes`）、脚手架（`check:scaffold`）、布局（`check:layouts`）、循环依赖、`check:audit`、lint、`format:check`、类型、带覆盖率的单元/契约测试、构建、bundle budget。
`quality:full` 在 core 之后追加 E2E 与视觉测试（`PLAYWRIGHT_SKIP_BUILD=1`，复用刚产出的 `dist/`）。

CI（`.github/workflows/ci.yml`）额外上传 Codecov；本地不必跑 Codecov。覆盖率实测通常高于 `vite.config.ts` 阈值，禁止下调该阈值来「修」失败。

Vitest 覆盖率阈值以 `vite.config.ts` 的 `test.coverage.thresholds` 为唯一来源；本文不固化数值。运行 `pnpm test:coverage` 获取实绩。`quality:full` 只执行一次带覆盖率的 Vitest，随后只构建一次；E2E 与 visual 共用该 `dist/`，避免重复工作掩盖真实失败。

Playwright 分工如下：

- `tests/e2e/`：通用控件、布局切换、transport 等行为契约。
- `tests/visual/`：布局矩阵、无障碍、跨浏览器、视觉快照及专项回归。
- `layout-matrix.spec.ts`：自动遍历全部场景与全部注册布局，验证 profile 视口、无横向溢出、活跃 Canvas 尺寸/边界/响应式比例/非空像素，以及 graph 激活。

浏览器门禁是合并前要求。若本机浏览器环境被明确阻断，应记录命令和错误并由 CI 补跑；不能因环境问题删除测试、增加 skip 或声称完整门禁已通过。

**视觉权威环境**：Linux 基线以 `scripts/visual-linux-container.sh`（及 CI 的 `update_snapshots`）为准，Darwin 以 Mac 本机或 `update-darwin-snapshots.yml` 为准。开发机直接跑 `pnpm quality:full` / `pnpm test:visual` 因字体与光栅化漂移**不是**权威结果，不能用来判定像素回归或更新基线。

## Bundle Budget

预算脚本：`scripts/check-bundle-budget.ts`

预算值以 `scripts/check-bundle-budget.ts` 的 `defaultBundleBudget` 为唯一权威（按首页/场景页/vendor/shared 分维度，并支持入口级覆盖），本文不固化数值；运行 `pnpm check:bundle` 获取当前实测。

预算采用未压缩产物大小，原因是它更容易暴露真实模块增长；gzip 体积可以作为分析指标，但不作为当前 CI 阻断条件。

调整预算的规则：

1. 先确认增长来自真实需求，而不是无意引入依赖或重复打包。
2. 在 PR 描述中写清楚增长来源、影响范围和替代方案。
3. 同步更新 `tests/unit/bundle-budget.spec.ts` 中的默认预算断言。
4. 重新运行 `pnpm build && pnpm check:bundle`。

## 视觉快照维护

视觉快照只在以下情况更新：

1. 设计或布局发生有意变更。
2. Canvas 响应式比例发生有意变更。
3. 浏览器渲染基线变更，且人工确认差异可接受。

更新流程：

```bash
pnpm test:visual
pnpm test:visual:update
pnpm test:visual
```

提交快照前必须人工查看差异，重点检查：

- 移动端是否出现横向滚动、遮挡、文字溢出。
- Canvas 是否非空、尺寸合理、主体内容没有被裁切。
- 亮色/暗色主题下控件对比度是否仍然可读。
- 读数面板、transport、侧边栏开合等交互入口是否仍在预期位置。

## CI 顺序

CI 依次运行场景/布局结构检查、循环依赖、lint、类型检查、带覆盖率的单元与契约测试、浏览器与 CJK 字体安装、单次构建、bundle budget、E2E 和 visual。手动更新 Linux 快照时仍执行 E2E，但 visual 阶段只重生成权威 Linux 基线并上传 artifact。

# 新场景代理契约（执行卡）

> 本文档供 OpenClaw、Hermes 及其他代码代理执行**新增场景**任务时使用。
> 按步骤顺序执行，每步失败先看该步的「失败去哪修」。不要跳步。
> 只需要记住一条验证命令：`pnpm verify:scene <id>`。

## 执行步骤

### Step 1 — 生成骨架

```bash
pnpm new:scene <id> <标题>     # 例：pnpm new:scene pendulum 单摆
```

id 必须 kebab-case。脚手架生成 6 个场景文件 + 1 个 sim 测试骨架，
**生成物开箱即绿**（由 `pnpm check:scaffold` 守护，若生成物挂了说明
模板脱节，修 `scripts/new-scene.ts`，不要绕）。

### Step 2 — 填 meta 与物理

按脚手架输出的待办清单逐项填：

- `scene.meta.ts`：`concept` / `subConcepts`（两项）/ `objective` /
  `description` 四项**非空**（契约测试强制）；`defaultParams` 与
  `keywords` 贴合实际物理参数。`SceneMeta.id`、目录名、`path` 必须一致。
- `scene.sim.ts`：实现物理逻辑。
- `scene.view.ts`：实现绘制。**大于 50 的尺寸字面量必须由
  `responsiveScale`、viewport 尺寸或标准 token 推导**（AST 棘轮强制，
  新场景不得进豁免清单）；规范见 AGENTS.md「Canvas 响应式渲染规范」。
- `controls-schema.ts`：控件写法见 `docs/controls-cookbook.md`（12 种
  字段类型各有可粘贴示例）。优先声明式；只有运行时动态增删控件才写
  imperative `controls.ts`（需在报告里说明理由）。

### Step 3 — 写 sim 正确性测试

编辑 `tests/unit/<id>.sim.spec.ts`。测试期望值必须有**独立推导**
（教科书公式手算 / 物理不变量 / 读数规则），禁止从实现里抄公式生成
期望值（镜像测试）。模式与真实示例见 `docs/physics-testing-guide.md`。

### Step 4 — 验证（唯一需要记住的命令）

```bash
pnpm verify:scene <id>
```

一条命令跑完：结构 → 布局 → lint → 类型 → 单元/契约测试 → 构建 →
bundle 预算，失败即停并打印修复指引。全绿才算完成编码部分。

### Step 5 — 视觉基线（新场景必须）

像素基线按平台分文件，**不要本地直接更新 snapshot**：

- Linux（权威）：`scripts/visual-linux-container.sh update`
  （CI 同构容器），或 CI `workflow_dispatch → update_snapshots` 下载 artifact
- Mac：`pnpm test:visual:update`，或 `update-darwin-snapshots.yml` 重生成

确实无法稳定截图的场景才加入 `visual-regression.spec.ts` 的
`SNAPSHOT_OPT_OUT`，且必须带理由注释。

### Step 6 — 浏览器门禁（有环境则跑）

```bash
pnpm quality:full    # 在 core 之上追加 e2e + 视觉回归
```

本地无浏览器/容器环境时可缺跑，但最终报告必须写明缺跑项与原因，
由 CI 兜底；CI 失败时 Job Summary 会附 `.github/ci-failure-triage.md`
分诊表，按表修复。

## 工作边界（硬性）

- 默认只修改：`src/scenes/<id>/`、`tests/unit/<id>*.spec.ts`
- 不要手动创建 `src/pages/*.html`（场景页由 vite-plugin-scene-pages
  虚拟生成，`check:scenes` 会拒绝手抄文件）
- 不要手动修改 `src/catalog/scene-registry.ts`（glob 自动发现）
- 修改 `src/app` / `src/ui` / `src/platform` / `src/core` / 共享样式前，
  必须先说明影响范围并补回归测试

## 禁止事项（违反即返工）

代理**不得**通过以下方式消除失败：删除测试、增加无理由 skip、放宽
尺寸/覆盖率/bundle 阈值、改写共享契约、直接覆盖视觉基线、把新场景
加入 AST 豁免清单。以下路径受 `.github/CODEOWNERS` 保护，改动需要
仓库所有者 review：

- `tests/contract/`、`tests/helpers/`、`tests/visual/`
- `scripts/check-*.ts`、`scripts/verify-scene.ts`
- `eslint.config.js`

## 失败报告格式

最终报告必须列出：

- 修改文件和每个文件的目的
- 运行过的命令及通过/失败结果
- 失败场景、布局 id、interaction model、viewport、tab（如适用）、
  selector 和实际尺寸
- 未运行的检查及原因
- 仍需人工确认的物理正确性、教学表达和视觉质量风险

## 新增布局时（仅此时可改 `src/app/layouts`）

- 通过 `registerLazyLayout` 注册，提供 `supportedSlots`、约束和
  `layoutTestProfile`（含手动/实验布局）
- `interactionModel` 如实声明（tabs/split/stack/fullscreen/custom）
- 至少用一个无 graph、一个有 graph、一个带控件/读数的场景验证
- 可用 `?layout=<id>` 强制浏览器测试某布局；不得在测试中硬编码布局 id 清单

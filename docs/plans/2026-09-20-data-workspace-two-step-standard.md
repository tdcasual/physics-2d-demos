# 数据处理/图像分析两步工作区标准化方案

> 2026-09-20 · 执行者：grok（批次 A → 批次 B） · 验收：kimi 按批次验收清单独立复跑
> 前置：`docs/plans/2026-09-20-data-workspace-compact-ticker-tape.md` 批次 1/2 已完成并验收（面板紧凑化 + ticker-tape 初版接入，均在未提交的 working tree 中）。

## 需求解读（用户 5 条反馈 → 设计决策）

1. **「数据处理」按钮文字溢出** — 入口按钮被挤进 transport 浮动工具条（`.teaching-stage-floating-controls`）后被压缩，nowrap 文字溢出。修法：`.data-workspace-entry { flex: none }`，必要时工具条允许换行；1440×900 与 375×812 两种宽度目检。
2. **数据处理时动画区锁定** — spec 加 `stageLock?: boolean`（默认 false）。capability 在工作区激活且 stageLock 时给容器加 `is-data-workspace-stage-lock` class，CSS 禁掉舞台 canvas 的 pointer-events；场景 entry 同时忽略拖拽回调（双保险）。**ticker-tape 启用；double-slit 明确不启用**：instrument-only 模式下仪器本身是读数输入设备（x1/x2 需两次对准），锁定会破坏流程，读数一致性已由 `lockInstrumentFromField` + 提交时快照核对保证。
3. **舞台太小 + 表格形态** —
   a. 舞台小：转置表格后面板自然变矮，舞台 reclaim 垂直空间；图像分析步图表区尽量大。
   b. 表格转置：spec 加 `tableOrientation?: 'trials' | 'fields'`（默认 `'trials'`，兼容 double-slit）。`'fields'` 时行=字段（x/Δx/v）、列=trial（计数点 0..6，对齐原 lab-table 的 3 行 × 7 列形态），首列字段 label（含单位），每行末格放该行「校对」按钮；N/A 格渲染 '—' 禁用；固定行数（minRows===maxRows）时不渲染增删按钮；Enter 单格提交保留；单元格保留 `data-field`/`data-trial` 属性（测试选择器兼容）。
   c. 密度：转置模式 input 宽 ~3.5rem、cell padding 收紧、状态文案精简。
4. **默认页去除实验数据/数据图表浮窗** — lab-stage 加配置 `floatData?: boolean` / `floatGraph?: boolean`（默认 true 兼容现有场景）；false 时仍创建 slot（graph 收养需要锚点）但 panel 加 `hidden`、不参与拖拽。capability 收养 graph 时去掉 `hidden` 与 `is-collapsed`，退出/切步时还原。ticker-tape page：删 lab-table 挂载与 `lab-table.ts` 文件；plotBar（描点/拟合）保留在 graph float body 内，随收养进入图像分析步。
5. **图像分析独立步骤（标准化）** — `spec.chartAnalysis: true` 时面板头部出现步骤条 [1 数据处理] [2 图像分析]：
   - 数据步：knowns + hint + 表格 + 数据类 summaryFields。
   - 图像分析步：顶部已校验数据的紧凑只读回顾 + 下方收养的图表区 + 图表类 summaryFields + result 句。
   - 解锁条件：全部 trial 的全部 rowFields ok + 数据类 summaryFields 全部 ok；未解锁点击步骤条显示提示。
   - 字段归属：`DataWorkspaceFieldSpec` 加 `step?: 'chartAnalysis'`（缺省数据步）。ticker-tape：`aDiff` 数据步，`aFit` 图像分析步。
   - graph 收养时机从「进入工作区」改为「切到图像分析步」（panel 通过 `onStepChange` 回调通知 capability；`is-data-workspace-chart` class 随步骤切换）。
   - 先描点再拟合：场景 plotBar 已有 `canFit` 门控（描点前拟合禁用），保持；步骤提示文案写明顺序。
   - **图表形式场景自定**：收养的是场景 graph slot 内容，工作区不规定图表形态（散点/直线/柱状/波形皆可）——写入 AGENTS.md 作为标准结构：数据处理步必有，图像分析步可选。
   - double-slit `chartAnalysis: false` → 单步、无步骤条、行为不变。

---

## 批次 A：平台 + 面板 + 能力 + CSS（不改任何场景）

### A1. 入口按钮溢出修复

- `src/styles/capability/data-workspace.css`：`.data-workspace-entry` 加 `flex: none`；检查其父容器（transport 浮动条 / lab-stage toolbar）在窄屏的排布，必要时允许 wrap。
- 验收：double-slit 与 ticker-tape 在 1440 与 375 宽度下按钮文字不溢出（e2e 用 boundingBox 断言文字在按钮框内）。

### A2. spec 扩展（`src/platform/data-workspace.ts`）

- `DataWorkspaceSpec` 加 `tableOrientation?: 'trials' | 'fields'`、`stageLock?: boolean`。
- `DataWorkspaceFieldSpec` 加 `step?: 'chartAnalysis'`。
- `assertSpecGraph` 增加校验：`step` 只能出现在 summaryFields；`tableOrientation`/`stageLock` 值合法；`chartAnalysis: false` 时不允许任何字段带 `step`。
- 新增纯函数 `isChartField(spec, fieldId)`、`chartStepReady(session, spec)`（全部 trials 所有 rowFields `fieldIsOk` 且数据类 summaryFields 全部 `fieldIsOk`）。保持纯函数零 DOM。

### A3. 面板两步壳 + 转置表格（`src/ui/components/data-workspace-panel.ts`）

- 步骤条：`shouldShowChartAnalysis(spec)` 时在 header 渲染 `[1 数据处理] [2 图像分析]`（role=tablist/tab，aria-selected）。当前步状态内部维护，切步调用 `options.onStepChange?.(step)`；`DataWorkspacePanel` 返回类型加 `getStep()`。
- 数据步内容 = 现有 knowns/hint/table/summary（仅数据类 summaryFields）。图像分析步 = 只读数据回顾（已校验值的紧凑只读表，复用转置/正置同一朝向）+ `chartMount` + 图表类 summaryFields + result。图像分析步未解锁时点击 tab：不动切换，hint 区显示「请先完成数据处理」。
- 转置渲染：`tableOrientation === 'fields'` 时 thead = ['', ...trial 序号, '']，tbody 行 = rowFields；每行末格「校对」按钮提交该行所有非禁用单元格；N/A 单元格（host 已写 checked 占位、raw='—'）渲染为禁用态文本；`minRows === maxRows` 时不渲染增删按钮区与删除列。正置模式行为不变。
- 通用性红线：步骤文案、表头、按钮文案全部来自 spec/通用词，禁止出现场景专属字段 id（`tests/unit/data-workspace-architecture.spec.ts` 固化）。

### A4. 能力层（`src/app/layouts/capabilities/data-workspace.ts`）

- stageLock：进入工作区时若 `spec.stageLock` 加 `is-data-workspace-stage-lock` class，退出/ dispose 移除。
- 收养时机：`shouldShowChartAnalysis` 时不再 enter 即收养；改为 panel `onStepChange('chartAnalysis')` 时收养 graph、`onStepChange('data')` 时还原；`is-data-workspace-chart` class 同步切换。收养时移除 graph section 的 `hidden`/`is-collapsed`，还原时恢复。
- 退出工作区时若处于图像分析步，先还原 graph 再关面板（现有 restoreGraph 路径兼容）。

### A5. CSS（`src/styles/capability/data-workspace.css`）

- 步骤条样式（紧凑 tab）。
- 转置表格紧凑样式：input `width: 3.5rem; min-height: 36px`，cell padding `0.25rem 0.3rem`；N/A 格样式。
- `.is-data-workspace-stage-lock` 下舞台 canvas/交互层 `pointer-events: none`（覆盖 `.lab-stage-slot`、`.teaching-stage-canvas`、instrument 容器），并给舞台加视觉提示（如 60% 透明度或角标「已锁定」二选一，取低成本者）。
- 只读回顾表样式（紧凑、无边框输入框，纯文本）。

### A6. 批次 A 测试

- 更新/新增 unit：`data-workspace.spec.ts`（新纯函数）、`data-workspace-generic.spec.ts`（转置渲染、步骤切换、固定行数隐藏增删）、`data-workspace-capability.spec.ts`（stageLock class、收养随步骤、onStepChange 接线）。
- double-slit 回归：`tests/e2e/double-slit-data-workspace.spec.ts` 与 `tests/unit/double-slit-data-workspace.spec.ts` 必须**不改语义地通过**（double-slit 单步无步骤条、正置表格、无 stageLock）。
- `pnpm lint && pnpm typecheck` 通过。

### 批次 A 验收清单

```bash
pnpm vitest run tests/unit/data-workspace.spec.ts tests/unit/data-workspace-generic.spec.ts \
  tests/unit/data-workspace-capability.spec.ts tests/unit/data-workspace-lazy.spec.ts \
  tests/unit/data-workspace-architecture.spec.ts tests/unit/double-slit-data-workspace.spec.ts \
  tests/unit/capability-system.spec.ts tests/unit/capability-orchestrator.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/double-slit-data-workspace.spec.ts
pnpm exec playwright test tests/visual/double-slit-data-workspace.spec.ts
pnpm lint && pnpm typecheck && pnpm build && pnpm check:bundle
```

---

## 批次 B：ticker-tape 接入两步工作区

### B1. `src/scenes/ticker-tape/data-task.ts`

- spec 加 `tableOrientation: 'fields'`、`stageLock: true`；`aFit` 加 `step: 'chartAnalysis'`；`aDiff` 保持数据步。
- `chartStepReady` 依赖平台新纯函数，host 无需改动逻辑（评估器不变）。

### B2. `src/scenes/ticker-tape/scene.entry.ts`

- origin drag 守卫：工作区 active 时 `view.setOnOriginDrag` 回调忽略（双保险，CSS pointer-events 已挡）。
- 其余不变。

### B3. `src/scenes/ticker-tape/page.ts`

- 删除 lab-table 挂载代码与 `import { createLabTable }`；删除 `src/scenes/ticker-tape/lab-table.ts` 文件（grep 确认仅 page.ts 引用；若 lab-stage.css 有 `.lab-table` 专属样式一并清理）。
- `layoutConfig`：`floatData: false, floatGraph: false`，移除 `graphCollapsed`/`dataCollapsed`（由 float\* 接管），保留 `dataWorkspace: true`。
- plotBar（描点/拟合）保留注入 graph float body（随收养进入图像分析步）。
- 注意回归：`tests/e2e/generic-controls.spec.ts`、`presentation-1080.spec.ts`、`tests/unit/demo-profile-resolve.spec.ts` 若引用 ticker-tape 的实验数据浮窗需同步更新。

### B4. lab-stage 配置（`src/app/layouts/layouts/lab-stage/lab-stage.ts`）

- `LabStageConfig` 加 `floatData?: boolean`、`floatGraph?: boolean`（默认 true）；false 时 panel 创建但 `hidden`（slot 仍创建），不挂拖拽/resizable。
- 检查 `LayoutConfig`（`src/app/layouts/types.ts`）到 lab-stage 配置的透传链，把两个新键接上。

### B5. 测试

- 重写 `tests/e2e/ticker-tape-data-workspace.spec.ts`：默认页无实验数据/数据图表浮窗 → 进入工作区（舞台锁定：O 点不可拖、舞台 pointer-events none）→ 数据步转置表格逐格/逐行校对 → 步骤条解锁 → 切图像分析步（只读回顾在上方、graph 收养可见）→ 描点 → 拟合 → aFit → result → 退出还原。
- `tests/unit/ticker-tape-data-workspace.spec.ts`：spec 新字段断言；其余不变。
- 视觉基线：ticker-tape desktop/mobile 默认视图变化（无浮窗）→ 由验收方用容器脚本重生成，grok 不在宿主机更新 PNG。

### 批次 B 验收清单

```bash
pnpm verify:scene ticker-tape
pnpm vitest run tests/unit/ticker-tape-data-workspace.spec.ts tests/unit/ticker-tape.sim.spec.ts \
  tests/unit/demo-profile-resolve.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/ticker-tape-data-workspace.spec.ts \
  tests/e2e/generic-controls.spec.ts tests/e2e/presentation-1080.spec.ts
pnpm quality:core
```

---

## 文档同步（批次 B 内完成）

- `AGENTS.md`：data-workspace 相关段落更新为两步标准（数据处理步必有、图像分析步可选且图表形态场景自定；`tableOrientation`/`stageLock`/`floatData`/`floatGraph` 新键说明；CSS 已由能力 runtime 惰性携带，page.ts 不再 import）。
- `docs/plans/2026-09-20-data-workspace-compact-ticker-tape.md` 批次 2.3 的 lab-table 保留决定已被本方案取代（无需回改，历史文档）。

## 全局红线（沿用上版方案）

- strict TS 零错误、禁 any；面板/平台层禁场景专属 id 或文案；不降低任何断言强度与覆盖率阈值；视觉基线只走 `scripts/visual-linux-container.sh` 容器；不 git commit。

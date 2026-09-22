# 数据处理工作区紧凑化 + ticker-tape 接入实施方案

> 2026-09-20 · 执行者：codex（两个独立任务批次） · 验收：按每批验收清单执行
>
> 背景结论（已完成的架构审计）：
>
> - data-workspace 是声明式能力链路：场景 `data-task.ts`(spec+host) → `LayoutConfig.dataWorkspace` → capabilities 声明/惰性工厂 → orchestrator `SCENE_BINDINGS` 推 host → `data-workspace-panel.ts` 渲染，入口是舞台工具栏按钮。
> - 「图像分析」**不需要新 capability**：`chartAnalysis` 步骤与 graph slot 收养机制已内建（`src/platform/data-workspace.ts:210-214`、`src/app/layouts/capabilities/data-workspace.ts:126-149`），double-slit 未启用而已。
> - ticker-tape 的标准答案函数全部现成（`scene.sim.ts` 的 `computeDeltaXCm`/`computeVMs`/`computeSuccessiveAMs2`/`fitLineDroppingOutliers` + `tapeXCm` 真值），判分数据源零成本。

---

## 批次 1：data-workspace 面板紧凑化

只改 `src/ui/components/data-workspace-panel.ts` 与 `src/styles/capability/data-workspace.css`，外加测试连带更新。共 4 项。

### 1.1 删除面板内「返回实验」按钮

- **现状**：`data-workspace-panel.ts:67-74` 面板 header 有退出按钮；进入工作区后舞台工具栏入口已翻转为「返回实验」（`capabilities/data-workspace.ts:116`），重复出口。
- **改动**：删除 `exitBtn` 的创建与 `header.append(title, exitBtn)` 改为只 append title。`createDataWorkspacePanel` 的 `onExit` 参数**保留**（capability 侧传参不变，面板内不再使用——加 `void options.onExit` 或从签名移除并同步 capability 调用点，二选一，优先从签名移除并同步 `capabilities/data-workspace.ts:168-174`）。
- **保留**：`.data-workspace-exit` CSS 类仍在用（删除确认框「取消」`panel.ts:117`、行内「删除」`panel.ts:298`），CSS 类不删。`.data-workspace-leave` 类若无其他使用者则连 CSS 一起删。
- **测试连带**：grep `返回实验` / `data-workspace-leave` 的测试（`tests/unit/data-workspace*.spec.ts`、`tests/e2e/double-slit-data-workspace.spec.ts`、`tests/visual/double-slit-data-workspace.spec.ts`），退出操作一律改为点击舞台工具栏 `.data-workspace-entry`（打开状态下其文案也是「返回实验」）。

### 1.2 校对按钮：每字段一个 → 每行一个「校对本组」

- **现状**：`renderTrialRow`（`panel.ts:253-274`）每个字段一个 44px「校对」按钮；Enter 已等价提交（`bindCheck` `:172-197`）。7 字段场景一行 7 个按钮，移动端（≤720px 表格转 block，`data-workspace.css:308-360`）每字段折成两行。
- **改动**：
  - `renderTrialRow` 内删除每字段的 `btn` 创建/绑定；`rowInputs` map 不再存 btn；`setFieldEnabled` 调用处只传 input。
  - **保留** `bindCheck`（Enter 提交单字段）不变。
  - 行尾操作格（`delCell`，`:294-325`）在「删除」旁加「校对本组」按钮（class `data-workspace-check data-workspace-check-row`）：点击时按 `spec.rowFields` 顺序对该行每个 `!input.disabled` 的字段执行 `host.submitField({field, trialIndex, raw: input.value})`，全部提交完后 `options.onChange(); update();` 一次。该行所有 input 均 disabled 时按钮禁用。
  - summary 区各字段的「校对」按钮（`ensureSummary` `:409-458`）**保留不动**（gated 逐字段解锁是主交互路径）。
- **CSS**：`.data-workspace-check-row` 与 `.data-workspace-remove` 在操作格内并排（gap 0.35rem）。
- **测试连带**：所有按「校对第 N 组 ×」aria-label 逐字段点击的测试，改为点「校对本组」或对 input 按 Enter。涉及 `tests/unit/data-workspace.spec.ts`、`data-workspace-generic.spec.ts`(.fixture.ts)、`data-workspace-capability.spec.ts`、`tests/e2e/double-slit-data-workspace.spec.ts`（共约 37 处，逐一核对语义：逐字段反馈断言的场景可仍用 Enter 单字段提交）。

### 1.3 knowns 去重

- **现状**：顶部 `knownsEl`（`panel.ts:76-77`）渲染 `host.getKnowns()` 全部 chips；summary-context（`:412-416`、`:466-473`）按 `spec.summary.contextKnownKeys` 再渲染子集。`summaryContextItems`（`platform/data-workspace.ts:1001-1011`）从同一 knowns 数组取子集，数学上恒为顶部子集 → double-slit 的 d/L chips 完全重复显示。
- **改动**：`syncSummary` 中渲染 context 前，过滤掉 key 已出现在顶部 knowns 的项；过滤后为空则 `contextEl.hidden = true`。**不删** summary-context 结构（保留能力，防契约测试固化结构）。
- **测试连带**：断言 summary-context 可见/chip 数的测试改为断言去重后隐藏。

### 1.4 桌面端面板高度放宽

- `data-workspace.css:271-274`：`.layout-master.is-data-workspace .data-workspace-panel { max-height: 46% }` → `58%`。chart 模式与移动端的既有覆盖规则（`:293-295`、`:303-311`）不动。

### 批次 1 验收清单

```bash
pnpm vitest run tests/unit/data-workspace.spec.ts tests/unit/data-workspace-generic.spec.ts \
  tests/unit/data-workspace-capability.spec.ts tests/unit/data-workspace-lazy.spec.ts \
  tests/unit/data-workspace-architecture.spec.ts tests/unit/double-slit-data-workspace.spec.ts \
  tests/unit/double-slit-numeric-hints.spec.ts tests/unit/capability-system.spec.ts \
  tests/unit/capability-orchestrator.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/double-slit-data-workspace.spec.ts
pnpm lint && pnpm typecheck
```

- 视觉基线：`tests/visual/double-slit-data-workspace.spec.ts` 截图必变，用 `scripts/visual-linux-container.sh update` 重生成（禁止宿主机直接 --update-snapshots）。darwin 基线本机无法生成，在最终报告中标注走 `update-darwin-snapshots.yml` workflow。

---

## 批次 2：ticker-tape 接入数据处理工作区 + 图像分析

模板参照 double-slit（`src/scenes/double-slit/data-task.ts`、`scene.entry.ts:505-629`、`page.ts:7,35`）。

### 2.1 新建 `src/scenes/ticker-tape/data-task.ts`

**spec 设计**（关键决策，勿偏离）：

```typescript
export const tickerTapeDataWorkspaceSpec: DataWorkspaceSpec = {
  id: 'ticker-tape-vt',
  title: '纸带数据处理与 v–t 图像分析',
  chartAnalysis: true, // 收养 lab-stage 的 graph 面板
  enabledSteps: ['reading', 'data', 'calculation', 'chartAnalysis'],
  trialCount: 7,
  minRows: 7,
  maxRows: 7,
  initialRows: 7, // 行 = 计数点 0..6，固定
  stageMode: 'full', // 保留纸带舞台（与 double-slit 相反）
  rowFields: [
    { id: 'x', label: 'x', unit: 'cm', inputMode: 'decimal' },
    {
      id: 'deltaX',
      label: 'Δx',
      unit: 'cm',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x' }],
      gated: true,
      readinessHint: '请先校对本行 x'
    },
    {
      id: 'v',
      label: 'v',
      unit: 'm/s',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x' }],
      gated: true,
      readinessHint: '请先校对本行 x'
    }
  ],
  summaryFields: [
    {
      id: 'aDiff',
      label: '逐差法 a',
      unit: 'm/s²',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'all-rows', field: 'x' }],
      readinessHint: '请先完成全部 7 个 x 校对'
    },
    {
      id: 'aFit',
      label: 'v–t 图斜率 a',
      unit: 'm/s²',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'all-rows', field: 'v' }],
      readinessHint: '请先完成各行 v 校对，并在图像区描点拟合'
    }
  ],
  summary: { contextKnownKeys: ['T'] },
  result: {
    field: 'aFit',
    template: 'v–t 图像斜率 a = {value} {unit}，与逐差法相互印证',
    digits: 2
  },
  completionField: 'aFit'
};
```

**N/A 格处理**（行 0 的 Δx/v、行 6 的 v，端点物理上无定义）：host 建 session 后立即把这三格写为 checked 占位（`raw:'—', value:NaN, checked:true, stale:false, feedback:{ok:true,message:'端点无需填写'}`）；`submitField` 收到这三格时直接返回占位 ok（防学生改写）。这样 `all-rows` gating（`dependencySatisfied` 要求每行 `fieldIsOk`）天然满足。

**评估器**（数据源 = `source.getState()` 的 `tapeXCm`（打偏后纸带真值）与 `T`；手写，复用 `parseStudentNumber`/`writeCheckedField`/`cloneSession` 等平台函数）：

| 字段             | 前置检查                                                                                                    | 期望值                                                               | 容差                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| `x`(行 i)        | `parseStudentNumber(raw,'cm')`；数量级错（×100 后吻合）提示单位                                             | `tapeXCm[i]`                                                         | ±0.05 cm（毫米尺估读）   |
| `deltaX`(行 i≥1) | 本行与上一行 x 均 checked 且非 stale，否则 relation 反馈「请先校对相邻点的 x」                              | 学生 x*i − 学生 x*{i−1}                                              | ±0.02 cm                 |
| `v`(行 1..5)     | 行 i−1 与 i+1 的 x 均 checked，否则 relation 反馈                                                           | (x*{i+1}−x*{i−1})/100/(2T)，用学生 x                                 | ±0.01 m/s                |
| `aDiff`          | all-rows x 完成                                                                                             | `computeSuccessiveAMs2`(学生 x, T)                                   | max(0.05, \|期望值\|×2%) |
| `aFit`           | all-rows v 完成；且 `source.getPlotStatus().hasFit`，否则 relation 反馈「请先在图像区点击「描点」「拟合」」 | `fitLineDroppingOutliers`(点 (i·T, v_i)，i=1..5，用学生 v).fit.slope | max(0.05, \|斜率\|×5%)   |

- 失败文案指明层别（format/unit/range/relation/instrument），参照 `evaluateDoubleSlitField` 的分层风格。
- uniform 纸带期望 a≈0 走绝对容差兜底；variable 纸带照样可完成（教学点：判断非匀变速）。

**host**：`createTickerTapeDataWorkspace(source)`，`source = { getState(): TickerTapeState; getPlotStatus(): {hasFit:boolean,...}; writeBack: { setMeasuredX/setDeltaX/setV } }`。

- `submitField` 成功（`checked && feedback.ok`）时写回 sim：x→`setMeasuredX(i,v)` 等——让收养进来的图像区「描点/拟合」使用已校验数据。
- 换纸带/改 noise/拖原点/reset → 数据失效：host 额外暴露 `invalidateAll(reason: string)`（内部 `invalidateAllTrials`），由 entry 调用。
- `syncInstrument` noop（无仪器概念，接口必须存在）。
- `getEligibility`：播放中返回 `{ok:false, reason:'请先暂停纸带播放再处理数据'}`，否则 ok。
- `getKnowns`：`[{key:'T',label:'计数间隔 T',value:'0.10 s'},{key:'points',label:'计数点',value:'7 个'}]`。
- `getHint`：`'x 单位 cm（毫米尺估读到 0.01 cm）；v 单位 m/s。'`
- 无 `lockInstrumentFromField`。

### 2.2 修改 `src/scenes/ticker-tape/scene.entry.ts`

仿 double-slit 惰性包装（`scene.entry.ts:505-629` 模式）：

- `import('./data-task')` 动态加载；未就绪时 `getEligibility` 返回「数据任务加载中…」；`setActive(true)` 触发加载。
- `getDataWorkspace()` 返回代理 host（`Scene` 接口已有此可选方法，`scene-bootstrapper-types.ts:37-39`，orchestrator 自动接线，无需改架构层）。
- 失效接线：`setParams` 中 tapeKind/noise 实际变化时、`reset()` 时、`view.setOnOriginDrag` 回调（`:74-78`）中 → `hostRef.invalidateAll('纸带已更换，请重新测量校对')`（host 未加载则跳过）。
- `dispose` → `resetSession()` + `setActive(false)`。

### 2.3 修改 `src/scenes/ticker-tape/page.ts`

- CSS 由 `capabilities/data-workspace.ts` 能力 runtime 随惰性 chunk 携带；页面无需静态 import，避免 opt-in 页面首包承担工作区样式成本。
- `layoutConfig` 加 `dataWorkspace: true`。
- 现有 lab-table（`page.ts:78-107`）与描点/拟合 plotBar（`:111-155`）**保留**：工作区打开时控制区被 CSS 隐藏（`data-workspace.css:228` 的 `.lab-stage-layout.is-data-workspace .lab-control-section`）；graph 面板（`.lab-float-graph`，含 plotBar）被收养进工作区 chartMount（`capabilities/data-workspace.ts:126-141` 的 closest 选择器已含 `.lab-float-graph`），退出时还原。
- **需验证**：收养后 graph canvas 继续渲染（entry `attachGraphCanvas` 已暴露，`capabilities/data-workspace.ts:178` 的 `requestLayoutResize` 会触发 resize）；plotBar 随 `.lab-float-body` 一起随迁。若收养后图表不刷新，在 page/entry 侧补 resize 调用，不改架构层。

### 2.4 测试

- 新建 `tests/unit/ticker-tape-data-workspace.spec.ts`：spec 图校验不抛、空会话 7 行、N/A 占位、x/Δx/v/aDiff/aFit 的通过与拒绝路径（含容差边界、跨行依赖 relation 反馈、未拟合时 aFit 反馈）、invalidateAll 置 stale、eligibility、submitField 写回 sim。
- 新建 `tests/e2e/ticker-tape-data-workspace.spec.ts`（仿 `tests/e2e/double-slit-data-workspace.spec.ts` 结构）：工具栏出现「数据处理」→ 进入 → 图像面板被收养进工作区可见 → 逐行校对全链路 → result 句出现 → 工具栏「返回实验」退出 → 布局还原。
- 视觉基线：工具栏多「数据处理」按钮 → `ticker-tape-{desktop,mobile}-linux.png` 用 `scripts/visual-linux-container.sh update` 重生成；darwin 基线标注走 CI workflow。

### 批次 2 验收清单

```bash
pnpm verify:scene ticker-tape
pnpm vitest run tests/unit/ticker-tape-data-workspace.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/ticker-tape-data-workspace.spec.ts
pnpm quality:core
```

---

## 全局红线

- `strict` TS 零错误；禁 `any`；未使用变量清理。
- 面板/平台层**不得出现场景专属字段 id 或文案**（`tests/unit/data-workspace-architecture.spec.ts:8-33` 固化）。
- 新增 canvas 绘制代码遵守 AST 棘轮（>50 裸数字必须由 scale/viewport 推导）——本方案预期不涉及 view 改动。
- 视觉基线只能走 `scripts/visual-linux-container.sh`（ubuntu:24.04 容器），禁止宿主机 `--update-snapshots`。
- 不改 `vite.config.ts` 覆盖率阈值；不为通过测试而降低断言强度。

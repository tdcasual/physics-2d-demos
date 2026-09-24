# 数据工作区分阶段测量与双缝校验修复

> 状态：已实施；Codex 独立代码复核完成。全量 E2E 与 Grok 复审尚未通过（2026-09-24）  
> 缺陷等级：High，阻塞当前 data-workspace 变更发布  
> 范围：通用 data-workspace 协议与面板、double-slit 测量任务及回归测试；ticker-tape 行为保持不变。

## 1. 问题定义

通用面板当前把“校对本组”实现为：按 `spec.rowFields` 顺序，把该行所有未禁用输入逐个交给 `host.submitField`。双缝的一行却不是同一时刻可验证的静态数据：

1. 对准第一条亮纹，读取并冻结 `x1`；
2. 移动仪器到第二条亮纹，读取并冻结 `x2`，再根据两个端点的亮纹级次校验 `n`；
3. 仅用冻结数据校验 `D = x2 - x1` 和 `deltaX = D / n`；
4. 多组完成后计算平均 `deltaX` 与波长。

当前批量按钮在同一仪器位置依次提交 `x1/x2/n/D/deltaX`。第一次点击会让 `x1` 通过、`x2` 必然按第一位置失败；移动到第二位置再次点击又会重新提交并破坏 `x1`。现有 E2E 主要用 Enter 逐字段提交，所以未覆盖真实按钮流程。

## 2. 设计原则

- 通用能力表达“静态批量校验”和“动态分阶段测量”两种合法实验模型，不在双缝页面写 DOM 特例。
- 阶段进度由字段有效状态推导，不在 session 中保存第二份 `phase`，避免依赖失效后状态漂移。
- 阶段内顺序提交，首个失败立即停止；已经通过且原始值未改变的字段不重复提交。
- 阶段部分成功不回滚。例如 `x2` 正确而 `n` 错误时保留 `x2` 快照，学生只需修正 `n`，无需重新移动仪器。
- 只有位置读数读取实时仪器。`n/D/deltaX/averageDeltaX/lambda` 必须使用已冻结快照或已校对数据推导精度，不依赖提交时仪器当前所在位置。
- 未声明阶段协议的场景保持现有行为。ticker-tape 不增加配置，其批量校验、转置表和图像分析路径不得变化。
- 单字段 Enter 保留；领域层必须独立拒绝越序提交，不能只依赖 UI 禁用。

## 3. 通用协议

在 `platform/data-workspace.ts` 增加：

```ts
export type DataWorkspaceRowCheckStage = {
  id: string;
  label: string;
  fields: readonly DataWorkspaceFieldId[];
  hint?: string;
};

export type DataWorkspaceSpec = {
  // ...existing fields
  rowCheckStages?: readonly DataWorkspaceRowCheckStage[];
};
```

### 契约

- `id`、`label` 非空，stage id 唯一。
- `fields` 非空，只能引用 `rowFields`。
- 一个字段不能出现在多个阶段。
- 声明 `rowCheckStages` 后必须恰好覆盖全部 `rowFields`；防止某字段只剩隐蔽的 Enter 路径。
- 阶段顺序就是校验顺序；字段在阶段内的顺序就是提交顺序。
- `assertSpecGraph` 负责上述静态校验。

新增纯函数：

- `rowCheckStageState(session, spec, trialIndex)`：返回首个未完成阶段、阶段序号、总数和整组是否完成。
- `stagedFieldReadiness(session, spec, fieldId, trialIndex)`：阶段专用提交门禁，返回 ready 或可展示的阻塞原因。它与 `gated/isFieldReady` 解耦，供面板和双缝领域 host 共同调用。
- 阶段完成的定义：该阶段所有字段均 `fieldIsOk`。
- 不新增 session 字段；现有 `currentTrial` 不用于阶段状态。

阶段专用门禁规则：

- 目标字段所在阶段之前的全部阶段必须完成；
- 同阶段位于目标字段之前的字段必须 `fieldIsOk`；
- 目标字段自身的 `dependsOn` 必须满足，即使其 `gated` 为 false；
- 已完成的早期阶段字段允许重新提交，以支持重测，并按依赖图使后续结果 stale；
- 未配置 `rowCheckStages` 时该函数不改变 legacy 行为。

`assertSpecGraph` 另检查 row-scoped 依赖的顺序：依赖字段不能位于更晚阶段，也不能位于同阶段更后位置。`rowCheckStages: []` 非法；属性缺省才表示 legacy 批量模式。

## 4. 通用面板行为

### 未声明阶段协议

维持现有“校对本组”：一次提交所有当前可提交字段。ticker-tape 和未来静态实验不变。

### 声明阶段协议

- 每行始终只渲染**一个**动态阶段按钮，不为三个阶段同时渲染三枚按钮。该按钮根据推导状态显示：
  - `1/3 校对 x1`
  - `2/3 校对 x2 与 n`
  - `3/3 校对 D 与 deltaX`
  - 完成后 `本组已完成`，按钮 disabled。
- `aria-label` 包含组号、阶段号、动作；阶段提示通过行内说明或 `title` 提供，不只依赖颜色。
- 点击时按阶段字段顺序处理：
  1. 先把本行**当前阶段和已完成较早阶段中、未 disabled 的输入**通过现有 `applyDrafts` 语义同步进 session；禁用的未来阶段不得回写。同步后重新读取 session，再推导当前阶段。现有 `applyFieldDrafts` 在 raw 改变时会先 `invalidateDownstream`，再把本字段写成 `checked:false, stale:false` 的 draft，因此未提交的 DOM 修改不能被旧的“已成功”状态掩盖。
  2. 每个字段提交前重新读取最新 session 和 `stagedFieldReadiness`；前字段成功后，后字段可在同一次点击中解锁。
  3. 仅当当前字段仍 `fieldIsOk` 且同步后的 session raw 与 DOM raw 相同才跳过，避免重采仪器。由于 raw 改动已由第 1 步撤销 checked，旧 raw/旧 snapshot 不可能误跳过；unchecked、draft、stale 一律重新提交。
  4. 若未就绪、为空或校验失败，立即停止，不提交后续字段；聚焦相应输入。
  5. 每个 `submitField` 都立即写入 host session；无论中途停止还是整段成功，处理器都在退出前调用一次 `onChange()` 与 `update()`，保证部分成功（如 x2 成功、n 失败）可见。
  6. 成功后重新推导阶段；若同一阶段还有字段未完成，按钮保持该阶段。
- Enter 仍只提交当前字段；提交成功/失败后同样重绘阶段按钮。
- 手机堆叠表、桌面表和键盘路径使用同一逻辑。

阶段模式的输入可编辑性也与 `gated` 分开：未来阶段禁用；当前阶段全部字段可先填写（因此学生可在一次点击前填好 `x2` 与 `n`）；已完成的较早阶段保持可编辑以支持重测。`gated` 继续只服务 legacy 场景和 summary 字段。

不存在“点击未来阶段/点击早期阶段按钮”两条额外路径：行内只有当前阶段按钮。重测早期字段通过该输入的 Enter 路径完成；`writeCheckedField` 无论重测成功或失败都会先按依赖图 `invalidateDownstream`，所以后续字段与 summary 必然撤销有效状态，动态按钮随即回退。未来阶段输入为 disabled，Enter 不可触发；直接 API 调用仍被领域级 `stagedFieldReadiness` 拒绝。

阶段执行提取为可测试的内部函数，避免按钮处理器继续膨胀。若实现中需要导出，只导出平台无 DOM 的状态推导函数，不把页面节点暴露给场景层。

## 5. 双缝规格与领域规则

`doubleSlitDataWorkspaceSpec.rowCheckStages`：

```ts
[
  {
    id: 'first-reading',
    label: '校对 x1',
    fields: ['x1'],
    hint: '对准第一条亮纹，填写并校对 x1'
  },
  {
    id: 'second-reading',
    label: '校对 x2 与 n',
    fields: ['x2', 'n'],
    hint: '移动到另一条亮纹，填写 x2 和两端间隔数 n'
  },
  {
    id: 'calculation',
    label: '校对 D 与 deltaX',
    fields: ['D', 'deltaX'],
    hint: '用两次冻结读数完成本组计算'
  }
];
```

显示文案使用真正的下标和数学符号（`x1` → `x₁`、`deltaX` → `Δx`），代码 id 保持 ASCII。

### 依赖图

- `x2` 新增 row dependency `x1`。这样改动 `x1` 会传递失效 `x2 -> n/D -> deltaX -> summary`。
- `x2/n/D/deltaX` 不通过把 `gated` 全设为 true 来模拟阶段，因为那会使同阶段后项在点击前无法填写。阶段输入显隐与提交门禁统一使用 staged 协议；`dependsOn` 保留作失效图和领域关系。
- `x2` 领域判分在没有有效、未 stale、已对准的 `x1` 快照时必须返回 relation/instrument 错误。
- `n` 继续依赖 `x1/x2`，且只读这两份冻结快照中的 fringe order。
- `D` 只读已校对 `x1/x2`。
- `deltaX` 只读已校对 `D/n`。

### 实时快照边界

- 双缝 host 在调用 `source.capture()` 前先用 `stagedFieldReadiness` 做领域级越序拒绝；不能通过直接调用 host 绕过 UI。拒绝结果使用 relation feedback，且不得消费实时快照。
- `submitField` 仍可捕获当前快照，但 `evaluateDoubleSlitField` 仅在 `x1/x2` 分支使用它做读数和对准判定。
- `x1/x2` 成功时，其 `FieldCheckState.snapshot` 就是按试次、按字段冻结的数据，不再增加全局或 trial 级冗余快照。两次读数必须具有相同 `instrumentId`、`precisionMm`、`displayDigits` 和 reading-strategy 口径；不一致则拒绝 `x2`，禁止混用测量基准。
- `deltaX` 的显示位数从本组仍 `fieldIsOk` 的 `x2`（fallback `x1`）快照取得。
- `averageDeltaX` 和 `lambda` 的显示位数/仪器精度从仍 `fieldIsOk` 的已完成试次位置快照取得；多组必须测量基准兼容，找不到时使用既有安全默认值。
- 移动同一仪器不失效已冻结读数；切换仪器类型仍通过 `syncInstrument` 使相关测量 stale。
- stale 状态可保留旧 snapshot 供诊断和“需重校”说明，但所有精度/级次读取都必须先检查 `fieldIsOk`，因此旧 snapshot 不得参与任何新判分。

## 6. 数据失效与重测

- 重新提交 `x1`：`x2/n/D/deltaX` 和汇总全部 stale，阶段回到 2；新的 `x1` 快照成为本组起点。
- 重新提交 `x2`：`n/D/deltaX` 和汇总 stale，阶段停在 2。
- 修改 `n`：`deltaX` 和汇总 stale，阶段停在 2，`x1/x2` 保留。
- 修改 `D`：`deltaX` 和汇总 stale，阶段停在 3。
- 删除/新增组：沿用现有 summary 失效规则。
- 切换卡尺/测微目镜：沿用全局同仪器约束；已有试次全部标为需重校。
- 重置 session：阶段自然回到 1。

不额外增加“回退阶段”按钮。需要重测时直接修改并 Enter 校对上游字段；提示明确说明会使后续结果需重校。

## 7. 测试矩阵

### 平台与面板单测

- stage id 重复、空 fields、未知字段、重复字段、未完整覆盖 rowFields 全部拒绝。
- `rowCheckStages: []`、row dependency 指向更晚阶段/同阶段更后字段全部拒绝；属性缺省仍合法。
- 首个未完成阶段推导、部分阶段完成、全部完成、stale 回退。
- `stagedFieldReadiness` 与 `gated` 解耦；早期字段可重测，未来字段不能通过 Enter/host 直接越序。
- 阶段按钮只提交当前阶段。
- `x2` 成功、`n` 失败后停止，不提交 `D/deltaX`；重试只提交 `n`，不重采 `x2`。
- DOM raw 改变后先写 draft 再推导阶段，不能错误跳过旧的 checked 字段。
- draft 同步只采集当前/较早且 enabled 的输入，不为禁用未来字段创建空 draft。
- 每行只有一枚动态阶段按钮；早期重测走 Enter，未来阶段无可点击按钮。
- 前字段成功后后字段在同一次点击中按最新 session 解锁。
- 完成按钮 disabled，文本与 aria-label 正确。
- 未配置 stage 的通用 host 保持原批量提交次数与顺序。
- 转置 ticker-tape 的按字段批量按钮不受影响。

### 双缝领域单测

- 无有效 `x1` 时 `x2` 拒绝。
- 直接调用 host 越序提交 `x2/n/D/deltaX` 均拒绝且不捕获仪器。
- `x1`、`x2` 保存不同的 snapshot/order；移动到第二位置不改写 `x1`。
- `x1/x2` 的仪器、精度、显示位数或 reading strategy 不兼容时拒绝混测。
- `n` 只由两份冻结 order 判分。
- `D/deltaX/average/lambda` 在仪器随后移动后仍按冻结数据判分。
- 改 `x1/x2/n/D` 的逐级失效范围正确。
- 错误 `n` 不使已通过 `x2` stale。
- 仪器类型切换仍使全部试次 stale。

### E2E

- 用真实拖拽和三个可见阶段按钮完成一组及三组测量；不得用辅助函数逐字段 Enter 代替主验收路径。
- 第一次对齐点击后只有 `x1` 通过。
- 第二次对齐输入 `x2/n`：错误 n 时 x2 保持通过；修正 n 后无需重新移动仪器。
- 第三阶段错误 D 时停止，修正后完成 D/Δx。
- 上游重测导致按钮和状态回退。
- split-right、mobile-stack、lab-stage 均能完成阶段流程，含键盘和触摸。
- ticker-tape 原有批量校验与图像分析 E2E 全通过。

## 8. 实施顺序

1. 平台类型、spec 静态契约和纯状态推导函数。
2. 面板阶段按钮执行器、文案、焦点与无障碍状态。
3. 双缝 spec、领域层快照边界和失效关系。
4. 单元、契约、E2E 和截图审计。
5. `pnpm quality:core`、目标 E2E、`pnpm quality:full`、bundle/audit。
6. Grok 实现自审 + Codex 独立逐文件审计；发现问题回到实现阶段，直到双方明确通过。

## 9. 提交与推送策略

全部变动在本地最终通过后，按可独立构建的逻辑提交整理：

1. `feat(data-workspace): add staged row verification and classroom workspace UI`
2. `fix(double-slit): preserve instruments and enforce sequential measurement`
3. `feat(ticker-tape): fill the graph-analysis workspace`
4. `docs(data-workspace): record audit evidence and staged measurement design`

每个提交创建后运行与其范围相称的测试，确认提交树可构建，再依次推送到 `origin/main`。截图输出到 `artifacts/data-workspace/screenshots/`；不更新 Linux/Darwin 像素基线，除非视觉套件明确要求且按项目容器规则生成。

## 10. 完成门槛

- 双缝三阶段真实操作闭环通过，纸带行为无回归。
- 无 Critical/High 审计问题。
- TypeScript、lint、format、unit/coverage、build、bundle、audit、目标 E2E 全通过。
- `quality:full` 通过；若视觉基线仅因预期 UI 改动失败，必须按项目规则提供证据和处理，不得在宿主 Linux 直接更新。
- Grok 与 Codex 均给出明确 PASS，且结论基于最终 diff，不是旧截图或旧工作树。

## 11. 最终审计记录（2026-09-24）

- 分阶段协议、双缝顺序读数与有效位数校验、纸带数据工作区及其回归测试已实施。Codex 复核了依赖失效、草稿先同步、直接 host 越序提交、重测快照、图像分析门禁及新增行布局。
- `pnpm quality:core` 退出码 0：286 个测试文件，7353 passed、121 skipped；静态检查、覆盖率、构建和 bundle 检查通过。聚焦单测 11 个文件、157 个测试通过。
- 双缝和纸带目标 E2E 的分阶段流程、草稿门禁、三次测量与三种布局几何检查已通过；最后一次目标子集 2/2 通过。
- `pnpm quality:full` 未通过：Playwright 中有 454 项通过，同时存在失败。可复现的失败包括：跨场景播放测试把所有模拟初始状态硬编码为暂停（`accel-force` 默认 `autoRun: true`）；纸带结构测试使用宽泛的 `canvas.stage-canvas, canvas` 选择器，命中 1×1 辅助画布。前者对应未修改的测试假设；后者尚未完成根因修复，不能记作全量验收通过。
- Grok 本轮未给出最终复审结论。VM 的 Grok 进程位于其他项目目录，本轮未向其写入任务或中断；不能将其状态视为本项目 PASS。
- 项目及测试中已无 `hidden generation` 目录、路径或引用；相关临时归档和校验清单已清除。
- 用户明确要求整理、提交并推送，因此按 `quality:core` 与目标 E2E 的通过结果继续，保留并披露全量 E2E 残项；不更新 Linux/Darwin 视觉基线。

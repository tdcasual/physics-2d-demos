# v12.1 方案：v10 收尾 + 控件投影架构收敛 + 结构性减债（交叉审计定稿候选）

> 日期：2026-09-27。基线：`fix/physics-2d-remediation` @ `22616fe` + 未提交工作树（v10 实现；tsc 通过；quality:core / e2e / linux-visual 日志为绿）。
> 审计链：三方独立审计（`/tmp/physics-2d-final-audit/`，均 CHANGES_REQUIRED）→ v11 → 方案审计 R1（Claude 7 阻塞 / Grok 5 阻塞）→ v11.1 → R2（Grok PASS；Claude 3 条文本级修正）→ v11.2 → v12（深化 + Wave E）→ R3 现状核对（Claude 9 条 / Grok 3 条阻塞+5 条建议，全部文本级与边界级，两家均明示改完即可开工）→ 本稿 v12.1 已纳入全部修正。
> v12.1 相对 v12 的变化：恢复 A1.6（reset/remount 共用投影，R3 两家共同头号阻塞）；§1.2(b) 补 ganshe；§1.3 补 field-lines（共 11 行）+ tortoise-hare 注解；A8/§7 计数改为具名并集 19；E1 依赖图重画；E2/E3 联动约束补全；§8 验收矩阵修正。

## 0. 现状判断

v10 Waves 1–6 真实落地；交叉审计确认 6 个 HIGH + 若干 MEDIUM 未修；`quality:full` 从未运行；改动未提交。架构性半拉子工程：restore-once（URL 半套）已发布，remount 控件投影（控件半套）未落地——v10 §3.6:171 禁止拆分发布这两半。

**根因一句话**：控件投影（scene → 控件面板的值回写）是 120 个场景各自手写 hook 的可选义务，而不是平台管线。double-slit 是唯一做对的场景；学生数据风险最高的 ticker-tape 反而没有投影。

## 1. 事实基线（规范清单，经三轮独立核实）

### 1.1 场景投影能力四态（120 场景全扫）

| 态             | 场景                                                                                                                           | remount 行为                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| ① 静默投影完整 | double-slit、ampere-balance、single-loop（经 `src/pages/single-loop-integration.ts:123-137`）、doppler-effect、mechanical-wave | 正确                                                  |
| ② 事件性+守卫  | mechanical-energy、internal-energy、variable-work、projectile-components、emf-internal-resistance                              | 值正确但派发多余事件                                  |
| ③ 事件性无守卫 | centripetal-motion、resistor-measurement、precision-tools、charged-particle-circle、spring-ball                                | remount 重入 onChange → setParams + writeParam 副作用 |
| ④ 无投影       | 其余 ~100                                                                                                                      | 控件回退 schema 默认值，live scene 保留学生参数       |
| 特殊           | ganshe（refreshObservers）、spring-oscillator（refresh=列表重建）                                                              | 单独裁定                                              |

### 1.2 handle 形态分类（120 = 83 + 28 + 9）

- **(a) 纯薄包装 83 个**（机械批）：仅 `setValue/setActive/dispose` 直接转发（含 3 个空 `setActive` 存根：car-bank:78、conical-pendulum:82、galileo-incline:80；含 2 个 dispose-only：chase-meet、emf-analogy——A2 须改用 exposeSchemaHandle）。
- **(b) 带副作用/特殊 28 个**（**不参与机械批，逐个判定**）——原 27 + **vt-integral**（dispose-only 但 §1.4 tier-1 编码场景：A3 冻结批交付解码版 syncFromScene 后，其 handle 须用合成式 `{ ...exposeSchemaHandle(renderer), syncFromScene }` 保留解码器，禁止裸 `return exposeSchemaHandle(renderer)`）：
  - 控制逻辑副作用（7）：faraday-disc（`:105` syncPreset）、interference-formula（`:70`）、thin-film（`:112` lambda 配色，另 `:117-119` dispose 摘 pointerdown 须保留）、wedge（`:82`）、dynamic-circle（`:237-239`）、force-composition（`:209-211`）、emf-internal-resistance（`:214/:218` syncSelect）
  - refresh 重投影（10）：ampere-balance、centripetal-motion、charged-particle-circle、precision-tools、resistor-measurement、spring-ball、mechanical-energy、projectile-components、internal-energy、variable-work
  - 仅 dispose 带清理（8）：accel-force、binding-energy、impulse-momentum、parallelogram-rule、potential-energy-graphs、single-slit、three-forces、vertical-circle
  - 混合（2）：ticker-tape（dispose 含 `plotBar.remove()`）、**ganshe**（自定义 setValue 多卡片扇出 + refreshObservers + 拆卡片 dispose，`page.ts:185-211`——机械批若误换 exposeSchemaHandle 会丢波源卡片与观察点管理）
- **(c) 其他形态 9 个**：直接 `return renderer`（micrometer、projectile、vernier-caliper）；委托 imperative 工厂（single-loop、spring-oscillator）；六件套（doppler-effect、mechanical-wave）；double-slit；electrification（仅 setActiveScene+dispose）。

### 1.3 无 entry 级 getParams 清单（11 个，定稿）

| 场景                 | setParams                                                | defaultParams  | 处置                                                                                                     |
| -------------------- | -------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| doppler-effect       | ✅ entry:128                                             | 非空           | 已有 tier-1 hook，不动                                                                                   |
| mechanical-wave      | 仅 setParam 单键 :110                                    | 非空           | 已有 tier-1 hook，不动                                                                                   |
| double-slit          | ✅ entry:827                                             | 非空           | 已有 tier-1 hook（`:598` 的 getParams 是 data-workspace 注入，非参数 API）                               |
| electrification      | ✅ entry:55（窄类型）                                    | 非空           | **补 getParams**                                                                                         |
| interference-formula | ✅ entry:101                                             | 非空           | **补 getParams**                                                                                         |
| micrometer           | ✅ entry:101                                             | 非空           | **补 getParams**                                                                                         |
| thin-film            | ✅ entry:114                                             | 非空           | **补 getParams**                                                                                         |
| vernier-caliper      | ✅ entry:99                                              | 非空           | **补 getParams**                                                                                         |
| wedge                | ✅ entry:101                                             | 非空           | **补 getParams**                                                                                         |
| **field-lines**      | ✅（`:162/:166/:171` 内部调 sim.getParams 但不对外暴露） | 非空 {n,q1,q2} | **补 entry 级 getParams**                                                                                |
| emf-analogy          | ❌（专用 setter）                                        | 空 `{}`        | 登记豁免：语义为「不走 defaultParams 投影」（schema 仍有 tap/speed 等非 defaultParams 控件，不是零控件） |

豁免登记在 `NO_CONTROL_PROJECTION` 清单，**不进** `NO_PARAMS_API`（`scene-params-contract.spec.ts:53-59` 按 setParams 判定、要求登记者无 setParams）。
「投影源不完整」注解（有 getParams 但覆盖不全）：xt-graph（`:108-110` 只返回 `{speed}`）、**tortoise-hare**（`:110-112` 同形 `{speed: timeScale}`）、spring-oscillator（`:245-251` 只返回首振子）——逐个裁定。

### 1.4 编码/换算/可见性场景（tier-1 保留清单，12 个，定稿——v12.2 起含 vt-integral）

| 场景                    | 原因                                                                                                                                                                                                                                                                                         | 证据                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| ticker-tape             | countEvery 1\|5↔toggle bool（entry:319-323/:358）；noise 0\|1\|2↔preset 三态（`NOISE_BY_INDEX` :28/:52-58/:359）；showA 0\|1↔bool（:326-327/:360）；vSigFigs select 字符串↔数字（:328-330/:362）                                                                                             | 需编码版 syncFromScene，**在 A8 第一批**                    |
| double-slit             | L×100（page.ts:86）；step 驱动 schema 重建（`:198-209` subscribe 里 buildSchema）；仪器/滤光片可见性（`:89-90/:134/:154-155`）                                                                                                                                                               | 已有正确 syncFromScene，不动                                |
| doppler-effect          | audioVolume ×100                                                                                                                                                                                                                                                                             | 已有，不动                                                  |
| mechanical-wave         | 单键 setParam API                                                                                                                                                                                                                                                                            | 已有，不动                                                  |
| mechanical-energy       | setVisible('resistance')（page.ts:101/114/156/187）                                                                                                                                                                                                                                          | 改写为静默 syncFromScene                                    |
| internal-energy         | applyVisibility（:140-148）                                                                                                                                                                                                                                                                  | 同上                                                        |
| variable-work           | setVisible('k'/'power')（:100-101/116-117/130-131/143-144）                                                                                                                                                                                                                                  | 同上                                                        |
| dynamic-circle          | applyVisibility（:109-116）                                                                                                                                                                                                                                                                  | 已有本地 syncFromScene 未挂出，挂上                         |
| force-composition       | applyTabVisibility（:110-114）                                                                                                                                                                                                                                                               | 同上                                                        |
| three-forces            | tab 驱动 setVisible（:112-116，调用点 :127/:146/:164）                                                                                                                                                                                                                                       | 改写为静默 syncFromScene                                    |
| emf-internal-resistance | syncSelect/syncSwitchButton 非 schema DOM（:72-82/:212-218）                                                                                                                                                                                                                                 | 改写为静默 syncFromScene                                    |
| **vt-integral**         | `getParams()` 返回索引编码 `{n, scene: 2}`（`scene.entry.ts:39-47`），控件是 id 为 `'scene1..3'` 的 scene-selector——通用投影 `setActiveSilently('scene','2')` 会静默 no-op（scene-selector 的 buttons.has 守卫），且因 `n` 投影成功抑制 refresh 回退 → 面板与仿真分叉（A1 验收 Claude 发现） | 补索引→id 解码的 syncFromScene 或 paramSync.projectControls |

projectile-components 的 syncSliders 是纯值回填（无 setVisible，全目录核实），**移出本表**，走通用投影。

### 1.5 select 字段使用面（定稿）

场景内仅 2 处：ticker-tape `vSigFigs`（controls-schema.ts:39）、emf-internal-resistance `sourceVoltage`/`internalResistance`（:27/:38）。仪器 2 处：vernier-caliper-guide、micrometer-eyepiece。两场景均在 tier-1；分派表仍须写对（`SchemaRenderer.ts:259-271` select 只有 valueSetter/silentValueSetter）。

### 1.6 其他基线事实

- B1 canvas 裸数字豁免表实测 **16 项**（scene-standard.spec.ts:54-71；**仅 ledger B1 误写 17**，AGENTS.md 无此数字——Wave D 校正 ledger）。
- backlog 12 项：已映射 4 项（P0-1 部分、P1-A、P1-B 部分、P2-E 部分「大模块拆分」行）；未映射 8 项：P1-C、P1-D、P1-E、P2-A、P2-B、P2-C、P2-D、P2-F。
- 行预算棘轮：`module-line-budget.spec.ts:10-18` `GRANDFATHERED: 路径→冻结行数`，其余 ≤1000，只降不升。
- `vite.config.ts:241-249` manualChunks 按目录前缀，文件内部拆分不影响分包。

## 2. Wave A：纯控件投影管线（阻塞批，单独成批，未绿不合 main）

### A1. 新模块 `src/app/control-projection.ts`

**API 与语义契约（写死，进契约测试）：**

```
projectControlsFromParams({
  params,        // 来自 entry 级 scene.getParams()
  handle,        // 须含静默四件套 + 字段类型表（A2 挂载）
  paramSync,     // 可选；仅用 paramMap(反查)/activeKeys/projectControls
}): void
```

1. **永不调用** `applyAll`/`applyParam`/`afterApply`/任何 scene setter/`scene.render()`。
2. **键宇宙 = 控件 schema 字段键集合**（`collectFieldKeys(schema)`；imperative 场景显式声明）。`resolveUrlSyncKeys` 继续只管 URL 写回。
3. **paramMap 反查仅一行**（全仓仅 projectile，单射可逆）；不可逆 → 必须走 `paramSync.projectControls`。
4. **按 schema 字段类型分派**：slider/number/text/toggle/**select** → `setValueSilently`；preset-group/scene-selector/`preset` 键/activeKeys → `setActiveSilently`。禁止 `typeof === 'string'` 启发式；禁止回退事件性 `setValue`；button/button-grid/hint/custom/transport 不参与分派、不触发 fail-loud。
5. **字段类型表随 handle 走**：`renderSchema`/`exposeSchemaHandle` 把字段类型表挂到 handle。
6. **两个调用点共用同一投影路径（R3 恢复条；表达式按 §10.5 勘误为准）**：bootstrapper remount（`scene-bootstrapper.ts:191-195`）与 `SceneAdapter.reset()`（`scene-adapter.ts:609-620`，transport reset 按钮 + 键盘 `r` 可达）都改为 `if (handle.syncFromScene) { handle.syncFromScene(); } else { projectControlsFromParams(...); }`（伪代码——`syncFromScene?.() ?? ...` 对 void 函数是无效表达式，恒双重投影）；`handle.refresh` 分支整体退役（退役收口在阶段 A3/A4，见 §10.9）；spring-oscillator 的列表重建式 refresh 保留、重命名并标注「仅供 reset/内部使用」。
7. `paramSync.projectControls(params, ctx)` 逃生口语义（A3 执行前定稿）：对 sim 只读、同步、不得 rAF 延迟。同步补 `SceneInstance.getParams?()` 类型声明。

### A2. handle 静默迁移

- 新增 `exposeSchemaHandle(renderer)`：转发 setValue/setValueSilently/setActive/setActiveSilently/setVisible/dispose + 字段类型表。
- **机械批 = §1.2(a) 83 个**；(b) 28 个逐个判定（dispose 清理保留；thin-film 的 pointerdown 摘除保留；ganshe 明确禁止机械替换；tier-1 场景用 `{ ...exposeSchemaHandle(renderer), syncFromScene }` 合成式）；(c) 9 个保持形态、仅补缺转发。
- toggle 补真 `silentValueSetter`；`SchemaRenderer.ts:97` 事件性回退测试环境 fail-loud。
- 契约 `NO_EVENTFUL_PROJECTION`：handle 必须暴露静默四件套（dispose-only 形态也覆盖）；扫描 glob 覆盖 `src/scenes/*/page.ts` + `src/pages/*.ts`。

### A3. getParams 补齐

按 §1.3 表执行：**7 个场景补 getParams**（electrification、interference-formula、micrometer、thin-film、vernier-caliper、wedge、field-lines）；emf-analogy 登记豁免；xt-graph/tortoise-hare/spring-oscillator 逐个裁定。**删除 adapter 快照退化源**（两家审计否决）。

### A4. dynamic-circle / force-composition 定时器

删本地 200ms 定时器、写穿 generation writer；dispose flush 兜底；本地 syncFromScene 挂到 handle（tier-1）。补「remount/dispose 时有 pending patch 不丢失」回归。

### A5. 具名回归（Wave A 门禁）

1. chase-meet：改 vExprA 表达式+数值 → 换布局 → text 框显示 live 表达式、滑块 live 值。
2. ticker-tape：countEvery 测 1 和 5；noise 三态；vSigFigs；showA；remount 后 `invalidateAll` spy=0 且工作区 session 仍在。
3. double-slit `?step=6` remount：scene setter spy=0 且 schema 为 step6。
4. projectile：v0 控件显示 live speed。
5. faraday-disc / interference-formula：URL 首绘回归（preset 高亮 / lambda 滑块配色）。
6. vt-integral：改 scene-selector 到 scene2 + 改 n → 换布局 → selector 高亮 live 场景（锁索引→id 解码，§10.1）。
7. ③ 5 场景：remount 时 setParams/writeParam spy=0。
8. **reset 路径**：transport reset / 键盘 `r` 后控件显示重置值（锁 A1.6 接线，②③ 场景各抽 1 个）。
9. 双向切布局（A→B→A）投影正确；空 URL permit 仍 complete。
10. `scene-param-pipeline.spec.ts` 迁移到两入口类。

### A6-A8

- **A6** 双契约：`NO_CONTROL_PROJECTION` ∪ `NO_EVENTFUL_PROJECTION`；B5 台账在全绿前重新打开。
- **A7** AGENTS.md「URL 参数同步」小节同批改写（v10 §6.3）。
- **A8** 内部顺序：先冻结语义——具名并集 **20 个**（§1.4 的 12 + ②③ 中未被 tier-1 包含的 6 个（projectile-components、centripetal-motion、resistor-measurement、precision-tools、charged-particle-circle、spring-ball）+ 特殊 2 个，去重口径：mechanical-energy/internal-energy/variable-work/emf-internal-resistance 已在 §1.4；vt-integral 经 v12.2 进入 §1.4）→ 再机械批 83 个。

## 3. Wave B：布局切换生命周期硬化

| 项  | 缺陷（证据）                                                                               | 修法                                                                                                    | 验收                                                                   |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| B1  | `hasUniqueCanvasOwner` 数整个 container 的 canvas（`layout-switch-runtime.ts:304-306`）    | 只比协调器持有的 stage canvas 节点；`layout:switch-error` 生产消费方或明文表面化「quarantine=整页重载」 | 多画布场景 reset 成功；`scene-container-registry.spec.ts:250-291` 仍绿 |
| B2  | dispose 不取消在途 switch（`container.ts:705-746`）                                        | runtime 加 abort/dispose；await 后、DOM/dataset/setCurrentLayout 写前查 `isDisposed()`+signal           | deferred loader + deferred mount 两条路径零 DOM 写入                   |
| B3  | throw-before-teardown ack-and-quarantine 完好旧布局（runtime `:174` 先于 snapshot `:178`） | 保持旧布局 + 回 idle + 错误上报                                                                         | 新增测试替身                                                           |
| B4  | enter-abort 保留新树但跳过 commit（`:249-251`）                                            | 补发 `onLayoutDidChange`/`layout:change`/savePreference；偏差写回 v10 §3.2:74                           | 同步 `scene-container.spec.ts:951-999`；**与 B2 同批**                 |
| B5  | `onLayoutWillChange` 打在新场景（`container.ts:423-436` → runtime `:360`）                 | 对旧场景发起或显式跳过                                                                                  | 双场景异布局测试                                                       |
| B6  | quarantine/reset 不清 pending 队列（`:322-330`/`:109-119`）                                | 清空或校验 `pendingSwitchId`/`pendingScene`                                                             | 与 C4 drain 顺序同测试锁                                               |

## 4. Wave C：中级硬化（可与 B 并行）

- **C1** 注册 token 跨 `clear()` 单调（`registry.ts:236/335/442`）；deferred-loader clear/re-register 回归（复用 B2 替身）。
- **C2** unmount/recovery mount await 有界化或强制同步契约 + rejection 观测（`container.ts:731`、`registry.ts:245`）。
- **C3** writer 静态契约覆盖非字面量 payload + `src/pages/single-loop-integration.ts` 纳入键校验；`url-sync.ts:124` 静默丢键加零丢失断言。
- **C4** resize 测试去 `_debounceSwitch` 私有驱动，contentRect stub + bounded-settle + N 次上限；`drainPending` 的 `savePreference:true` 硬编码（runtime `:687-691`）按 reason 传递。
- **C5** LOW 包：三布局 unmount 删 `dataset.mode`；`registry.create` 死参数 generation；recovery/abandonIncoming disposeAll 错误聚合；`data-workspace/index.ts:288-299` 过时注释；`notifyLayoutWillChange` 死接缝移除；`writeSceneParams` legacy 导出去留定夺。
- **C6（单独评审）** private selector 契约补 `.mobile-stack-layout`/`#mobile-panel-readout`。

## 5. Wave D：流程门禁与台账

- **D1a**：Wave A 落地后立即 `pnpm quality:full` 留档。**D1b**：全部完成后终验。
- **D2**：4 张 Linux 基线逐项 diff 说明；`update-darwin-snapshots.yml` 刷新 Darwin 配对，刷新前 4 场景 Darwin 对显式标记未配对。
- **D3**：台账 A4 补 1099/222/141/90；**B1 项数 17→16 校正（仅 ledger 误写）**；B5 措辞按 A6；收尾提交 hash 补记。

## 6. Wave E：结构性减债（A–D 全绿后开工，独立提交序列）

### E1. `src/platform/data-workspace/index.ts`（1413 → 6 模块，难度低）

**前提**：目录下已有 `session.ts` / `tolerance.ts` / `validation.ts` 三个兄弟模块——拆分前先盘点其内容归属，新模块只承接 index.ts 内代码，禁止与既有模块重复造功能。

**依赖方向（修正后，防 madge 环）**：`constants/types/spec-queries（叶子）← spec-validation ← session-ops ← index（桶）`，并允许各层指向既有 `session.ts`/`tolerance.ts`/`validation.ts`，禁止反向。修正点：`NEIGHBOR_ROW_MAX_OFFSET`（:772，被 `assertSpecGraph:417` 使用）与 `GraphNode` 放叶子层；`UNIT_ALIASES`（:300-308，使用点 :1034）与数值解析族同模块；spec 查询小函数（:309-401）下沉叶子层，不留 index。**R4 确认轮补充**：`dependencySatisfied`（:1307-1327，被 spec-validation 区段内 `stagedFieldReadiness:756` 调用）与 `isFieldReady`（:1329）同为纯查询（只依赖 fieldIsOk/getTrialField/getSummaryField/resolveRowLimits 等查询助手），必须一并下沉 `spec-queries.ts`——否则 spec-validation ⇄ session-ops 成环，`check:circular` 红。

| 新模块               | 内容                                                                                                                                                                 | 约行数 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `types.ts`           | 41-298 类型层 + DATA_WORKSPACE_STEPS + `NEIGHBOR_ROW_MAX_OFFSET`/`GraphNode` 叶子常量                                                                                | ~270   |
| `spec-queries.ts`    | 309-401 spec 查询小函数 + `dependencySatisfied`（:1307-1327）+ `isFieldReady`（:1329 同族）                                                                          | ~140   |
| `spec-validation.ts` | assertSpecGraph/assertRowCheckStages + validatedSpecs + **:644 之后的 rowCheck 阶段家族**（RowCheckStageState :646、rowCheckStageState :670 等，402-765 整段不截断） | ~365   |
| `numeric-format.ts`  | 837-1105 解析/判分族 + `UNIT_ALIASES`（:300-308）                                                                                                                    | ~280   |
| `session-ops.ts`     | 依赖图其余（767-835）+ 会话写（1107-1305）+ readiness 其余（1307-1413 减去已下沉两项）                                                                               | ~350   |
| `index.ts`           | 纯桶 re-export                                                                                                                                                       | ~40    |

### E2. `src/ui/components/data-workspace-panel/index.ts`（1099 → 4 模块，难度中）

| 新模块              | 内容                                                                                         | 约行数 |
| ------------------- | -------------------------------------------------------------------------------------------- | ------ |
| `confirm-dialog.ts` | 删除确认框 + 焦点陷阱（107-180）                                                             | ~110   |
| `table-render.ts`   | bindCheck + 行渲染族 + renderTable + patchTableCells（PanelContext 注入，仿 chart-stage.ts） | ~450   |
| `summary-render.ts` | ensureSummary/syncSummary/renderResult/renderKnownsInto                                      | ~200   |
| `index.ts`          | 骨架 + 步骤可见性 + update() + 公开类型                                                      | ~340   |

约束：

- `update()` 完整顺序锁定（`index.ts:1060-1081`）：knowns → hint → 步骤可见性 → 加行按钮 → **表** → review → **summary** → **result** → chart 分隔条。
- `tests/unit/data-workspace-architecture.spec.ts:6` 的 `PANEL` 检查**同时含正向 `toContain`**（rowFields/summaryFields/applyDrafts/setChartMode 四个闭包标识符）与禁词负向检查——拆分后正向断言改为扫目录聚合（禁词同理；`FORBIDDEN` 含 `ticker-tape` 子串，新文件注释避开）。
- `RUNTIME_MODULES`（:55-62）当前对目录式条目**永远匹配不上**（`resolveSpecifier` 解析到 `<dir>/index.ts`，匹配却用目录路径）——须把匹配逻辑改为目录前缀，否则该 spec 对新模块静默失效。

### E3. `src/scenes/ticker-tape/scene.view.ts`（1381 → 4-5 模块，难度中）

**关键约束（R3 新发现）**：`scene-standard.spec.ts` 的 `collectSceneRenderSource`（`:125-128`）**只读 `scene.view.ts` 或路径含 `renderer/` 的文件**，且 ticker-tape 不在 B1 豁免内——拆分出的绘制模块**必须放 `src/scenes/ticker-tape/renderer/` 子目录**（或同步扩大收集函数扫描面），否则大尺寸字面量逃出 AST 棘轮。

| 新模块（均放 `renderer/` 子目录）        | 内容                                                                                                                                                                          | 约行数 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `renderer/graph-layout.ts`               | 48-275 纯布局/刻度数学；**但 `measureGraphViewport`（:248-275）查询 `.data-workspace-chart`/`.lab-plot-toolbar` DOM 类名，非纯数学**——抽出时类名常量化并在模块头注明 DOM 依赖 | ~240   |
| `renderer/tape-band.ts`                  | 305-363 避让带 + **palette（:284-303，划入本模块）**                                                                                                                          | ~110   |
| `renderer/draw-tape.ts`                  | drawTape + roundRectPath + **TapeHit 类型外提导出**（现为工厂闭包内类型 :408），drawTape 返回 TapeHit 由工厂回填                                                              | ~280   |
| `renderer/draw-graphs.ts`（可选第 4 刀） | drawPanel + applyGraphCanvasSize + drawGraphs + PlotStateStore                                                                                                                | ~420   |

风险与联动：

- `render()`（:1281-1290）消费当帧 TapeHit 写 dataset 快照（e2e 依赖）——拆分后该路径必须保持。
- 6 个已测导出 + 2 个避让带导出经 `scene.view.ts` re-export 转发，测试 import 面不变。
- **例外**：`tests/unit/private-layout-selector-contract.spec.ts:40-45` 只读 `scene.view.ts` 且要求其 `toContain('STAGE_FRAME_ATTR')`（`findWorkspaceTransportBar :333` 是唯一使用点）——该 spec 列入 E3 改动面（改读 `renderer/tape-band.ts` 或场景目录聚合），§8 的「场景测试零改动」表述不适用于此 spec。
- view↔entry 接口（`scene.view.ts:1297-1380` 的 14 个方法）签名不变。
- `CreateTickerTapeViewOptions` 类型（:277-282）**留在 `scene.view.ts`**（只被保留的工厂使用），并禁止 `renderer/` 子模块反向 import 它（防 view⇄renderer 环）。

### E4. backlog 12 项逐条映射 + 收尾裁定

补齐 §1.6 所列 8 个未映射项的 done/still-open/superseded 映射；still-open 逐项裁定：转入 ledger B 区（带守卫）/ 列入本方案 / 显式否决。backlog 表头 container 行数 690→700 顺手修正。

### E5. B1 裸数字豁免表收缩（16 项）

政策（本批不强制指标）：优先从仍有大字面量的场景开刀（如 field-lines / ganshe / chase-meet——**注意 ticker-tape 不在 B1 表内，不能作为起点**）；每收缩 1 项更新 spec 清单；与「每季度至少缩小 1 项」政策对齐。

### E6. 棘轮更新

E1-E3 完成后删 `module-line-budget.spec.ts:10-18` 三条祖父条目；新模块自动落入 1000 上限；残余 index 若 >1000 以实测更低值重新冻结（只降不升）。

## 7. 批次与依赖总序

```
Wave A（A1 语义 + A6/A7 契约文档 + 具名 20 场景冻结 → 83 机械批 → A4 定时器 → A5 门禁 + D1a）
  → Wave B（B2+B4 同批；B1/B3/B5/B6）∥ Wave C（C1 复用 B2 替身）
  → D1b / D2 / D3
  → Wave E（E1 → E2 → E3 各自独立提交；E4/E6 随对应批次）
```

- A 未绿不合 main；A 是唯一改控件投影/URL 写回的批次，D1a 紧随其后。
- B 依赖 A 仅「切布局触发 remount 时投影已在」。C 与 B 无代码交叠，可并行。
- E 与 A–D 无代码交叠，置后是合并冲突规避策略（A 动 84+ 个 page.ts），不是技术依赖。

## 8. 验收矩阵

| Wave | 门禁                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | A5 十项具名回归（含 reset 路径与 vt-integral 解码）+ 双契约落地 + AGENTS.md 同步 + D1a 绿                                                                                                                                                                                       |
| B    | B1-B6 各项新增测试全绿；`quality:core` 绿                                                                                                                                                                                                                                       |
| C    | C1-C6 各项测试/契约绿                                                                                                                                                                                                                                                           |
| D    | D1b quality:full 绿留档；D2 基线配对完成；D3 台账校准（含 B1 17→16）                                                                                                                                                                                                            |
| E    | 拆分后 `quality:core` 绿（含 `check:circular`——E1 依赖图红线）；`data-workspace-architecture.spec.ts` 目录化 + `RUNTIME_MODULES` 前缀化同步落地；`private-layout-selector-contract.spec.ts` 按 E3 改动面更新；view↔entry 14 方法接口签名零变化；棘轮条目删除且 LIMIT 兜住新模块 |

总门禁：`quality:full` 绿 + 两份交叉审计合并行动清单逐条关闭（或登记为已批准偏差）+ §1 清单中与机制相关的部分（四态、handle 形态、getParams 覆盖）由 A6 双契约与 `scene-params-contract.spec.ts` 持续强制。

## 9. 明确不做 / 已批准偏差

- 不动其余 4 个祖父文件（pendulum-period 1091 / potential-energy-graphs 1078 / multimeter-practice 1019 / rod-model 1006）——无独立职责边界不拆（B9）。
- 不补 B11 的 101 场景像素基线；不改 chase-meet 解析器特征化语义（C3）。
- 已批准偏差：① mount 按 effectful 异步处理（过度近似但更安全）；② 并发 switchLayout 只排队 `reason==='manual'`（触发条件：新增非 manual 调用方）；③ 页 teardown 先 unmount scene 再 dispose capabilities（无 live 失败）；④ ControlSnapshotStore/adapter 快照方案**否决**（防过度设计）。

## 10. v12.2 补充条款（阶段 A1 实施验收后，2026-09-28）

来源：A1 验收（Claude 报告 `artifacts/exec-a1-claude-acceptance-result.md`，ACCEPT: PASS 附带）。以下条款与本方案正文同等效力。

1. **【冻结批/A8 第一批，高】vt-integral 移入 tier-1**（§1.4 表已加行）：索引编码 selector 场景在机械批之前必须有解码版投影，否则「投影器报成功、面板静默不动」。解码版 syncFromScene 的交付与 ticker-tape 同批（阶段 A3 冻结批）。
2. **【A2】键盘 `r` 归并**：`scene-adapter.ts:312-316` 有一段内联 reset（不经 `this.reset()` → 不经投影）。A2 阶段改为 `() => this.reset()` 去重，否则 A5.7 的 reset 回归按键盘路径会失败。
3. **【A2】删除 `control-projection.ts` 的 `handle.schema` 回退分支**（或至少 `Array.isArray(schema?.sections)` 守卫）：方案只规定 `fieldTypes`；schema 分支是契约外路径且在 remount/reset 这类不该抛异常的路径上有 TypeError 风险。
4. **【A2 契约】`NO_EVENTFUL_PROJECTION` 同时断言 `fieldTypes` 存在且非空**：否则 `exposeSchemaHandle` 漏转发时投影静默返回 false（fail-silent），与薄包装丢字段同一失效模式。
5. **【勘误】A1.6 的 `syncFromScene?.() ?? projectControlsFromParams(...)` 是无效表达式**（void 函数的 `??` 恒落入右侧 → 双重投影；A2 后自定义句柄带上 fieldTypes 时会用原始 sim 值覆盖编码值，如 double-slit 的 L×100）。正确语义为伪代码 `if (handle.syncFromScene) { handle.syncFromScene(); } else { projectControlsFromParams(...); }`。实施已按此落地（`syncControlsFromLiveParams`）。
6. **【语义】projector 返回 boolean = 「至少投影一键」**，不等于完整投影；部分键跳过时不回退 refresh（skip 是刻意的，如编码场景走 tier-1）。召回缺口依赖 A5 具名回归与 NO_CONTROL_PROJECTION 豁免审查，不靠返回值。
7. **【记录·非回归】首屏（空 URL）不投影**：schema 默认值 ≠ sim 默认值的场景（如 projectile 滑块默认 30 vs sim 默认 20）首屏以 schema 为准，首次 remount 后显示 live 值。A5 不为此加断言；如产品上要消除，另行立项。
8. **【建议·实施期】`single-loop-integration.ts` 的 `Omit<SceneInstance,'getParams'>` 补注释**（防后人还原踩坑）；`SceneParamSync.projectControls` 的 `ctx.handle` 类型与 `ControlProjectionHandle` 统一（A2 顺手）；`url-sync.ts:318` 的 `typeof string → setActive` 启发式与投影器分派规则的分歧在 A5/A7 对齐时记录为已知差异。
9. **【收口指派】`handle.refresh` 分支退役 + spring-oscillator 的 `refresh: renderOscillatorList` 重命名/标注**，归阶段 A3（冻结批）执行、A4 验收（A4 完成后 `control-projection.ts` 的 `TODO(A4)` 回退分支删除，refresh 调用点归零）。A1 阶段按阶段化条款保留回退是过渡态，不是终态。

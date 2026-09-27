# v11.2 方案：v10 收尾 + 控件投影架构收敛（交叉审计通过稿）

> 日期：2026-09-27。基线：`fix/physics-2d-remediation` @ `22616fe` + 未提交的 v10 实现（tsc 通过；quality:core / e2e / linux-visual 日志为绿）。
> 审计链：三方独立审计（`/tmp/physics-2d-final-audit/`，均 CHANGES_REQUIRED）→ v11 初稿 → 第一轮方案交叉审计（Claude 7 阻塞 / Grok 5 阻塞，`artifacts/v11-*-round1-*`）→ v11.1 → 第二轮（**Grok PASS**；Claude 判 3 条文本级阻塞，明示「改完即可开工，无需第三轮」，`artifacts/v11-*-round2-*`）→ 本稿 v11.2 已纳入全部修正。

## 0. 现状判断

v10 Waves 1–6 真实落地，门禁日志属实；但交叉审计确认 6 个 HIGH + 若干 MEDIUM，且 `quality:full` 从未运行。架构性半拉子工程：restore-once（URL 半套）已发布，remount 控件投影（控件半套）未落地——v10 计划 §3.6:171 明文禁止拆分发布这两半。

### 0.1 两类场景家族（修正后的事实）

「打点计时器纸带家族」= data-workspace 实验场景，仅 ticker-tape + double-slit 两个；「追击相遇家族」= chase-meet 型简单参数场景，约百个。共享根因：**控件投影是每场景手写 hook 的可选义务，而不是平台管线**。

| 态             | 场景                                                                                                                                                         | 说明                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ① 静默投影完整 | double-slit、ampere-balance、single-loop、doppler-effect、mechanical-wave                                                                                    | remount 已正确                                                                                                                           |
| ② 事件性+守卫  | mechanical-energy、internal-energy、variable-work、projectile-components、emf-internal-resistance                                                            | 值正确但派发多余事件；多数 refresh 内含 setVisible/换算，**不能整段删**（projectile-components 的 syncSliders 是纯值回填，可走通用投影） |
| ③ 事件性无守卫 | centripetal-motion、resistor-measurement、precision-tools、charged-particle-circle、spring-ball                                                              | remount 重入 onChange → setParams + writeParam 副作用                                                                                    |
| ④ 无投影       | 其余 ~100（chase-meet 仅 dispose；ticker-tape 仅 setValue/setActive/dispose；dynamic-circle/force-composition 有本地 syncFromScene 但未挂 handle，属死代码） | 控件回退 schema 默认值，live scene 保留学生参数                                                                                          |
| 特殊           | ganshe（refreshObservers）、spring-oscillator（refresh=重建振子列表）                                                                                        | 不属上表，单独处理                                                                                                                       |

规模事实（两家审计实测确认）：page 层显式转发静默 setter 的仅 ~5 场景 + 3 个直接 `return renderer` 的场景；**~83 个 page.ts 是 `setValue: renderer.setValue` 薄包装，把 SchemaRenderer 自带的静默 API 丢掉了**；另有 9 个 handle 在转发之外还带副作用语句（见 A2 名单规则）。缺口在 page 包装层。

## 1. 方案总览

- **Wave A（阻塞批，单独成批，未绿不合 main）**：纯投影函数 + handle 静默迁移 + ①②③+特殊 17 个场景语义冻结 + 两个 page 定时器 + 具名回归 + AGENTS.md 改写。
- **Wave B（生命周期硬化）**：画布 custodian 域、dispose 取消在途 switch、throw-before-teardown、enter-abort commit 语义、onLayoutWillChange 对象、quarantine 队列清理。
- **Wave C（中级硬化，可与 B 并行）**：token ABA、unmount 有界、writer 静态契约、resize 测试、LOW 项。
- **Wave D（流程门禁）**：D1a（Wave A 后立即跑 quality:full）→ D1b 终验、基线 diff 说明 + Darwin 配对、台账补记。

## 2. Wave A：纯控件投影管线

**A1. 新建纯投影函数** `projectControlsFromParams`（新模块 `src/app/control-projection.ts`），语义契约（写死，进契约测试）：

1. **永不调用** `applyAll` / `applyParam` / `afterApply` / 任何 scene setter / `scene.render()`；唯一的数据读是调用方传入的 `params`（来自 entry 级 `scene.getParams()`）。
2. **键宇宙 = 控件 schema 的字段键集合**（新增 `collectFieldKeys(schema)` 静态收集；imperative controls 场景显式声明键清单），**不是** `resolveUrlSyncKeys`（那是 URL 写回白名单，比控件字段窄——实测 6 场景 12 个值字段是孤儿键，含 chase-meet 的 `vExprA`/`vExprB`）。`resolveUrlSyncKeys` 继续只管写回。schema 类型表由 `renderSchema`/`exposeSchemaHandle` 挂到 handle 上，使 bootstrapper 与 `SceneAdapter.reset()` 调用点都能拿到。
3. **paramMap 逆映射仅一行**：有 paramMap 则反查（全仓仅 projectile 一个，单射可逆），否则恒等；不可逆/多对一 → 该场景必须走 `paramSync.projectControls` 逃生口，不做通用推理。
4. **逐键按 schema 字段类型分派**：slider/number/text/toggle/**select** → `setValueSilently`（select 只注册了 valueSetter/silentValueSetter，没有 activeSetter——`SchemaRenderer.ts:259-271`）；preset-group/scene-selector/`preset` 键/activeKeys → `setActiveSilently`。**禁止** `typeof value === 'string' → setActive` 启发式。**禁止回退到事件性 `setValue`**，缺静默 setter 即跳过并计入契约失败。`button/button-grid/hint/custom/transport` 不参与分派，也不触发 fail-loud。
5. **编码/换算/可见性/非 schema DOM 场景不进通用投影**，保留或改写 tier-1 静默 `syncFromScene`（或走 `paramSync.projectControls`）：ticker-tape（countEvery 1|5→toggle boolean、noise 0|1|2→preset 三态、showA 0|1→boolean）、double-slit（L×100、step 驱动 schema 重建）、doppler（audioVolume×100）、mechanical-energy / internal-energy / variable-work / dynamic-circle / force-composition / three-forces（setVisible 可见性）、**emf-internal-resistance**（syncSelect/syncSwitchButton 等非 schema DOM 同步，renderer API 表达不了）。
6. `SceneAdapter.reset()`（transport reset 按钮 + 键盘 `r` 可达，`scene-adapter.ts:609-620`）与 bootstrapper remount **共用同一条投影路径**：`syncFromScene?.() ?? projectControlsFromParams(...)`。`handle.refresh` 分支退役；spring-oscillator 的列表重建式 refresh 保留但重命名语义标注「仅供 reset/内部使用」。
7. 新增逃生口 `paramSync.projectControls(params, ctx)` 的语义契约（A3 执行前定稿）：入参 params/handle/mount/activeKeys；**对 sim 只读**（禁止 setParams，否则 R7 换门重入）；同步实现、不得 rAF 延迟。同步补 `SceneInstance.getParams?()` 类型声明（`scene-bootstrapper-types.ts`）。

**A2. handle 静默迁移（机械批）**：ui 层提供 `exposeSchemaHandle(renderer)`，转发 setValue/setValueSilently/setActive/setActiveSilently/**setVisible**/dispose 及字段类型表，批量替换薄包装字面量。**名单规则：转发之外还带副作用语句的 handle 一律人工判定、不参与批量替换**——当前清单：faraday-disc（`page.ts:104` preset 高亮 syncPreset）、interference-formula / thin-film / wedge（lambda 滑块配色 updateLambdaSliderColor）、dynamic-circle / force-composition（applyVisibility/applyTabVisibility）、internal-energy / variable-work / emf-internal-resistance（可见性/syncSelect）。toggle 补真 `silentValueSetter`；`SchemaRenderer.ts:97` 静默→事件性回退在测试环境 fail-loud。契约测试 `NO_EVENTFUL_PROJECTION`：handle 必须暴露静默四件套（**含 chase-meet 这类只 return `{dispose}` 的 dispose-only handle**——只扫「有 setValue 必有 setValueSilently」抓不住它们）；扫描 glob 同时覆盖 `src/scenes/*/page.ts` 与 `src/pages/*.ts`（single-loop-integration 在后者）。与 A1 同批落地。

**A3. getParams 覆盖面**：投影主源 = entry 级 `scene.getParams()`。实测无 entry 级 getParams 的共 **10 个**：doppler-effect、electrification、emf-analogy、interference-formula、mechanical-wave、micrometer、thin-film、vernier-caliper、wedge，加 double-slit（其 entry getParams 是 data-workspace 注入参数，不是参数 API；它有 tier-1 hook 兜底）。处理规则：

- doppler-effect / mechanical-wave / double-slit：已有 tier-1 hook，无需动作。
- electrification / interference-formula / micrometer / thin-film / vernier-caliper / wedge **都有非空 defaultParams，不得豁免**——必须补 getParams（多数已有 setParams，补读侧即可）。
- emf-analogy：defaultParams 为空，登记豁免。
- **豁免落在 A6 的 `NO_CONTROL_PROJECTION` 清单，不塞进 `NO_PARAMS_API`**（该契约要求登记者没有 setParams，口径不同，混入会让 scene-params-contract.spec.ts 变红）。
- spring-oscillator / tortoise-hare / vt-integral / xt-graph 有 handle 级 getParams（不在缺口清单），但 xt-graph 只返回 `{speed}`、spring-oscillator 只返回首振子——属「投影源不完整」，逐个裁定；spring-oscillator 按「列表重建 + 首振子 getParams」单独处理。
- **删除 v11 初稿的「adapter 最近应用快照」退化源**（两家审计一致否决）。

**A4. 两个 page 级 200ms 定时器**（dynamic-circle、force-composition）：优先直接删本地定时器、写穿 generation writer；dispose 时 flush pending patch。两文件已写好但未挂出的本地 `syncFromScene` 挂到 handle（带 setVisible 副作用，属 A1.5 保留类）。补「remount/dispose 时有 pending patch 不丢失」回归。

**A5. 具名回归（Wave A 验收门禁）**：

- chase-meet：改 `vExprA` 表达式 + 数值参数 → 强制换布局 → **text 框显示 live 表达式**、滑块显示 live 值；
- ticker-tape：`countEvery` 分别测 1 和 5、`noise` 三态 preset、`vSigFigs`（select）、`showA` toggle；remount 后 `invalidateAll` spy = 0 且工作区 session 仍在（去掉 chips 空断言）；
- double-slit `?step=6` remount：scene setter spy = 0 且 schema 为 step6；
- projectile：`v0` 控件显示 live `speed`（锁 paramMap 逆映射）；
- faraday-disc / interference-formula：URL 首绘回归（preset 高亮 / lambda 滑块配色不丢失，锁 A2 名单规则）；
- ③ 5 场景：remount 时 `setParams`/`writeParam` spy = 0；
- 双向切布局（A→B→A）投影仍正确；空 URL permit 仍 complete；
- `scene-param-pipeline.spec.ts` 迁移到两入口类（首绘 URL / remount 投影）。

**A6. 契约与台账**：`NO_CONTROL_PROJECTION`（每个 entry 有可靠只读投影或登记豁免）+ `NO_EVENTFUL_PROJECTION` 双契约。B5 台账在 A5 全绿前重新打开。

**A7. AGENTS.md「URL 参数同步」小节同批改写**（v10 §6.3 强制）。

**A8. Wave A 内部顺序**：先落 A1 语义契约 + ①②③+特殊共 17 个场景（含 ticker-tape——它是薄包装但有编码需求，机械批若只换 exposeSchemaHandle 而不挂编码版 syncFromScene，A5 必败；放第一批）→ 再 ~83 个机械批（A2）。前者冻结协议，后者依赖协议冻结。

## 3. Wave B：布局切换生命周期硬化

- **B1 画布 custodian 域**：`hasUniqueCanvasOwner` 只比协调器持有的 stage canvas 节点；`resetSwitchQuarantine` 在多画布场景可达；`layout:switch-error` 加生产消费方或明文「quarantine = 只能整页重载」并表面化。**联动注意**：不得破坏「持有 node 且容器 0 canvas → true」语义——普通 mount 抛错路径靠它不进 quarantine（`scene-container-registry.spec.ts:250-291` 锁定）。
- **B2 dispose 取消在途 switch**：`LayoutSwitchRuntime` 加 abort/dispose；每个真实 await 后、DOM/`setCurrentLayout`/`dataset` 写前查 `isDisposed()` + signal。测试：deferred loader + deferred mount 两条 dispose 路径。
- **B3 throw-before-teardown**：snapshot 前 `onLayoutWillChange` 抛错 → 保持旧布局 + 回 idle + 错误上报，不得 ack-and-quarantine。补测试替身。
- **B4 enter-abort commit 语义**：`incomingMounted` 后 abort → 保留新树但**补发** `onLayoutDidChange`/`layout:change`/savePreference；作为已批准偏差写回 v10 §3.2:74，同步 `scene-container.spec.ts:951-999`。**B2 与 B4 同批改**（同处 catch/finally）。
- **B5 onLayoutWillChange 对象**：`_doSetScene` 改为对**旧场景**发起（或场景替换时显式跳过）；补双场景异布局测试。
- **B6 quarantine 队列清理**（Grok MEDIUM-3）：`enterQuarantine`/`resetSwitchQuarantine` 清空或校验 `pendingSwitchId`/`pendingScene`；与 C4 的 drain 顺序在同一测试里锁。

## 4. Wave C：中级硬化（可与 B 并行；C1 复用 B2 的 deferred-loader 测试替身）

- **C1** 注册 token 跨 `clear()` 单调；deferred-loader clear/re-register 回归。
- **C2** `unmount()`/recovery `mount()` await 有界化或强制同步契约 + rejection 观测（`container.ts:731`、`registry.ts:245`）。
- **C3** writer 静态契约覆盖非字面量 payload + `src/pages/single-loop-integration.ts` 纳入键校验；`url-sync.ts:124` 静默丢键加契约断言零丢失。
- **C4** resize 测试去 `_debounceSwitch` 私有驱动，contentRect stub + bounded-settle + N 次上限；`drainPending` 的 `savePreference: true` 硬编码改为按 reason 传递。
- **C5 LOW 包**：三布局 unmount 删 `dataset.mode` 清理；`registry.create` 死参数 generation；recovery/`abandonIncoming` disposeAll 错误聚合；`data-workspace/index.ts:288-299` 过时注释；`notifyLayoutWillChange` 死接缝移除；`writeSceneParams` legacy 导出去留（做出决定并记录）。
- **C6（单独评审）** private selector 契约补 `.mobile-stack-layout`/`#mobile-panel-readout`。

## 5. Wave D：流程门禁与台账

- **D1a**：Wave A 落地后立即跑并留档 `pnpm quality:full`（全部 `tests/visual` + e2e）。
- **D1b**：全部 Wave 完成后终验 `quality:full`。
- **D2**：4 张已替换 Linux 基线写逐项 diff 说明；`update-darwin-snapshots.yml` 刷新 Darwin 配对，刷新前把 4 场景 Darwin 对显式标记未配对。
- **D3**：台账 A4 补当前实测 1099/222/141/90；backlog 逐条映射补齐 12 项、690→700；B5 措辞按 A6；收尾提交 hash 补记。

## 6. 验收

- Wave A：A5 全部具名回归 + 双契约落地 + AGENTS.md 同步。
- Wave B/C：新增测试全绿；`pnpm quality:core` 全绿。
- Wave D：D1a/D1b/D2/D3 留档。
- 总门禁：`quality:full` 绿 + 两份交叉审计合并行动清单逐条关闭（或显式登记为已批准偏差）。

## 7. 明确不做 / 已批准偏差登记

- 不动 7 个 >1000 行祖父豁免文件（B6/B8/B9 棘轮维持）；不补 B11 的 101 场景像素基线；不改 chase-meet 解析器特征化语义（C3）。
- 已批准偏差（登记 + 复查条件）：① `mount` 按 effectful 异步处理是过度近似但更安全（G-MEDIUM-1，接受）；② 并发 switchLayout 只排队 `reason==='manual'`（生产 resize 走 dirty-bit，触发条件：新增非 manual 调用方）；③ 页 teardown 先 unmount scene 再 dispose capabilities（C-LOW-4，无 live 失败，接受）；④ adapter 参数快照 / ControlSnapshotStore 方案**否决**（防过度设计）。

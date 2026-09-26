# 布局系统修复：偏好约束、lab 读数契约化、并发与池隔离（v2）

> 状态：**已实施（2026-09-25）**。2026-09-25 布局系统/架构审计的修复方案。
> 实施结果：全量单测 289 文件 / 7406 通过（新增 T1–T10 及 default-strategies
> 按 4 策略契约重写）；`verify:scene` ticker-tape / projectile-components /
> mechanical-energy 各 7 步全过；`quality:core` exit 0；bundle 预算无回归。
> 实施后经 Codex 第三轮审计（实施 diff 核验）裁决【有缺陷必须修】，三处
> 缺陷已修复并补齐漏报测试：①低功耗分支可绕过 forcedLayout（container.ts
> 低功耗守卫补 `!this._forceLayout`）；②`_finalizeLayoutSwitch` 的 enter
> await 后缺代际防护（旧代可写事件与偏好——传入 isStale，enter 后判死）；
> ③Fix 6 的 `!current` 恢复分支超出方案语义（撤回，清空模板视同漂移）。
> 同窗口重解析、约束外强制、enter 挂起作废、双 pending 优先级、空模板漂移、
> 低功耗×强制等六处「实现坏、测试绿」漏报均已补测。
> 实施期间修正 v2 设计的两处遗漏：①`_setupIncomingLayout`/`_teardownOutgoingLayout`
> 内部的 await 边界同样需要代际防护（旧协程在子过程内恢复仍会写入状态，
> T8 抓出）；②安全计时器判死后须主动 drain 排队项，否则被搁置的
> pendingSwitchId/pendingScene 永不消费。
> 审计经 Codex CLI（read-only 沙箱）两轮交叉：
> 第一轮（发现核实）：7 条发现 5 条完全成立、P1 确认且更严重（`?layout=` 会被
> 偏好覆盖）、影响面一处高估（订阅隔离）、补充「实例池未按容器隔离」。
> 第二轮（方案本体审计）：总裁决**【修改后批准】**——Fix 3 可行；Fix 1 需
> debounce 触发时重解析；Fix 2 需删除依赖旧插槽位序的场景代码、撤回「视觉零
> 变化」表述；Fix 4 改用 WeakMap；**Fix 5 被【反对】**（generation 只保护
> finally 状态，不阻止超时旧协程继续操作共享 DOM，需 await 边界取消语义 +
> 单一 drain 流程）；Fix 6 撤回形态词表统一（`display:none` 不折叠显式 8px
> 轨道，会产生空隙），改为「演示形态成员检测 + 漂移跳过」。
> v2 已吸收全部裁决。
>
> 范围：`src/app/layouts/` 全部 + 两个场景的 lab 耦合点。不改布局 CSS。

## 0. 已确认的产品/设计决策

| 决策            | 结论                                                                                                                                            | 依据                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 偏好语义        | **约束内的粘滞**：手动布局在满足其视口约束时持续生效；违反时自动回落，恢复满足后偏好重新生效。偏好保持全局共享                                  | Codex 确认跨场景钉死是产品 bug；per-scene 存储否决                                                                                |
| `?layout=` 语义 | **强制档**（策略 0，高于偏好，仅要求已注册；跨 resize 持续生效）                                                                                | AGENTS.md 承诺「强制」未兑现；Codex 确认约束外强制挂载符合强制语义，但文档须注明可能出现布局溢出                                  |
| 观察器          | 移除两处偏好门（:56-57 与 :97-99 **必须同时删**），且 **debounce 触发时重解析**（不沿用观察时刻的旧目标）                                       | Codex Q1：偏好窗口内变化时旧目标仍会切入；重解析后偏好满足==当前布局，无横跳                                                      |
| lab 读数        | 声明 inline readout-panel（config 与场景自挂一致）；读数插槽改到 data slot **之前**；**必须**删除场景侧依赖旧位序的重排代码                     | Codex Q2：无双重更新（orchestrator SCENE_BINDINGS 接管）；`dataSlot.nextElementSibling === slot`（page.ts:139）依赖旧位序，必须删 |
| 实例池          | **WeakMap<HTMLElement, Map<string, ILayout>>**                                                                                                  | Codex Q3：普通 Map 强引用每个曾归还的容器，泄漏随容器生命周期累积；WeakMap 随 GC 回收，clearPool 以整体替换实现                   |
| 并发切换        | **await 边界 generation 取消 + 容器级单一 pending 队列（原子取出、串行 drain）**                                                                | Codex 裁决【反对】v1：仅保护 finally 不够，超时旧协程仍会继续拆装共享 DOM                                                         |
| 演示网格恢复    | **不改**演示写入的模板（保留 `'0px 0px 1fr'`/`'48px 0px 1fr'`/minimal）；恢复时检测「当前模板是否仍属演示形态集合」，漂移则跳过模板恢复交给重算 | Codex Q5：`display:none` 不折叠显式 8px 轨道，v1 的 `'0px 8px 1fr'` 统一会留空隙；成员检测同时规避了正则捕获与隐藏态的矛盾        |

## 1. 修复项

### Fix 1（P1）偏好约束化 + `?layout=` 强制档 + 观察器重解析

1. `selector.ts` `LayoutSelectionContext` 增加 `forcedLayout?: string`；
2. `default-strategies.ts`：
   - 策略 0（新）：`forcedLayout` 已注册 → 直接返回（不查约束；矩阵测试自行
     保证视口合法，dev 强制溢出为显式行为的已知后果，文档注明）；
   - 策略 1 改为：`userPreference` 经 `getMetadata` + `satisfiesConstraints`
     校验，满足才返回，否则 null 落入后续策略（偏好保留不删除）。
     收敛性（Codex Q1 确认）：偏好满足 → 策略 1 胜过 scenePreference；违反 →
     scenePreference/自动策略接管；自动结果稳定，无横跳路径；
3. `container-resize-observer.ts` 重构（Codex 修正）：
   - 删除 :56-57 `!userPref` 门与 :97-99 `_debounceSwitch` 内的偏好短路
     （**两处必须同时删**，漏删任一处约束检查都被旁路）；
   - **debounce 触发时重解析**：观察回调只记「有场景、需要重评估」，计时器
     到期后重新调用 `resolveLayout(getCurrentScene())` 取最新目标，再与
     `getCurrentLayoutId()` 比较——偏好/约束在 300ms 窗口内的变化不会切入
     旧目标；`_lastLayoutId` 字段随之删除（比较目标==当前布局已覆盖其职责）；
4. `types.ts` `CreateContainerOptions.forceLayout?: string`；`container.ts`
   `resolveLayout` 填充 `ctx.forcedLayout`；`scene-bootstrapper.ts` 在
   `?layout=` 命中已注册布局时传入。

**不做**：偏好 per-scene；手动切换的约束拦截；「自动」档 UI。

### Fix 2（P2）lab 读数能力声明化 + 数据插槽契约化

1. `lab-stage.ts` 构造器：
   `afterDataWorkspace: [{ id: 'readout-panel', config: { position: 'inline',
collapsed: false, cssPrefix: 'mobile', label: '' } }]`（与场景自挂配置一致）；
2. `lab-stage.ts` mount：读数插槽 `data.slot.insertAdjacentElement('beforebegin',
readout)`——与 projectile-components 场景手动重排后的最终位序**一致**
   （读数在上、数据表在下），该场景视觉不变；其余 lab 场景 data slot 为空，
   位序无视觉差异。**撤回 v1 的「视觉零变化」总表述**：新顺序对 lab 全场景
   生效，空读数面板（标题+空列表）将出现在无 getReadoutItems 的场景——
   lab 为手动布局，接受并在文档注明；
3. `platform/stage-chrome.ts` 增加 `LAB_DATA_SLOT_ATTR = 'data-lab-data-slot'`
   常量；lab-stage 打标与两场景查询改用常量；
4. `projectile-components/page.ts`：**必须**删除 `ensureLabReadout` 的自挂
   分支（含 `as never`）与 `dataSlot.nextElementSibling === slot` 重排块
   （Codex：该检查依赖旧位序，移位后失效且成为陷阱）；保留
   `suppressLabFloatInlineReadoutTitle`。删除后由 orchestrator
   `SCENE_BINDINGS['readout-panel']` 经 `scene.subscribe` 自动更新——
   无双重更新（自挂守卫命中声明面板后本就不再创建实例，删码消除路径）；
5. 两个场景 `findXxxDataHost`：查询根从 `document` 收窄为
   `mount.closest('[data-layout-id]')`（调用点持有控制区锚点），无布局根时
   回退 `document`（测试环境裸挂兼容）；
6. 契约测试：`stage-chrome-contract.spec.ts` 增加 lab-stage
   `[data-lab-data-slot]` 与 `[data-readout-slot]` 存在断言。

### Fix 3（P3）orchestrator 订阅回调异常隔离

`capability-orchestrator.ts:161-169` 回调体 try/catch + `console.error`（与
dispose 对称）。价值：错误可见化 + 保护非标准 subscribe 实现。Codex 判定可行。

### Fix 4（P3）实例池按容器隔离（WeakMap）

`registry.ts`：`private pool = new WeakMap<HTMLElement, Map<string, ILayout>>()`；
`create` 从 `pool.get(container)?.get(id)` 取；`returnInstance(container, id,
instance)`（调用方：`container.ts:500/:718` + `scene-container.spec.ts:30`、
`capability-system.spec.ts:815` 两处 mock，同步更新）；`clearPool()` 实现为
`this.pool = new WeakMap()`。容器被 GC 时其池条目随之回收，泄漏归零（Codex Q3）。

### Fix 5（P3）switchLayout 并发语义：await 边界取消 + 单一 drain（v2 重设计）

Codex 对 v1 的【反对】成立：generation 只保护 finally，超时旧协程恢复执行后
仍会继续 `replaceChildren`/mount——互踩依旧。v2 语义：

1. **await 边界取消**：`switchLayout` 入口取 `const generation =
++this._switchGeneration`；每个 `await` 之后插入
   `if (generation !== this._switchGeneration || this._disposed) return;`
   （与既有 `if (this._disposed) return` 同型，共 4 处：notifyWillChange、
   teardown、setup、finalize 前）。超时/新代启动后，旧协程在下一个边界
   静默退出，不再触碰共享 DOM；
2. **10s 安全计时器 = 判死 + 交棒**：到期时
   `if (generation === this._switchGeneration) { warn; this._switching =
false; this._switchGeneration += 1; }`——使挂起协程在其下一个 await
   边界自行作废（它醒来后 generation 已过期），同时释放 `_switching` 允许
   新切换重建（旧协程作废后容器可能是半拆状态，下一次 switchLayout 的
   `replaceChildren` 天然重建；现状同样如此，无回归）；
3. **容器级单一 pending 队列 + 原子 drain**（Codex Q4 规则）：`_pendingScene`
   与新 `_pendingSwitchId`（manual last-wins）都是容器级队列，**不归属代**；
   旧代 finally 一律不消费；仅「当前有效代」的 finally 调用
   `_drainPending(generation)`：
   ```ts
   private async _drainPending(generation: number): Promise<void> {
     if (generation !== this._switchGeneration || this._disposed) return;
     const scene = this._pendingScene; this._pendingScene = null;
     const switchId = this._pendingSwitchId; this._pendingSwitchId = null;
     try {
       if (scene) await this._doSetScene(scene);   // setScene 语义：自行解析布局
       if (switchId && !this._disposed && this._currentLayout?.id !== switchId) {
         await this.switchLayout(switchId, { reason: 'manual', animate: true,
           savePreference: true });
       }
     } catch (err) { console.error('[SceneContainer] pending drain failed:', err); }
   }
   ```
   优先级：**pendingScene 先**（setScene 内部自行解析布局，可能已含切换），
   pendingSwitchId 后且目标==当前布局时跳过；drain 期间新到达的 pending 由
   内层 switchLayout 的 finally 再次 drain，天然续链，无永久搁置、无重复消费
   （原子取出后清空）；
4. 并发手动切换入口：`if (this._switching) { if (reason === 'manual')
this._pendingSwitchId = layoutId; return; }`；观察器自动切换不排队
   （重解析后下次 resize 收敛）。

### Fix 6（P3）demo-profile 演示网格过期恢复（v2 重设计）

**撤回 v1 的形态词表统一**（Codex Q5：`display:none` 不折叠显式轨道，
`'0px 8px 1fr'` 会留 8px 空隙）。改为**成员检测 + 漂移跳过**：

1. 演示写入保持原样（hidden=`'0px 0px 1fr'`、collapsed=`'48px 0px 1fr'`、
   minimal=`'minmax(260px, 22rem) 8px 1fr'`）；
2. 进入演示时照旧整模板快照 `savedGridColumns`（仅当当前模板含空格；
   lab flex 无快照）；
3. `restoreGridSidebar` 改为：
   - 当前模板 ∈ {三个演示形态字符串}（**未漂移**）→ 还原 `savedGridColumns`；
   - 否则（演示期间 `applyResponsiveColumns` 已重写，如落进单列移动形态或
     sidebar-toggle 写入的 `'0px 8px 1fr'`）→ **跳过模板恢复**，仅还原
     resizer display + `notifyResize()`，交给 applyResponsiveColumns 重算；
   - 成员检测同时规避了 v1 正则方案「捕获首列与隐藏态判定矛盾」的问题
     （Codex Q5 指出的 `'0px 8px 1fr'` 被捕获的缺陷不再存在）；
   - 误判边界（Codex 补充风险）：不同来源写入与演示形态**完全相同**的模板
     时会判为未漂移——sidebar-toggle 形态（`0px 8px 1fr`）与演示形态
     （`0px 0px 1fr`）串不同，实际不构成混淆，测试锚定；
4. `applyResponsiveColumns` 隐藏态判断迁移见 Fix 7a（demo 写 `0px…` 形态时
   同步写 dataset 标记，保持重算语义一致）。

### Fix 7（P3 三小项）

a. **隐藏态 dataset 单一事实源**：`sidebar-toggle` 与 `demo-profile` 写
`0px` 形态时同步维护 `container.dataset.sidebarHidden`；
`applyResponsiveColumns` 优先读 dataset，`startsWith('0px')` 保留为
dataset 缺失时的兼容回退（一次发布期内删除）；
b. `layout-switch.ts:68-69` 过期注释修正（切换后本实例随旧布局销毁重建）；
c. 四布局 `_updateConfig` 与 `registry.create` 注释固化「浅合并 + 单页单场景
假设；preservedCanvas 依赖容器每次显式传键（含 null）」。不改行为。

## 2. 明确不做

- 偏好 per-scene、布局切换「自动」档 UI、手动切换约束拦截（同 v1）；
- demo 演示形态的模板词表统一（v1 方案被 Codex 网格行为分析否决）；
- 空 inline 读数面板的自动隐藏（lab 手动布局的可接受现状，文档注明）；
- 移动端 layout-switch 按钮（维持现状）。

## 3. 测试计划

| #   | 测试                | 位置                              | 断言要点                                                                                                                                                                                   |
| --- | ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | 策略 1 约束检查     | selector/default-strategies spec  | 偏好=srgb @375px → null 落入自动；@1280px → 偏好；偏好=mobile-stack @1280 → 落空                                                                                                           |
| T2  | forcedLayout 策略 0 | 同上                              | forced 存在 → 无视偏好返回；未注册 → 落入后续策略                                                                                                                                          |
| T3  | 观察器重解析        | container-resize-observer spec    | **debounce 窗口内偏好变化 → 到期按最新上下文解析**（Codex 补充）；偏好满足视口 → 不切换；违反 → 切换                                                                                       |
| T4  | forceLayout 端到端  | scene-container.spec              | 存储偏好 + forceLayout → 创建 force 布局；force 布局跨 resize 保持                                                                                                                         |
| T5  | lab 读数声明化      | lab/契约 spec                     | lab mount 后 `.readout-panel` 唯一存在、`[data-lab-data-slot]` 存在；场景级：projectile 数据面板与读数更新正常、浮窗操作（hideLabGraphFloat/placeLabDataFloat）不回归（Codex 补充）        |
| T6  | 池按容器隔离        | registry spec                     | WeakMap：容器 A 归还后 B create 不复用；A 内复用正常；**clearPool 后全部不复用**（Codex 补充）                                                                                             |
| T7  | 订阅回调隔离        | capability-system.spec            | 某 capability update 抛错 → console.error、其他 capability 仍更新                                                                                                                          |
| T8  | 并发切换 generation | scene-container.spec              | 手动切换排队且完成后执行；**模拟超时旧协程在新代期间恢复 → 在 await 边界作废、不触碰 DOM**（Codex 补充）；pendingScene 与 pendingSwitchId 同时存在 → 串行 drain 且优先级正确（Codex 补充） |
| T9  | demo 网格恢复       | demo-profile spec                 | 未漂移 → 还原快照；**演示期间 resize 漂移（含 sidebar-toggle 写入形态）→ 跳过模板恢复、resizer 恢复、requestLayoutResize 调用**；三种演示形态各自的恢复                                    |
| T10 | dataset 同步        | split-helpers/sidebar-toggle spec | 隐藏/展开/移动-桌面形态切换时 dataset.sidebarHidden 与模板一致（Codex 补充）                                                                                                               |

e2e 不新增；视觉基线预期零改动（projectile-components 的 lab 视图与现状
位序一致；空读数面板仅出现在无读数数据的 lab 手动组合，若矩阵截图命中按
Linux 容器流程重生成）。

## 4. 验证与交付

```bash
pnpm verify:scene ticker-tape projectile-components mechanical-energy 2>/dev/null || \
  (pnpm verify:scene ticker-tape && pnpm verify:scene projectile-components && pnpm verify:scene mechanical-energy)
pnpm quality:core
```

（lab-stage 无独立场景消费方之外的验证路径；verify:scene 按场景逐个跑。）
体积影响：逻辑微改，无新依赖；布局 chunk 字节级波动。

实施顺序：Fix 1 → Fix 2 → Fix 4 → Fix 5 → Fix 3 → Fix 6 → Fix 7 → 测试补全。
Fix 1/4/5 触碰 container/registry/observer，合并为一个提交序列；每步可独立回滚。

## 5. Codex 交叉审计结论记录（2026-09-25）

第一轮（发现核实）：见 0 节依据列。第二轮（方案本体）逐项裁决：
Fix 1【修改→已吸收：debounce 触发时重解析、两处偏好门同删】、Fix 2【修改→
已吸收：删除依赖旧位序的重排块、撤回视觉零变化表述、补充场景级验证】、
Fix 3【可行】、Fix 4【修改→已吸收：WeakMap + 整体替换清池】、Fix 5【反对→
v2 重设计：await 边界取消 + 计时器判死交棒 + 容器级单一队列原子 drain】、
Fix 6【修改→已吸收：撤回词表统一，改成员检测+漂移跳过】、Fix 7【可行】。
待决问题 Q1-Q6 全部回答并落入设计；补充测试缺口 T3/T5/T6/T8/T10。

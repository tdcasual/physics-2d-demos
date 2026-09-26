# 数据处理工作区数据完整性修复：参数失效、填尺失效、契约加固（v2）

> 状态：**已实施（2026-09-25）**。2026-09-25 数据处理/图像分析审计的修复方案。
> v1 经 Grok CLI（grok build，plan 只读模式）交叉审计，总裁决**【修改后批准】**，
> v2 已吸收其全部修改意见：
> Fix 1 去掉 `opticsKey` 指纹（改 `checkPositionBaseline` 即改判分，且文案错位）、
> 补 wrapper `invalidateAll` 转发细节；Fix 4 从平台契约 `isReady` 改为 capability 私有
> `readSpec()`（罩住全部 `getSpec` 调用点）；Fix 5 增加独立 `visualsActive` 开关
> （fit 门不得读 `workspaceChromeOpen`）；Fix 7 WeakSet 只能在校验全部通过后 `add`；
> Fix 8 用 `toPrecision` 原文保留有效数字尾零。
>
> 实施结果：全量单测 286 文件 / 7376 通过（新增 T1–T8 共 17 个用例）、
> `verify:scene double-slit` 与 `verify:scene ticker-tape` 各 7 步全过、
> `quality:core` exit 0（结构/脚手架/布局/循环依赖/audit/lint/format/类型/覆盖率/构建/预算）；
> 无新 runtime 依赖；bundle 预算无回归。实施中的两处工程修正：
> `opticsChangeReason` 落在独立小模块 `optics-params.ts`（静态引入不把 data-task
> 拉进入口 chunk）、`formatSigFigs` 的指数检测用 `includes`（判分文件 ESLint
> 禁止正则字面量）。
>
> 审计范围：double-slit 与 ticker-tape 两个 data-workspace 场景、platform 判分引擎、
> capability 运行时与通用面板。只针对审计发现的数据完整性缺口与契约弱点，
> 不改任何判分语义与门控行为。

## 0. 已确认的产品决策

| 决策                  | 结论                                                                                                     | 依据                                                                                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像分析入口门控      | **维持现状**：仅按场景 eligibility 门控，不要求 `chartStepReady`                                         | 产品已核实（2026-09-25）。AGENTS.md 的「chartStepReady 之前 disabled」是 ddee68f 时期过期描述，本次**改文档**不改行为；描点/拟合资格继续由场景 plotGate（`chartStepReady`）单独门控                                                                                                                                        |
| 失效范围（光学参数）  | λ / d / L / 光源模式 / 滤光片 / `micrometerOffset` 变更即失效全部已校对数据；**不含** `stripeOffset`     | 前者改变条纹间距、判分 knowns 或读数零位；Grok 已核实测微仪 knob/滚轮/键盘只写仪器 `viewState.currentReading`（`instruments/micrometer-eyepiece` interactions.ts:60-63/158-161/196-199），`setZero` 仅仪器单测调用，正常测量不写 `sim.params.micrometerOffset`                                                             |
| `stripeOffset` 不失效 | 十字准星位移是测量交互本身（准星不动模式下拖它移条纹，x₁/x₂ 之间必然变化）                               | `page.ts:132-134` 直通 `setParams`；进失效集会让正常测量无法完成                                                                                                                                                                                                                                                           |
| `fillFromRuler` 语义  | 按尺填数后**无条件失效**工作区会话                                                                       | 与换纸带/换噪声/拖零点/reset 的既有失效路径对齐（`ticker-tape/scene.entry.ts:226` 同一条 `hostRef.invalidateAll`）；空会话上失效是无害 no-op                                                                                                                                                                               |
| 会话保持 vs 视觉激活  | 拆成两个开关：`workspaceChromeOpen`（会话/自动重进语义，不动）+ 场景内新增 `visualsActive`（视觉副作用） | 演示模式中途退出（`exitWorkspace(false)`）保留会话以便 `setMode → notify → update()` 自动重进（链路已验证：`capability-context.ts:61-83` + `scene-entry-helpers.ts:158-161`）；fit 门（`scene.entry.ts:437/:541`）必须改读 `visualsActive`，否则演示中 adapter 的 `resize()`（`scene-adapter.ts:619`）会把 `--dw-h` 写回去 |
| 平台契约              | **不扩展** `DataWorkspaceHost`；capability 内私有 `readSpec()` 兜住 throw                                | v1 的 `isReady` 契约被审计否决：capability 有 4 处 `getSpec` 调用点（:186/:259/:321/:366），契约只救一处；私有 `readSpec()`（内部 try/catch 返回 null）一处兜住全部，契约面零增长                                                                                                                                          |

## 1. 修复项

### Fix 1（P1）double-slit：光学参数变更失效工作区会话

**现状**：`scene.entry.ts` `setParams`（:799-816）只对 `activeInstrument` 变更调
`dataWorkspace.syncInstrument`；λ/d/L/lightMode/filterColor 在第 6 步（及步骤 1–5 的同名
滑块）依然可改，已校对数据全部保持 ✓。后果：λ 判分用「当前」d/L 配「历史」Δx
（`wavelength.ts` `checkWavelengthNm` 接收当前参数的 `expected.dMm/L_m`），
旧数据 + 新 d 能校对出物理上无意义的波长；不同参数设置下测的行可混入同一平均
（快照无参数指纹，baseline 只比仪器/精度/策略）。

**设计**：

1. `data-task.ts`：`DoubleSlitDataWorkspaceHost = DataWorkspaceHost & { invalidateAll(reason: string): void }`，
   实现委托平台 `invalidateAllTrials(session, spec, reason)`（清 `lockedInstrumentId`、
   全字段 stale、`completed=false`；行字段 feedback 用传入 reason，summary 字段为
   `markFieldStale` 的通用文案「上游数据已改，请重新校对」——与换仪器路径一致）。
2. 新增纯函数 `opticsChangeReason(prev: DoubleSlitParams, next: DoubleSlitParams): string | null`：
   对 `lambda`、`slitDistance`、`L`（`?? DEFAULT_L` 归一）、`lightMode`、`filterColor`、
   `micrometerOffset` 六键逐键 diff，任一变化返回固定失效文案，否则 null。
3. `scene.entry.ts`：
   - 外层 `dataWorkspace` 对象补 `invalidateAll(reason)`（类型是 `DataWorkspaceHost`，
     须扩成 `& { invalidateAll }`），转发 `innerWorkspace?.invalidateAll(reason)`——
     **可选调用**，内层未加载时静默跳过（`double-slit-instrument-lifecycle` 的
     `setParams({ step: 6, lightMode: 'mono' })` 在加载完成前发生，不可抛）；
   - `setParams` 沿用 ticker-tape 的 before/after 模式：
     `const before = sim.getState().params; const result = sim.setParams(params);`
     `const reason = opticsChangeReason(before, result);` 非 null 时在 `base.notify()`
     （:814）**之前**调 `dataWorkspace.invalidateAll(reason)`，保证同一次 notify 带出
     stale 标记。**不按 step===6 门控**：步骤 1–5 也能改 λ/d/L，而会话数据跨步骤存活。
4. 幂等性天然成立：URL 管线 `applyAll` 启动批量 `setParams`、布局重建重跑管线时
   同值 diff 为 null，不会误失效（lifecycle 测试同理：与初值同光的 `setParams` 不触发）。

**明确不做**：v1 的 `opticsKey` 快照指纹——给 `checkPositionBaseline` 加参数比对就是
改判分，且 `BASELINE_MISMATCH` 文案是「同一台仪器」，对参数失配语义错位。
失效路径已覆盖正常流（旧行在参数变更瞬间变 stale，不再参与 `validPositionSnapshots`）。

**不失效**：`stripeOffset`（测量交互）、`crosshairAngle`、`viewMode`（不改变条纹间距与
零位，冻结读数自洽）、`step`（离开/返回第 6 步数据仍有效）。

### Fix 2（P1）ticker-tape：`fillFromRuler` 失效工作区会话

**现状**：`scene.entry.ts` `fillFromRuler`（:287-291）在 sim 里覆写 `measuredXCm` 并清空
`deltaXCm/vMs`（`scene.sim.ts:498-503`），但不调 `invalidateAll`。校对后再点它：
v 描点 `copySeries(state.vMs)` 全 null 画出 0 个点、x 描点用尺值而 aFit 判分用旧校对值，
图像与判分两套真值分叉且 UI 无提示（已描点序列仅标 dirty，`scene.view.ts:543-547`）。

**设计**：`fillFromRuler` 中 `sim.fillFromRuler()` 之后追加
`hostRef?.invalidateAll('已按尺重新填数，请重新校对')`（可选调用，空会话 no-op）。

### Fix 3（P2）AGENTS.md：同步图像分析入口门控表述

`AGENTS.md`「数据处理工作区与图像分析环节」节，将

> `chartStepReady`（行字段 + 非选填数据步 summary 全通过）之前 disabled

改为

> 按场景 eligibility 门控（如暂停要求、任务模块加载完成）；进入环节**不需要**数据处理
> 完成——描点/拟合资格由场景 plotGate（`chartStepReady`）在图像区内单独门控
> （工具条描点按钮 disabled + 画布 `data-plot-hint` 提示）

其余句子不动。行为零改动（`tests/e2e/ticker-tape-data-workspace.spec.ts:403-407`
已固化现行行为）。

### Fix 4（P2）capability 私有 `readSpec()` 兜住外层 `getSpec()` throw

**现状**：ticker-tape（`scene.entry.ts:141-146`）与 double-slit（`scene.entry.ts:618-621`）
的外层 `getSpec()` 在 data-task 动态加载完成前 throw。capability 有 **4 处**调用点：
`syncChartButton`（:186）、`adoptGraphIfNeeded`（:259）、`stageSplitKey`（:321）、
`stageHalfActive`（:366，resize 监听 :658 每次窗口变化都会走到）。throw 依赖两层静默
catch（scene notify 空 catch、adapter `console.error`）不炸页面，代价是该次 update 的
`syncStageSplitter()` 被跳过。v1 的 `isReady` 契约只救一处，否决。

**设计**：capability 内私有 helper：

```ts
function readSpec(): DataWorkspaceSpec | null {
  if (!host) return null;
  try {
    return host.getSpec();
  } catch {
    return null; // 场景数据任务模块仍在动态加载
  }
}
```

四处调用点全部改走 `readSpec()`：null 时按「场景无图任务」分支——`syncChartButton`
保持按钮隐藏、`adoptGraphIfNeeded` 跳过收养、`stageSplitKey` 回退通用键
`dw-stage-split-`（无 id 后缀，加载完成后下一次 update 自然换正确键）、
`stageHalfActive` 返回 false。加载完成后的下一次 notify（data-task `.then` 里的
`base.notify()`）自愈，无需额外信号。panel 创建路径不变（已过 eligibility ⇒ 已加载）。

### Fix 5（P3）演示模式中途退出：拆分视觉激活

**现状**：`unsubMode` 演示路径走 `exitWorkspace(false)`（保留 `session.active` 以便
演示结束后自动重进——该语义正确保留），但 double-slit `setActive` 里混着的视觉副作用
（canvas opacity 0 / pointerEvents none、instrumentWrap 撑满、隐藏数字提示、fit 调度）
在整个演示期间滞留。且 `syncInstrumentStageFit` 以 `workspaceChromeOpen` 为门
（:541，:437 同）：若演示路径误改该标志，`getSession`（:626-631）会把 active 报成
false 破坏自动重进；若不改，演示中 adapter 的 `resize()` 又会把 `--dw-h` 写回。

**设计**：double-slit scene.entry 新增闭包标志 `visualsActive`（初值 false）：

- `setActiveVisual(active: boolean)`：置 `visualsActive`，执行/还原全部视觉副作用
  （canvas opacity/pointerEvents、instrumentWrap 几何、`view.setHideNumericHints`、
  仪器 resize、`scheduleInstrumentStageFit`；`active=false` 时先 `section.style.removeProperty('--dw-h')`）；
- `setActive` 保留会话语义（`workspaceChromeOpen`、`ensureDataWorkspace`、内层
  `setActive`），并调 `setActiveVisual(active)`——外部调用方零改动；
- `:437` 与 `:541` 的 fit 门从 `workspaceChromeOpen` 改读 `visualsActive`——演示中
  adapter `setMode` 触发的 `resize()`（`scene-adapter.ts:619`）不再写回 `--dw-h`；
- capability `exitWorkspace` 在 `clearActive === false` 分支追加
  `host?.setActiveVisual?.(false)`（可选方法，wrapper 实现并暴露在扩展类型上）；
  演示结束回 normal 时既有链路 `setMode → notify → update() → enterWorkspace →
setActive(true) → setActiveVisual(true)` 自动恢复，capability 其余不动。
- ticker-tape 的 setActive 无视觉副作用，不实现该方法。

### Fix 6（P3）面板高频 notify 的写守卫

**现状**：double-slit 拖测微仪旋钮（`instrument-set-reading` → `base.notify()`，:185-192）
与每帧 `render`（:817-820）≈60Hz 触发 `panel.update()`，全量重写 knowns 芯片、状态节点、
result 容器（`panel.ts:1213-1216` 每次都 `replaceChildren`）。

**设计**（局部写守卫，不改结构）：

- `setFieldStatus`：先算目标 `className`/`textContent`/`dataset.reason`/`title`/`aria-label`，
  与现值全等则 return；
- `setFieldEnabled`：`disabled` 与 `aria-disabled` 均与目标一致时 return；
- `renderKnownsInto`：按容器（`knownsEl`/`contextEl` 各自独立）缓存 chips 的
  `key:value` 签名，签名不变跳过 `replaceChildren`；
- `renderResult`：文本与 hidden 态均不变时跳过 `replaceChildren`（审计补的漏项）。

### Fix 7（P3）`assertSpecGraph` 结果按 spec 身份记忆化

**现状**：`invalidateDownstream` 每次提交都跑 `assertSpecGraph` + 全图
`collectDownstream`（O(fields²)）；spec 是模块级常量，重复校验纯浪费。

**设计**：platform `assertSpecGraph` 加 `WeakSet<object>` 记忆化，**`WeakSet.add`
只能放在全部检查通过之后（函数末尾）**——失败实例不入集，重复断言持续 throw
（测试锚 T8 固化该行为）。已验证：src 与 tests 均无对 spec 字段的原地赋值，
测试全部用展开的新对象字面量，记忆化不会掩盖任何既有断言。

### Fix 8（P3）aFit 结果文案位数与选填逐差法适配

**现状**：spec `result.digits: 2` → `toFixed(2)`，与判分的有效位数口径（2–4 位、默认 3）
不一致；模板写死「与逐差法相互印证」，aDiff 选填未填时该断言不成立。

**设计**：ticker-tape data-task host 实现 `renderResult(session)`：

- aFit 值用 **`value.toPrecision(sig)` 原文字符串**（保留尾零：1.20 的 3 位有效数字
  必须显示 `1.20` 而非 `1.2`——与 `derivedFormatMessage` 的「恰好 N 位」口径一致；
  注意 `toPrecision` 对极小/极大值可能产出指数记法，加注释说明 aFit 量级下不会触发，
  出现 `e` 时回退 `toFixed` 兜底）；
- aDiff 仅在 `fieldIsOk` 时追加 `（逐差法 a = … m/s²）`；未填不提印证；
- aFit 未完成（`session.completed`/`fieldIsOk` 不过）返回 null，继续走
  `formatResultText` 的完成态门槛（`platform/data-workspace.ts:1392-1393`）。

`spec.result.template` 保留作契约锚与回退（panel `custom ?? formatResultText` 不动）。

## 2. 明确不做

- **不**改图像分析入口门控行为（产品已核实现行正确）；
- **不**改任何判分容差/位数/格式闸语义、**不**给 `checkPositionBaseline` 加参数指纹
  （v1 的 opticsKey 已否决，理由见 Fix 1）；
- **不**扩展 `DataWorkspaceHost` 契约（v1 的 `isReady` 已否决，理由见 Fix 4）；
- **不**删除场景公开 API `setMeasuredX/setDeltaX/setV`（当前无生产调用方，属既有面）；
- **不**动 `--dw-h` fit 链路本身（已验证 `requestStageRepaint → _scheduleResize →
scene.resize → scheduleInstrumentStageFit` 在 zoom settle 时重算；Fix 5 只换门的读取标志）；
- **不**做会话持久化到 storage（独立课题）；
- **不**加失效 toast（打开着的工作区由同一次 notify 带出「↻ 需重校」标记，原因在
  title；未打开时打开即见同一标记——审计确认一套文案足够）。

## 3. 测试计划

| #   | 测试                           | 位置                                 | 断言要点                                                                                                                                                                                                                                                         |
| --- | ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `opticsChangeReason` 六键 diff | `double-slit-data-workspace.spec.ts` | 每键变化返回非 null；`stripeOffset/crosshairAngle/viewMode/step` 变化返回 null；同值 diff 为 null（幂等）                                                                                                                                                        |
| T1b | **接线测试**（审计补）         | 同上或 scene 级                      | `setParams({ stripeOffset })` 与模拟 `instrument-set-reading` 后 ✓ 仍在；`setParams({ lambda })` 后行字段 stale；`setParams({ step: 3 })` 改 λ 后行字段 stale                                                                                                    |
| T2  | 光学参数失效语义               | 同上                                 | x₁/x₂/D/Δx 通过 → `invalidateAll` 后行字段 stale 且 feedback 为光学文案、`lockedInstrumentId` 清空、`allTrialsComplete` false；**summary 字段 feedback 是通用「上游数据已改」文案**（平台 `markFieldStale` 行为，不期望等于光学 reason）；重新校对可恢复         |
| T3  | capability `readSpec()`        | `data-workspace-capability.spec.ts`  | `getSpec` throw 的 host：不抛、图像分析按钮不出现、进入/退出工作区不抛、resize 不抛、`data-stage-half` 属性仍随 half-split 更新（splitter 是闭包，spy 不到，断言行为而非内部）；同 spec 正常 host 行为不变。需扩展 `createCtx`（:83-87）支持 `on` 登记与模式切换 |
| T4  | 演示路径视觉挂起               | 同上                                 | 工作区打开 → modechange(presentation)：wrapper `setActiveVisual(false)` 调用、`setActive` 未调、`session.active` 仍 true；回 normal 后再 `update()` 自动重进                                                                                                     |
| T5  | double-slit 视觉还原（审计补） | scene 级（happy-dom）                | `setActiveVisual(false)` 后 canvas opacity 恢复、`--dw-h` 移除、`workspaceChromeOpen`/`session.active` 仍 true；紧接着 `resize()` 不得写回 `--dw-h`（fit 门已换 `visualsActive`）                                                                                |
| T6  | fillFromRuler 失效             | ticker-tape scene 级 spec            | x 全列通过 → `scene.fillFromRuler()` → 全列 stale、`chartStepReady` false；空会话调用不抛                                                                                                                                                                        |
| T7  | renderResult 有效位数          | `ticker-tape-data-workspace.spec.ts` | aFit=0.823/sig=3 → 「0.823」；**1.20 → 「1.20」（尾零保留）**；aDiff 未填不出现印证文案，填了且通过则出现；aFit 未完成 → renderResult 返回 null                                                                                                                  |
| T8  | assertSpecGraph 记忆化锚       | `data-workspace.spec.ts`             | 同一**失败**实例连续断言两次都 throw（add-after-success 行为锚）；同一通过实例重复断言不重复执行（可通过 spy 或行为间接锚定）                                                                                                                                    |

e2e 不新增（现有 22 个 data-workspace e2e 覆盖主流程；T1b/T5 的 scene 级断言在单测层
更稳）。视觉基线预期零改动（无 CSS/布局/常显文案变化；Fix 8 只改完成态文案——
若基线命中按 `scripts/visual-linux-container.sh update` 走 Linux 容器重生成）。

## 4. 验证与交付

```bash
pnpm verify:scene double-slit
pnpm verify:scene ticker-tape
pnpm quality:core        # 提交前门禁（含 bundle 预算）
```

预期体积影响：`opticsChangeReason` + wrapper 转发 < 1 kB；`readSpec()` 数行；
其余为守卫与文案。double-slit 入口预算既有缺口（188.35/180 kB，main 既有问题，
见 2026-09-22 方案文档记录）不因本改动恶化，若 verify:scene 预算门槛拦截则按仓库
先例单独提交预算上调说明。

实施顺序：Fix 4（capability readSpec）→ Fix 1/2（场景失效）→ Fix 5 → Fix 3（文档）→
Fix 6/7/8（收尾）。每步独立可回滚；Fix 1 与 Fix 5 都触碰 double-slit scene.entry，
合并为一个提交序列。

## 5. 交叉审计结论记录（Grok CLI，2026-09-25）

逐项裁决：Fix 1【修改→已吸收：去 opticsKey、补 wrapper 转发与可选调用】、
Fix 2【同意】、Fix 3【同意】、Fix 4【修改→已吸收：isReady 改私有 readSpec()，
罩住 :186/:259/:321/:366 四处】、Fix 5【修改→已吸收：新增 visualsActive，
fit 门改读它，防 adapter resize 写回 --dw-h】、Fix 6【同意＋补 renderResult 守卫】、
Fix 7【修改→已吸收：WeakSet 只在校验通过后 add】、Fix 8【修改→已吸收：
toPrecision 原文保尾零】。

待决问题结论：① `micrometerOffset` 保留在失效集（knob 只写仪器 viewState，
interactions.ts:60-63/158-161/196-199）；② readSpec() 优于 isReady 契约；
③ 演示后自动重进成立（capability-context.ts:61-83 + setMode notify）；
④ 记忆化安全（无原地改 spec）；⑤ 一套失效文案足够；⑥ 契约测试不受影响
（lifecycle 的 setParams 与初值同光，diff 为 null）。

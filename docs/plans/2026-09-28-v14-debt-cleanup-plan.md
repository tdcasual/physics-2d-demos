# v14 技术债清偿方案（2026-09-29，v14.1 修订版）

> 状态：✅ 已执行完毕（2026-09-29，Wave A/C/B 三方验收通过，终验 13/13 PASS）。
> 前作：`docs/plans/2026-09-28-v13-debt-cleanup-plan.md`（已执行完毕）。
> 范围：v13 台账登记的三项在管债务——B22（autoRun URL 缺口）、B17（GBCR 基线）、B21（ganshe imperative 写回缺口）。
> 本版已并入交叉审计（Grok 5 阻塞 + Claude 5 阻塞，结论收敛）的全部修订；双方均声明「修订集落地后可开工，无需重开审计」。
> 明确不做：B11（101 场景视觉基线，独立战役）、B20（容差收紧，逐案论证）、B1/B9（季度节奏）、B13 的 14 个显式 `shouldAutoPlay` 钩子（**保留**，其中 internal-energy/mechanical-energy/variable-work 的钩子语义与静态值不同——缺省不播）。
> 实施：Grok；验收：Kimi + Claude + Grok 三方（沿用 v13 协议）。

## 0. 现状事实（Kimi + 两审计方核实）

- `_shouldAutoPlay()`（`src/app/scene-adapter.ts:611-617`）：钩子优先，否则 `Boolean(options.autoPlay)`。adapter 持有 `this.options.meta` 与 `_urlSnapshot`（Readonly，:79/:123 冻结）；`resolveUrlSyncKeys` 已在 :46 导入。
- **恢复时序（已逐环节验证为真）**：localStorage 镜像灌入（bootstrapper:92，adapter 构造前）→ snapshot 捕获（scene-adapter.ts:236-241，createScene 前）→ URL apply（createControls 内）→ `_shouldAutoPlay`（:417）。**布局 remount 不重判**（:206-209 早退 \_reattachLiveScene）。
- `resolveUrlSyncKeys(meta)` 返回 **`Set<string>`**（url-sync.ts:26-32）——用 `.has()`。
- 69 个 B22 场景的 `getParams()` 全部直通 sim（`'autoRun' in live` 恒真）⇒ **live 不是恢复值信号源，`_urlSnapshot` 才是**。
- **翻转集合**（若误读 live）：4 个 `defaultParams.autoRun: 0` + `autoPlay: true`（friction-critical / connected-bodies-incline / lightbulb-iv-curve / molecular-potential）会停播；`ampere-balance`（autoPlay:false + 默认 autoRun:true）会反播。平台修复必须只在**存在恢复值**时接管。
- `autoRun` 仅出现在 `urlSyncKeys` 而不在 `defaultParams` 的场景有 3 个（auto-water-feeder / parallel-glass-refraction / semicylinder-tir）——口径必须用 `resolveUrlSyncKeys` 全集，不能只取 `urlSyncKeys`。
- 场景侧 autoRun 归一化全部健全（0 例裸 `Boolean(input.autoRun)`）；`?autoRun=0` 字符串形态会被 sanitize。
- ganshe 拖拽链：`scene.view.ts:582-625` → `scene.entry.ts:270-281` `setOnObserverMove`（零写回）；`createScene` 丢弃了注入的 `sceneWriter`（page.ts:36-38）；先例：binding-energy/harmonic-wave/single-slit page.ts:39。
- ganshe/spring-oscillator 的 `controls.ts` 里**零** `key:` 字面量（键在 page.ts 的 spec 数组里）。
- `sizeGraphCanvasToHost` 同构 `contentBoxSize` 实现全仓 9 份 + 内联 2 处（见 §2）。

## 1. Wave A：B22 平台级修复（snapshot 闸门版）

**实现**（`scene-adapter.ts` `_shouldAutoPlay` fallback）：

```ts
private _shouldAutoPlay(): boolean {
  const live = (this.scene?.getParams?.() ?? {}) as Record<string, unknown>;
  if (this.options.shouldAutoPlay) {
    return this.options.shouldAutoPlay(live, this._urlSnapshot);
  }
  // B22：只在存在恢复值（URL query 或 localStorage 镜像）时接管；
  // 缺省 snapshot 时行为与静态 autoPlay 逐场景一致。
  if (
    Boolean(this.options.autoPlay) &&
    resolveUrlSyncKeys(this.options.meta).has('autoRun') &&
    Object.prototype.hasOwnProperty.call(this._urlSnapshot, 'autoRun')
  ) {
    return coerceAutoRun(this._urlSnapshot['autoRun']);
  }
  return Boolean(this.options.autoPlay);
}
```

- `coerceAutoRun` 显式覆盖 `0 / '0' / false / 'false' / NaN` 判假，其余判真（不可用 `!== false && !== 0 && !== '0'` 弱判据——`?autoRun=abc` 会经 parseInt 得 NaN 被误判为播）。
- **语义不变式**：默认访问（无 query、无镜像）逐场景行为不变（5 个翻转场景全部保住）；`autoPlay: false` 场景永远不被 URL 强制开播（ampere-balance 闸门）。

**测试**：

- adapter 级单测三态（自建 meta：defaultParams 含 autoRun + urlSyncKeys 含 autoRun；不得只 mock getParams——`scene-bootstrapper.spec.ts:326-364` 走钩子路径盖不到 fallback，`scene-adapter-edge-cases.spec.ts:40` 的 meta stub 无 autoRun 键）：
  1. snapshot 含 `autoRun=0` ⇒ 不 `startAll`；
  2. snapshot 不含 autoRun + live `autoRun: false` ⇒ **仍** `startAll`（钉住 4 个零默认场景）；
  3. `autoPlay: false` + live `autoRun: true` + snapshot 缺省 ⇒ 不 `startAll`（钉住 ampere-balance）。
- **契约改写**（`autorun-url-gap.spec.ts`）：删除「静态 autoPlay + autoRun 场景数归零」断言（平台级修复不改 page/meta 文本，旧谓词下会永远红）。改为双层守卫：① 上述行为型单测；② 保留既有回归断言（顶层 `readSceneParams` = 0；14 个 I3 钩子存在）。
- **AGENTS.md** autoPlay 段改写（Claude 提供的定稿句）：「autoPlay：page.ts 不要在模块顶层 `readSceneParams`。`shouldAutoPlay(params, urlParams)` 在 URL restore 之后、`startAll` 之前求值。平台 fallback：`resolveUrlSyncKeys(meta)` 含 `autoRun` 且 snapshot 含恢复值时，以恢复值决定播放；snapshot 缺省时仍用静态 `autoPlay`。B13 的 14 个显式钩子保留且优先级最高。」
- **台账**：B22 行守卫改为双层描述，注明「69 清单退役原因：平台 fallback 已覆盖」。

**手工验收**（5 例）：earth-gravity / bellows / cyclotron 的 `?autoRun=0` 停播（停在已绘首帧、运输键「播放」）；friction-critical 无 query 首屏运输键仍是「播放中」（与现状一致）；ampere-balance 无 query 不 startAll。

## 2. Wave B：B17 审阅销号 + B23 同构位点登记

**(c) 前提已双向验证**：5 场景无 panzoom 可及路径（`createStagePanzoom` 唯一调用点被 `layoutConfig.dataWorkspace` 门控，全仓仅 double-slit/ticker-tape 打开；panzoom transform 只写 `.stage-viewport` 且只搬 animation 槽）。

**逐位点销号理由**（实施时写进台账/注释，不得五站一笔勾掉）：

| 位点                        | 分类                                                                             | 理由                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| doppler-effect view:338/372 | 指针**绝对原点**（禁用 delta-only 的 localPointerDelta；要改只能 offset 系原点） | 当前无 transform 祖先；**销号句必须带「未做指针归一化前禁止 opt-in dataWorkspace」**                                 |
| xt-graph view:64            | (a) 布局盒                                                                       | `sizeCanvasToFill` 已按 offset 设背衬，GBCR 仅亚像素差                                                               |
| block-board view:71/99      | (a) graph 槽 contentBoxSize                                                      | graph 槽不进 panzoom wrap；**但演示模式 graph 过继会搬进 animation 槽**（graph-adoption.ts:40-48），销号句带同样禁句 |
| variable-work view:114/118  | 同上（内联形态）                                                                 | 同上                                                                                                                 |
| accel-force view:88/116     | 同上                                                                             | 同上                                                                                                                 |

**B23（新台账条目）**：同构 `contentBoxSize` 其余 8 处（emf-internal-resistance / impulse-momentum / mechanical-energy / oscilloscope / potential-energy-graphs / rod-model / single-loop / internal-energy:98/863 内联）登记在管——同属 (a) 类、当前无 panzoom 路径、与 B17 同批审阅。若将来清偿，注意 `readElementLayoutSize` 返回**含 padding** 的 border box，需自行减 padding；且 happy-dom 下 offset 恒 0 会回落 GBCR（现有单测测不出差异，改了等于没改——这是不机械替换的理由）。

**关闭口径**：B17 关闭记录写「panzoom 路径已审阅，冻结 9 位点销号」，**禁止写「GBCR 清零」**（ganshe view:115/584/602、xt-graph-renderer:48、accel-force/block-board sim 的屏幕盒重叠位点仍在，后者 GBCR 是正确工具）。

**门禁**：纯审阅零代码时 `verify:scene` × 5 即可；若有 (a)/(b) 实修（doppler-effect/xt-graph 在 19 covered 内），需按平台更新像素基线（Linux 容器 / Darwin workflow）。

## 3. Wave C：B21 ganshe 写回收口

1. **接线**：`page.ts:36-38` 的 `createScene` 把注入的 `sceneWriter` 传入 `createGansheScene`（先例 binding-energy/harmonic-wave/single-slit page.ts:39）。
2. **写回**：`scene.entry.ts:270-281` 的 `setOnObserverMove` 回调中 `index === -1` 分支（拖拽**和**空白点击两条入口）写回 `observerX`（`sceneWriter` 自带 150ms debounce，pointermove 高频安全）。附加观察点（`index !== -1`）**不写 URL**（不在 urlSyncKeys，writer allowlist 也会滤掉）。
3. **路径级契约**：新断言——entry 的 `setOnObserverMove` 回调体内 `sceneWriter`/`writeOwnedSceneParams`/`writeParam` 与 `observerX` 同现。红绿对照用「删 entry 那一行 ⇒ 红」（**不是**删 page 全部 writeParam——那会混入 F3 已覆盖的滑块路径）。
4. **台账**：B21 移入已清记录；B12 备注改写为「imperative 取值键写回与非控件突变键（observerX 画布拖拽，无对应控件）写回分属两条谓词」。
5. **顺手（独立提交）**：删 `page.ts:265` 的 `refreshObservers` 死方法（全仓零调用方）。
6. **可选卫生项（明确不阻塞）**：ganshe view:584/602 拖拽链的坐标在动这条链时可改 offset 系原点；不改则在 B17 关闭记录里点名。

**门禁**：`pnpm verify:scene ganshe` + 路径级契约红绿对照 + ganshe 相关 e2e（ganshe 在 covered 且属 dynamicSceneIds，拖拽写回不该变首屏像素，跑一次 ganshe 视觉用例确认）。

## 4. 顺序、门禁与验收

- 顺序：**A → C → B**（A 定行为语义；C 有真实功能洞；B 可能只动台账）。共享文件只有 debt-ledger.md，串行提交。
- 每波 `CI=true pnpm quality:core` 绿（注意 `_shouldAutoPlay` 新分支无单测会拉低 branches 覆盖率阈值——机制性要求单测先行）。
- Wave A 追加全量 e2e（必要但**不充分**：e2e 运输键断言是相对断言，抓不到首屏态翻转——绝对态由 adapter 单测锁）。
- 三方验收协议同 v13 §7；验收一律基于提交态（工作树有并行改动时 git archive 洁净副本）。
- 终验：`artifacts/final-two-scenes-check-v13.mjs` 全过（回归网；double-slit/chase-meet 不在 B22 清单内，不走 fallback 新分支）。

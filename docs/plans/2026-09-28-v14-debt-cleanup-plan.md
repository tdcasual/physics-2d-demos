# v14 技术债清偿方案（2026-09-28）

> 前作：`docs/plans/2026-09-28-v13-debt-cleanup-plan.md`（已执行完毕）。
> 范围：v13 台账登记的三项在管债务——B22（69 场景 autoRun URL 缺口）、B17（GBCR 基线 5 场景）、B21（ganshe imperative 写回缺口）。
> 明确不做：B11（101 场景视觉基线，独立战役）、B20（容差收紧，跨平台光栅需逐案论证）、B1/B9（季度节奏）。
> 实施：Grok；验收：Kimi + Claude + Grok 三方（沿用 v13 协议）。

## 0. 现状事实（Kimi 已核实）

- `_shouldAutoPlay()`（`src/app/scene-adapter.ts:611-617`）：有 `options.shouldAutoPlay` 钩子用钩子，否则 `Boolean(options.autoPlay)` 静态值。adapter 已持有 `this.options.meta` 且在 :231 已调用 `resolveUrlSyncKeys(meta)`。
- `autoRun` 全仓统一 `boolean` 类型，sim 的 setParams 经 `asBoolean`  sanitize（earth-gravity scene.sim.ts:85 等）。
- B22 冻结清单（`tests/contract/autorun-url-gap.spec.ts`）：69 个「静态 autoPlay:true + autoRun ∈ urlSyncKeys」场景。
- B17 剩余 9 位点：doppler-effect view:338/372、xt-graph view:64、block-board view:71/99、variable-work view:114/118、accel-force view:88/116。
- B21：ganshe 的 urlSyncKeys（freq1/freq2/amp1/amp2/phaseDiff/observerX）滑块在 imperative `controls.ts`，F3 的正向契约谓词（schema 字段扫描）覆盖不到；observerX 的画布拖拽路径完全不写回。

## 1. Wave A：B22 平台级修复（autoRun 恢复值生效）

**设计**：在 `_shouldAutoPlay()` 的 fallback 分支加一层——

```ts
private _shouldAutoPlay(): boolean {
  const live = (this.scene?.getParams?.() ?? {}) as Record<string, unknown>;
  if (this.options.shouldAutoPlay) {
    return this.options.shouldAutoPlay(live, this._urlSnapshot);
  }
  // B22：autoRun ∈ 可同步键（defaultParams ∪ urlSyncKeys ∪ {preset}）
  // 且 live 参数含它 ⇒ URL/localStorage 恢复值决定播放，不再静态 autoPlay
  if (resolveUrlSyncKeys(this.options.meta).includes('autoRun') && 'autoRun' in live) {
    return live.autoRun !== false && live.autoRun !== 0 && live.autoRun !== '0';
  }
  return Boolean(this.options.autoPlay);
}
```

**语义论证**：默认访问（无 URL/localStorage）→ 恢复值 = defaultParams 的 autoRun（true）→ 播放，与现状一致；`?autoRun=0` → 暂停（修复目标）；localStorage 镜像 autoRun=false → 下次访问暂停——与 v13 I3 的 14 个已迁场景语义一致（AGENTS.md：URL query 覆盖 localStorage 镜像）。

**测试**：
- 单测：构造静态 autoPlay:true + autoRun 场景桩，URL restore autoRun=false ⇒ 不 startAll；autoRun 缺省 ⇒ 照播。
- 契约更新：`autorun-url-gap.spec.ts` 的 69 id 冻结清单应**清空**（迁移完成），断言改为「静态 autoPlay + autoRun ∈ syncKeys 的场景数为 0」；同时保留「顶层 readSceneParams = 0」断言。
- AGENTS.md autoPlay 段从「14 场景已迁 + 69 缺口」改为「平台级：autoRun ∈ 可同步键 ⇒ 恢复值决定播放」。

**风险**：某场景 autoRun 在 syncKeys 但产品语义是「永远自动播」——实施时抽查清单两端（如 earth-gravity / bellows）确认无语义冲突；若有，该场景应显式声明 `shouldAutoPlay: () => true` 豁免。

## 2. Wave B：B17 GBCR 基线清偿（5 场景 9 位点）

**先分类再动手**（实施期第一步）：每个位点判定属于——
- (a) 布局盒误用 → `readElementLayoutSize`
- (b) 指针坐标误用 → `localPointerDelta`（delta）或 offset 系原点
- (c) **不在 panzoom 可及路径上**（这 5 个场景均无 dataWorkspace/stagePanZoom）且语义正确 → 登记为「已审阅，不在风险路径」从清单移除

(c) 类必须逐个写一句理由（为什么没有 transform 祖先）。预期多数位点落 (c)——B17 的现实目标是**审阅销号**而非机械替换。若落 (a)/(b) 则修复。

**验收**：5 场景各过 `pnpm verify:scene`；清单归零后从台账 B17 移入已清记录（或保留「已审阅」口径）。

## 3. Wave C：B21 ganshe 写回收口

1. **observerX 画布拖拽写回**：ganshe 画布拖拽观察点后 `writeParam('observerX', ...)`（或 sceneWriter）。
2. **契约谓词扩展**：`scene-url-writer-contract.spec.ts` 的取值控件谓词扩展到 imperative `controls.ts`——扫描 `key: 'xxx'` 字面量 ∩ urlSyncKeys ⇒ page/controls 出现写回标记。谓词扩展后 ganshe 被覆盖，B21 关闭。
3. 台账 B21 移入已清记录。

## 4. 门禁与验收

- 每波：`CI=true pnpm quality:core` 绿
- Wave A 追加：`CI=true pnpm test:e2e` 全绿（autoPlay 行为变化影响面大）；抽 3 个 B22 清单场景（earth-gravity、bellows、cyclotron）手工验证 `?autoRun=0` 生效
- Wave B 追加：5 场景 verify:scene + e2e 绿
- Wave C 追加：ganshe verify:scene + e2e 绿 + 新契约红绿对照（撤销 ganshe 写回 ⇒ 契约红）
- 三方验收协议同 v13 §7
- 终验：double-slit + chase-meet 真实浏览器脚本（`artifacts/final-two-scenes-check-v13.mjs`）全过

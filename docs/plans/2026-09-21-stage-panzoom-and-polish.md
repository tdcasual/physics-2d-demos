# 工作区打磨与舞台 Pan/Zoom 架构能力方案

> 2026-09-21 · 基于两轮已完成工作（紧凑化 + 两步工作区，见 2026-09-20 两份计划）
> 执行者：grok（批次 C → 批次 D） · 验收：kimi 独立复跑

## 需求合理性分析

| #   | 需求                                            | 结论                    | 理由                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 表头从 0 开始                                   | ✅ 合理                 | 纸带教学惯例 O 点为计数点 0（x₀=0），sim 的 `trueXCm` 索引也是 0 基。当前转置表头 `String(trialIndex + 1)`（panel:683）与场景语义冲突。但 double-slit 的 trial 是「第 N 组测量」，1 基正确 → 必须做成 spec 声明，不能全局改 0 基            |
| 2   | 数据处理时纸带/刻度尺太扁平、上下留空大         | ✅ 合理，且与 #4 互补   | 舞台 canvas 被 flex 撑高，但场景内容顶部锚定 → 下方大面积死区；纸带天然宽扁，高度方向没有随舞台放大。修法是视图层内容垂直居中 + 高度感知缩放（view 已用 `responsiveScale`，问题在锚定与内容盒计算），不是改布局比例——布局比例已由转置表解决 |
| 3   | 未填数据前点「图像分析」要给提示                | ✅ 合理，当前已有但太弱 | 现在只是把 hint 行换成「请先完成数据处理」（panel:280），不明显。强化：锁定 tab 加 🔒 + aria-disabled 样式；点击时提示显示在 tab 附近（醒目样式），不只改 hint 行                                                                           |
| 4   | 数据处理时舞台可整体拖动/缩放，架构级，双缝同等 | ✅ 合理，是本轮最大项   | 与 stageLock 不矛盾：lock 锁的是**场景状态变更**（O 点/仪器位置），pan/zoom 是**纯视口变换**，不改任何 sim 状态。做成 data-workspace 能力的内建行为（默认开），所有 opt-in 场景自动获得                                                     |

关键设计判断（#4）：

- **清晰度**：canvas 是位图，纯 CSS transform 放大会糊。方案 = CSS transform 负责交互（translate/scale 作用于舞台内容包装层）+ 防抖后提升 canvas 背衬分辨率重渲染（`sizeCanvasToFill` 增加 `dataset.renderBoost` 钩子：背衬 = css × dpr × boost，ctx.scale(dpr×boost)，场景绘制代码零改动）。SVG 仪器（double-slit）本身是矢量，CSS transform 即保持清晰。
- **与仪器拖拽的冲突**：double-slit（stageLock:false）数据处理时仪器必须还能拖动对准。pan 层只响应：滚轮缩放、双指捏合、**空白处**拖拽；事件源在仪器 wrap（`[data-double-slit-instruments]`，未来其他场景用 `data-panzoom-ignore` 标记）内的拖拽不拦截。stageLock:true（ticker-tape）时全部手势归视口。
- **重置**：退出工作区时还原 transform、移除 boost、恢复 DOM 结构。

---

## 批次 C：表头 0 基 + 锁定提示强化 + 纸带视图填充（小项）

### C1. spec 加 `trialLabels`（`src/platform/data-workspace.ts`）

```typescript
/** Per-trial display labels (e.g. counting points 0..6). Default: 1-based 组号. */
trialLabels?: readonly string[];
```

- `assertSpecGraph` 校验：若提供，`trialLabels.length >= minRows`。
- 面板所有「第 N 组」文案/表头/aria-label（panel:300,329,364,380,418,683 等）经统一 helper `trialLabel(spec, index)` 取值：`trialLabels?.[index] ?? String(index + 1)`。正置模式行号列同样走 helper（double-slit 不受影响，默认 1 基）。
- ticker-tape data-task：`trialLabels: ['0','1','2','3','4','5','6']`。

### C2. 锁定步骤提示强化（`src/ui/components/data-workspace-panel.ts` + CSS）

- 未解锁 tab：`aria-disabled="true"` + 锁形标记（::before 内容用 🔒 或 CSS 图形）+ 灰化。
- 点击未解锁 tab：在步骤条下方显示醒目提示条（复用 blockedStepHint 文案，样式用 is-error 色调 + 短暂高亮动画），不再只替换 hint 行；3 秒自动消隐或切步时消隐。

### C3. ticker-tape 视图舞台填充（`src/scenes/ticker-tape/scene.view.ts`）

- 内容块（纸带+刻度尺+提示行）垂直居中于 canvas（消除底部死区）。
- 高度方向充分利用：内容盒高度允许随 canvas 高度增长（rulerH 等尺寸在 scale 上限内跟随），保持 `responsiveScale ∈ [0.3,1.5]` 棘轮与无 >50 裸数字约束。
- 不改坐标语义（originPx、读数映射不变），`fillFromRuler`/`tapeXCm` 不受影响。

### 批次 C 验收

```bash
pnpm vitest run tests/unit/data-workspace.spec.ts tests/unit/data-workspace-generic.spec.ts \
  tests/unit/data-workspace-capability.spec.ts tests/unit/ticker-tape-data-workspace.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/ticker-tape-data-workspace.spec.ts \
  tests/e2e/double-slit-data-workspace.spec.ts
pnpm lint && pnpm typecheck && pnpm build && pnpm check:bundle
```

- 新增 unit：trialLabels 校验与 helper；锁定 tab 提示行为。e2e：表头 0..6 断言；锁定 tab 点击出现提示断言。
- 视觉：ticker-tape 默认页内容居中会改像素 → 容器重生成基线（验收方执行）。

---

## 批次 D：舞台 Pan/Zoom 架构能力（大项）

### D1. core 钩子（`src/core/canvas-sizing.ts`）

- `applyCanvasSize` 读取 `canvas.dataset.renderBoost`（缺省 '1'，clamp [0.5, 4]）：背衬宽高 ×boost，`ctx.scale(dpr*boost, dpr*boost)`；`responsiveScale` 仍按 CSS 尺寸算（场景绘制逻辑不变）。
- 新增 `setRenderBoost(canvas, boost: number)` 导出（写 dataset，不改 CSS 尺寸）。
- 单元测试：boost 对背衬/transform 的影响、clamp、缺省行为不变。

### D2. pan/zoom 控制器（新文件 `src/app/layouts/capabilities/stage-panzoom.ts`，进 data-workspace-runtime 懒 chunk）

- API：`createStagePanzoom({ slot, onZoomSettled(zoom) })` → `{ apply, reset, dispose }`。
- DOM：进入时把 animation slot 的子节点移入新建 `.stage-viewport`（absolute inset-0, transform-origin 0 0）；slot 加 overflow:hidden；退出时还原。
- 手势：
  - 滚轮：以光标为锚点缩放，zoom ∈ [0.5, 3]，指数步进。
  - 指针拖拽：pan（clamp：内容边缘不越过 slot 边界超过 40%）。事件源在 `[data-panzoom-ignore]` / `[data-double-slit-instruments]` / 按钮/输入框内 → 不拦截（仪器保留拖拽）。
  - 触摸：单指拖 pan（stageLock 场景）/ 双指捏合 zoom；双指拖 pan（所有场景）。
  - 双击空白：复位 zoom=1、pan=0。
- 控件：舞台右下角浮层 ➕/➖/复位 小组件（通用文案/图标，无场景专属），键盘可达（button + aria-label）。
- 清晰化：zoom 变化防抖 200ms → 对 slot 内所有 canvas 调 `setRenderBoost(canvas, zoom)` → `window.dispatchEvent(new Event('resize'))` 触发场景标准 resize+render 链。zoom 回到 1 时移除 boost。
- 与 stageLock 的关系：lock 场景下 pan 层捕获全部指针事件（场景本就收不到）；非 lock 场景按上表分流。

### D3. 接入 data-workspace 能力（`src/app/layouts/capabilities/data-workspace.ts`）

- spec 加 `stagePanZoom?: boolean`（**默认 true**——架构级标配，用户明确要求双缝同等能力）。
- 进入工作区且未禁用 → 创建 panzoom 控制器；退出/dispose → reset + unwrap + 移除 boost。
- 演示模式保护不变（modechange 退出工作区即还原视口）。
- `assertSpecGraph` 校验 stagePanZoom 类型。

### D4. CSS（`src/styles/capability/data-workspace.css`）

- `.stage-viewport`、缩放控件浮层、zoom 时的过渡（transform 120ms ease-out，仅按钮/双击路径；手势路径无过渡）。

### D5. 测试

- unit（新 `tests/unit/stage-panzoom.spec.ts`）：transform 合成、clamp、renderBoost 钩子、ignore 区域分流、dispose 还原。
- e2e：ticker-tape（工作区内滚轮缩放 transform 生效、拖纸带不再改 O 点——originTickIndex 不变、退出工作区复位）；double-slit（工作区内仪器仍可拖动对准 + 滚轮缩放同时工作）。
- 契约：`data-workspace-architecture.spec.ts` 的 BOUNDARY_FILES 若新增懒加载模块需同步；capability-system 测试不涉及（无新 capability id，panzoom 是 data-workspace 内部模块）。

### 批次 D 验收

```bash
pnpm vitest run tests/unit/stage-panzoom.spec.ts tests/unit/data-workspace-capability.spec.ts \
  tests/unit/data-workspace-architecture.spec.ts tests/unit/data-workspace-generic.spec.ts
pnpm exec playwright test --config playwright.e2e.config.ts tests/e2e/ticker-tape-data-workspace.spec.ts \
  tests/e2e/double-slit-data-workspace.spec.ts
pnpm quality:core
```

- 视觉基线：默认页不变（工作区关闭态无 panzoom 痕迹），原则上无需重生成；跑容器 verify 确认。

---

## 文档同步（批次 D 内）

- `AGENTS.md` 两步工作区段落追加：`trialLabels` / `stagePanZoom`（默认开）/ `data-panzoom-ignore` 标记约定；renderBoost 钩子说明。

## 全局红线（沿用）

strict TS 零错误；禁 any；面板/平台/能力层禁场景专属 id 文案；不动覆盖率与预算阈值；PNG 基线只走容器；不 git commit。

---

## 批次 E：用户补充四项（2026-09-21 第二轮反馈）

1. **E1 刻度尺比例修正**（`src/scenes/ticker-tape/scene.view.ts`）：批次 C 的高度填充过度——纸带/刻度尺不应随舞台高度无限拉伸。恢复自然宽高比：刻度尺是薄条（视觉高度约为宽度的 1/8~1/10，参考 15cm 实尺），纸带条更薄；内容块（纸带+尺+提示行）作为一个整体在舞台内垂直居中，而不是各自拉伸填高。约束不变：`responsiveScale ∈ [0.3,1.5]`、无 >50 裸数字、originPx/tapeXCm 读数映射不动。桌面/移动/工作区三态都要合理。
2. **E2 默认页无图表区**：现状已满足（floatGraph/floatData:false，桌面+移动实测均不可见）。补 e2e 断言防回归即可（默认页 `.lab-float-graph`/`.lab-float-data` 不可见，桌面与移动各一条）。
3. **E3 全屏自动隐藏 chrome 行**：`scene-adapter.ts` 已有 `f` 键全屏切换（scene-adapter.ts:255-261）。在其上加 `fullscreenchange` 监听：`document.fullscreenElement` 非空时给 `.layout-master` 加 `is-native-fullscreen` class，退出移除；dispose 清理监听。CSS（放布局/shell 层样式，不是 data-workspace.css）：`.is-native-fullscreen` 下隐藏 chrome 按钮行——先调查各布局 chrome 容器（lab-stage 的 `.lab-stage-toolbar`、split-right/mobile-stack 的等价物），用一组选择器统一隐藏；transport 浮动条不隐藏（播放控制是演示本体）。e2e：`page.evaluate(() => document.documentElement.requestFullscreen())` 断言工具行隐藏、`document.exitFullscreen()` 后恢复。
4. **E4 工作区头部单行化**（`data-workspace.css`）：宽屏（媒体查询 min-width 约 1100px）下把 标题 + knowns chips + hint + 步骤条 合并为一个 flex 行（wrap 允许，窄屏自然回退多行）。只改 CSS 布局，DOM 结构不动（避免破坏既有测试选择器）。

验收：批次 C/D 验收命令全跑 + 新增 e2e 断言 + `pnpm quality:core`。ticker-tape 默认页像素会变（E1）→ 基线由验收方容器重生成。红线沿用。

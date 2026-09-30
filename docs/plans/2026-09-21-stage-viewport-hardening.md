# 舞台视口加固方案（panzoom 后续架构修复）v4

> 状态：已执行。归档记录，不作为现行方案。

日期：2026-09-21（v2/v3 两轮 Grok 交叉审计修订，修订记录见文末）
状态：**已实施**（2026-09-21，顺序 3→1→2→4；v4 终审批准时的 4 条实现约束已遵守）
背景：双缝干涉工作区连续曝出两个架构性 bug（panzoom 控件被 slot 霰弹规则拉成遮罩；缩放时仪器 fit 漂移/抵消缩放）。目标：**性能、功能性、可维护性**，不考虑向后兼容（内部 API 可直接改）。

## 根因回顾（已确认）

- **坐标空间无边界**：panzoom 用 CSS transform 做视图层（屏幕空间），仪器 fit/拖拽用 `getBoundingClientRect`（含 transform）测量却按局部空间应用。
- **slot 子节点无主**：chrome 与内容混在 slot，靠 CSS `:not()` 反向豁免 + JS `CHROME_CLASSES` 两份名单维护，且已分叉（CSS 豁免了 `teaching-readout-panel`，JS 没有）。
- **window resize 总线三职**：真实窗口变化 / 布局重建 / renderBoost 清晰化共用同一事件，zoom 稳定触发全页 fan-out。

## 任务 1：boost 清晰化不再派发 window resize（性能 + 根治 refit 扳机）

现状：`stage-panzoom.ts`（applyBoostNow / dispose）各发一次假 `window.resize`，只为让场景重跑 `sizeCanvasToFill` 应用 renderBoost。

改动（接线已核实：`SceneAdapter implements Scene`（scene-adapter.ts:36），持有 `_scheduleResize`（:58）；container.ts:226 `_buildCapabilityContext(scene)` 传入的 scene 即 adapter，无需额外管道）：

1. `src/app/layouts/types.ts` `Scene` 接口新增 `requestStageRepaint(): void`。
2. `SceneAdapter` 实现：
   ```ts
   requestStageRepaint(): void {
     this._scheduleResize?.();
   }
   ```
   即复用既有 rAF 合帧通道（resize+render 一次、dispose 取消挂起）。**禁止**在 capability-context 再套一层 rAF（双 rAF 两套 cancel，布局切换时旧 rAF 可能打到新槽）。
3. `CapabilityContext.requestStageRepaint()` 仅转发 `scene?.requestStageRepaint()`。手写 CapabilityContext mock 的测试补齐该方法：`data-workspace-capability.spec.ts`、`data-workspace-lazy.spec.ts`、`capability-orchestrator.spec.ts`、`capability-system.spec.ts`、`readout-panel-capability.spec.ts`、`layout-integration.spec.ts`、`internal-energy.chrome.spec.ts`、`capability-context.spec.ts`、`layout-dom-contracts.spec.ts`（:16-27 手写 ctx）；`Scene` 接口新增必选方法还会打到 `scene-slot-renderer.spec.ts:37` 与 `capability-context.spec.ts:25` 的 Scene 字面量。
4. `stage-panzoom.ts`：
   - 删除两处 `window.dispatchEvent(new Event('resize'))`；
   - `applyBoostNow` 里 `onZoomSettled` 改为**仅在 `shouldResize` 时调用**（现状每次 settle 都调；成为唯一出口后滚轮微调会每次跑完整 `scene.resize()`）；`resetInternal`/`dispose` 的强制 repaint 保留；
   - dispose 顺序：清 boost → 删 renderBoost → **unwrap 之后**再经 `onZoomSettled(1)` repaint（否则 `sizeCanvasToFill` 还在量 viewport）。
5. `data-workspace.ts` 创建 panzoom 时传 `onZoomSettled: () => ctx.requestStageRepaint()`（现状没传；只改 panzoom 不接线，退出工作区画面会糊）。

语义选择（**A，不混 B**）：repaint = 完整 `scene.resize()+render()`。承认 zoom settle 仍会跑仪器 `resize()`/fit——`localFitSpace` 已使其幂等，当防御层。已知残留（既有问题，本任务不修）：双缝 `scheduleInstrumentStageFit` 用 GBCR 写移动端 `--dw-h`。

假 resize 的消费者核实（全库）：仅 scene-adapter（保留目标）、chart-canvas（有 ResizeObserver 时不听 window resize）、两个无 data-workspace 的 page chrome。其余派发点（data-workspace.ts:96、lab-stage、sidebar-toggle、demo-profile）是真实布局变化，保留。

验收标准：

- 单测：zoom settle 不再触发 `window` 的 resize 事件；`shouldResize=false` 时 `onZoomSettled` 不调；dispose 后收到恰好一次 repaint。
- e2e 复用 `waitForBoost`/`expectCanvasLayoutNotInflated`：zoom 后背衬分辨率变化且 CSS 尺寸不膨胀；退出工作区 boost 清除、画面清晰。

## 任务 2：chrome 正向自标 + JS/CSS 单一事实源（可维护性）

改动：

1. 新建 `src/platform/stage-chrome.ts` 导出 `STAGE_CHROME_ATTR = 'data-stage-chrome'`（不放 standards.ts——那是教学渲染 token）。
2. 打标点（会成为 animation 槽直接子节点的全部 chrome）：
   - `stage-panzoom.ts` 的 `.stage-panzoom-controls`；
   - `ui/floating-controls.ts` / `ui/stage-toolbar.ts` 的浮动控件；
   - `readout-panel.ts:321` 的 `.teaching-readout-panel`（JS/CSS 分叉的当事人）；
   - `demo-profile.ts:292` 过继进 animation 的 `.graph-section.is-demo-stage-graph`（演示模式与工作区互斥暂未爆，契约仍要打上）。
   - `.stage-viewport` **不打标**（自有 `position:absolute; inset:0`）；mobile-control-bar / mobile-transport-toggles 挂在 container 而非 slot，不在本契约范围；场景内容（canvas、仪器 host、`[data-double-slit-instruments]`）不打标。
3. `split-right.css:97` 改为 `:not(canvas):not([data-stage-chrome])`（全库仅此一处霰弹，grep 已证实）。
4. `stage-panzoom.ts` 删 `CHROME_CLASSES`；`wrap()` = 自身 viewport/controls 引用判断 + `hasAttribute('data-stage-chrome')`（引用判断必须保留，不能只靠属性）。
5. **新增契约测试**：挂载 split-right + 工作区后，`.teaching-stage-slot` 的每个非 canvas、非 `.stage-viewport` 直接子节点必须带 `data-stage-chrome`，否则失败。（安全性的真正来源是单一事实源 + 契约测试，不是"忘打标会被拉伸更明显"——拉满的 chrome 仍是不透明遮罩。）

验收标准：契约测试红→绿；布局矩阵 e2e 全绿；既有 panzoom 控件 boundingBox 契约保留；视觉基线用 `scripts/visual-linux-container.sh update` 重生成（禁止宿主机 `--update-snapshots`）。

## 任务 3：指针 delta 归一化（功能性）

API 设计（k 不 GBCR、不 dragstart 缓存；两处 blocker 已修）：

1. **属性写在 `.stage-viewport` 上，不是 slot**（v3 blocker 1：chrome——transport 条、readout 面板——是 viewport 的兄弟，不受 scale；写在 slot 会让它们的 `makeDraggable` 误读到 k 变成半速）。`stage-panzoom.ts` `paint()` 内：zoom 变化时写 `viewport.dataset.stageZoom = String(zoom)`。viewport 随 wrap 创建、随 unwrap 删除，**属性生命周期 == panzoom 生命周期**，dispose 无需额外清理；chrome 的祖先链碰不到 viewport → 天然缺省 1。
2. **composed 树攀爬**（v3 blocker 2：两个仪器都是 open shadow root——`micrometer-eyepiece/instrument.view.ts:89`、`interference-vernier-caliper/instrument.view.ts:84`，指针绑在 shadow 内的元素上，`closest()`/`parentElement` 穿不过 shadow 边界）。`src/core/canvas-sizing.ts` 新增：
   ```ts
   /** 沿 composed 树向上找 [data-stage-zoom]，缺省 1。无强制布局。 */
   export function stageZoomOf(el: Element): number {
     let node: Element | null = el;
     while (node) {
       if (node instanceof HTMLElement && node.dataset.stageZoom) {
         const k = Number(node.dataset.stageZoom);
         return Number.isFinite(k) && k > 0 ? k : 1;
       }
       node =
         node.parentElement ?? (node.getRootNode() as ShadowRoot).host ?? null;
     }
     return 1;
   }
   /** 屏幕指针 delta → 舞台局部坐标 delta。 */
   export function localPointerDelta(el, dx, dy): { dx: number; dy: number };
   ```
   `ancestorZoomScale` 从 instruments/\_utils/fit-visual.ts 迁入此处并 re-export（避免两套测量 API）。
3. **测量对象纪律**：k 只读 panzoom 写入的属性，不测量任何元素——从机制上排除"对 instrumentEl/systemEl（自带 visualScale 变换）取 k"的错误；也排除对 slot 误读（属性只在 viewport 上）。
4. 修点（行号以当前工作树为准）：
   - `micrometer-eyepiece/renderer/interactions.ts`：整机拖拽（82-88）与读数拖拽（45-50）；
   - `interference-vernier-caliper/renderer/interactions.ts`：读数拖拽（151-156，`deltaX / 2 / UNIT_PX`）与整机拖拽（182-187）；
   - `ui/utils/draggable.ts`：`makeDraggable` delta ÷ k，clamp 改 `offsetWidth/offsetHeight`（不再 GBCR）；`makeResizable` 起点 startW/startH 同样改 offset（128-129 行现用 GBCR）且 delta ÷ k；
   - `readout-panel.ts` `initResizeHandle`（144-158，自算 `offsetWidth + 屏幕 dx`）：delta ÷ k。
   - 不改：仪器 wheel（±0.01/档，非屏幕 delta）、keyboard（固定步长）、`vernier-caliper-guide`（`getScreenCTM` 已含祖先 transform）、ticker-tape 画布命中（stageLock 锁指针）。

验收标准：

- 单测：`stageZoomOf` 缺省/读值；k=2 时拖 10px → 局部 5px；clamp 在 transform 祖先下用 offset 正确。
- e2e 口径（修正后）：zoom=k 时拖**滑块**（读数路径 `deltaX / 2 / UNIT_PX`）10px 的读数变化 = zoom=1 时拖 10/k px 的变化。拖主尺改的是 `sysX/sysY`，不是读数。

## 任务 4：规范沉淀与门禁

1. AGENTS.md 增「舞台缩放坐标纪律」：布局测量只走 `readElementLayoutSize`/canvas-sizing；指针 delta 进局部坐标前必须经 `localPointerDelta`（k 来自 `data-stage-zoom`，禁止对被 transform 的元素取 GBCR 比值）；chrome 插入 slot 必须自标 `data-stage-chrome`；**工作区画布命中必须自行归一化或设 `stageLock`（stageLock 不是全局默认——双缝就没锁）**。
2. `pnpm quality:core` 全绿；相关 e2e 全绿；视觉基线容器重生成。

## 明确不做（交叉审计一致同意）

- 不用 CSS `zoom` / Zoom API（打穿 `readElementLayoutSize` 的 offsetWidth 免疫设计）。
- 不加 `elementFromPoint` 命中断言（跳过 `pointer-events: none`，恰好测不到遮罩类 bug，会假绿；几何契约已在挡）。
- 不做 stage surface（内容层/chrome 层）大重构，留作后续演进。
- 不动其他 `window.resize` 派发点（真实布局变化）。

## 实施顺序与风险

| 序  | 任务                  | 风险面       | 验证                           |
| --- | --------------------- | ------------ | ------------------------------ |
| 1   | 任务 3（指针 delta）  | 小           | 单测 + e2e                     |
| 2   | 任务 1（去假 resize） | 中，重绘链路 | 单测 + waitForBoost            |
| 3   | 任务 2（chrome 打标） | 中，CSS 契约 | 契约测试 + 布局矩阵 + 视觉基线 |
| 4   | 任务 4（文档/门禁）   | 无           | quality:core                   |

## 修订记录

### v4（2026-09-21，Grok 第三轮）——**已获批准实施**

- **任务 3 blocker 1**：`data-stage-zoom` 从 slot 改写到 `.stage-viewport`——chrome（transport 条、readout 面板）是 viewport 兄弟，读 slot 会被误归一化成半速；属性随 viewport 生命周期，dispose 无需清理。
- **任务 3 blocker 2**：两个仪器都是 open shadow root，`closest()` 穿不过 shadow 边界；`stageZoomOf` 改为 composed 树攀爬（`parentElement ?? getRootNode().host`）。
- 任务 1 测试清单补 `layout-dom-contracts.spec.ts:16-27`（手写 ctx）与两个 `Scene` 字面量（`scene-slot-renderer.spec.ts:37`、`capability-context.spec.ts:25`）。
- 确认：v2 要求均已进正文且无走样；`CHROME_CLASSES` 现含的 `mobile-control-bar` 等类名随任务 2 删除是对的。

**终审批准时的实现约束（写代码时遵守）：**

1. `stageZoomOf` 用 `root instanceof ShadowRoot ? root.host : null`，不要 `as ShadowRoot` 类型断言。
2. 单测必须覆盖：open shadow 内元素能读到祖先 `.stage-viewport` 的 k（防退回 `closest()`）。
3. `paint()` 每次都写 `viewport.dataset.stageZoom`（含首次 zoom=1），比"仅 zoom 变化时"更简单，避免漏写。
4. `localPointerDelta(el, …)` 的 `el` 用闭包内的稳定节点（slider/systemEl/thimbleGroup），**禁止**用 document 级 move 事件的 `event.target`（指针可能已移到 chrome 上，会读成 k=1）。

### v3（2026-09-21，自查细化）

- 任务 1 接线精确化：确认 `SceneAdapter implements Scene` 且 container 传入的 scene 即 adapter，`requestStageRepaint` 一行转发 `_scheduleResize`，零额外管道；补验收标准（不再 dispatch resize、onZoomSettled 门控、dispose 恰好一次 repaint）。
- 任务 3 API 精确化：`paint()` 写 `slot.dataset.stageZoom`（zoom 变化时）、dispose 删除；`stageZoomOf`/`localPointerDelta` 落 canvas-sizing.ts；k 从机制上与"被变换元素"解耦（读属性而非测元素）。
- 任务 2/4 补验收标准与契约测试形态。

### v2（2026-09-21，Grok 交叉审计）

- 任务 1：`scene.resize/render` 落点从 CapabilityContext 移到 `Scene.requestStageRepaint()` → `SceneAdapter._scheduleResize`（原方案会在类型上无声失败，boost 永不进背衬）；`onZoomSettled` 门控到 `shouldResize`；明确选语义 A；补测试文件清单与 dispose 顺序约束。
- 任务 2：补 `.graph-section.is-demo-stage-graph` 打标点；纠正"mobile 栏是槽内 chrome"的误判；常量改放 `platform/stage-chrome.ts`；wrap() 保留引用判断；删除"fail-loud 更安全"修辞，改为契约测试兜底。
- 任务 3：k 改由 panzoom 写 `data-stage-zoom`（替代 GBCR/dragstart 缓存）；明确测量对象必须是未变换 host（防 visualScale 混入）；补 `makeResizable` 起点与 `readout-panel.initResizeHandle`；修正 e2e 断言口径（滑块而非主尺）；`localPointerDelta` 落 canvas-sizing.ts。

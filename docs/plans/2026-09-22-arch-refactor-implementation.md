# 布局系统 × 实验模式 架构重构实施方案（v3 · 定稿）

> 依据：`docs/plans/2026-09-21-arch-refactor-backlog.md`（v3 定稿）。
> v1→v2：工具条宿主打标落点/时机重写；双缝"加新标留旧标"；契约 hasGraph:false 收窄；补 readout-slot/graph-body 落点；demoCapable 移到批 5。
> v2→v3（Grok 第 2 轮修补）：工具条改单一宿主语义（mount 时不预打标，ensureStageToolbar 对解析结果补标）；graph-body 中间层补 flex 契约；selector 兜底第二分支保留 satisfiesConstraints（含 maxWidth）；readout-slot 只打 ul；projectile 两锚点不合并。
> 状态：**已执行（2026-10-07）：文末批 1–6 验收表均通过。本文件为历史实施记录；现行技术债状态以 `docs/debt-ledger.md` 为准。**

## 全局约定

**新增契约属性**（集中定义在 `src/platform/stage-chrome.ts`）：

```ts
export const STAGE_FRAME_ATTR = 'data-stage-frame'; // 舞台外层 frame（工作区面板插到它后面）
export const GRAPH_SECTION_ATTR = 'data-graph-section'; // 被收养/过继的那一层图区
export const GRAPH_BODY_ATTR = 'data-graph-body'; // 图区内容体（场景描点工具条锚点）
export const STAGE_TOOLBAR_HOST_ATTR = 'data-stage-toolbar-host'; // 舞台工具条宿主
export const READOUT_SLOT_ATTR = 'data-readout-slot'; // 读数挂载点
export const PANZOOM_PAN_IGNORE_ATTR = 'data-panzoom-pan-ignore'; // 只挡平移、不挡滚轮
```

**LayoutMetadata 新增字段**（`src/app/layouts/registry.ts:20-48`）：

```ts
/** 工作区收养图区的目标层级：'section'（缺省默认）= 收养 [data-graph-section]；'slot' = 收养 slots.graph 本身 */
graphAdoptTarget?: 'section' | 'slot';
/** 是否消费 LayoutConfig.graphInitiallyHidden。false = 显式忽略（须注释理由）。缺省 true */
honorsGraphInitiallyHidden?: boolean;
```

**能力层取元数据**：`CapabilityContext.getCurrentLayoutId()`（types.ts:168，容器注入 container.ts:232，空串时元数据为 undefined 须走 class 兜底）+ `import { layoutRegistry } from '../registry'`。**无循环**：registry 只依赖 types；四布局由 auto-register 动态 import；布局不 import registry；data-workspace runtime 由 lazy 代理动态加载。chunk 上 runtime 进 `data-workspace-runtime`、registry 进 `layouts`，不拖进首页。**禁止**从能力层 import 布局类、禁止 platform/ import registry。

**落点映射表（v2 修正版）**：

| 布局         | data-stage-frame            | data-graph-section                                                                               | data-graph-body                                                                                                                                                                                                                                  | graphAdoptTarget |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| split-right  | `.teaching-stage-frame`     | 图 section                                                                                       | **新增中间层**：包住 slot、不含 header，自身必须是 section 的 flex 填充子（`flex:1; min-height:0; display:flex; flex-direction:column`），slot 的 `flex:1` 相对这一层。**禁止打在 slot 上**（scene-adapter.ts:510 replaceChildren 会清掉子节点） | section          |
| srgb         | `.srgb-stage-frame`         | 右侧图 section                                                                                   | 同上（新增中间层，同样带 flex 契约）                                                                                                                                                                                                             | section          |
| lab-stage    | `.lab-stage-anim`           | `.lab-float-graph` 面板                                                                          | 其 `.lab-float-body`（现成节点，直接打标，不加层）                                                                                                                                                                                               | section          |
| mobile-stack | `.mobile-animation-section` | **不打**（收养 slots.graph 本身，现状即如此——slot class 是 mobile-graph-slot，不在旧选择器串里） | **不打**（slot 会被 replaceChildren；mobile 不挂描点条）                                                                                                                                                                                         | slot             |

**`data-stage-toolbar-host` 是单一宿主语义，打标时机 = 宿主创建/命中时，不是布局 mount 时**（mount 时浮条不存在，预打标到 `.stage-toolbar` 会被"属性优先"抢走按钮）：

| 场景                           | 宿主                                                                                                                                         | 打标点                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 有 transport 的 split/srgb/lab | transport 浮条（ensureStageToolbar 第一优先级，stage-toolbar.ts:28-32；lab 的能力顺序 transport 在 data-workspace 之前，lab-stage.ts:60-68） | `createFloatingControls`（ui/floating-controls.ts）创建时打标 |
| 无 transport 的 split/srgb     | 布局自带 `.stage-toolbar`                                                                                                                    | **不在 mount 打标**；ensureStageToolbar fallback 命中后补标   |
| 无 transport 的 lab            | `.lab-stage-toolbar`                                                                                                                         | 同上（fallback 命中后补标）                                   |
| mobile（两种 fixture）         | `.mobile-control-bar` 内的 `.mobile-transport-toggles`（compact transport 不造浮条）                                                         | 布局 mount 时打标（该节点 mount 即存在）                      |

`ensureStageToolbar` 逻辑：先查 `[data-stage-toolbar-host]` → class fallback → 自建；**对最终返回节点补标**（class fallback 命中与自建都打）。

`data-readout-slot` 落点（打在今天查找**成功**的节点上）：

| 布局         | 落点                                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| split/srgb   | **只打** readout 能力创建的内部 `ul`（`readout-panel.ts:282`，创建时打标，**不是布局 mount**；不是 :265 的 panel——mechanical-energy 的 `mountDataPanel` 认 `UL` 或 class 含 `readout-slot`，打在 panel 上表会插到 div 外面） |
| lab-stage    | 读数：`.lab-readout-slot`；数据浮窗：继续用既有 `[data-lab-data-slot]`                                                                                                                                                       |
| mobile-stack | `.mobile-readout-panel`（**不是** `.mobile-readout-slot`，布局清 slot 会抹掉后挂内容——projectile 注释已写明）                                                                                                                |

**契约测试**（新建 `tests/unit/stage-mount-attrs-contract.spec.ts`，happy-dom 可行——`layout-integration.spec.ts` 已 mount 全部四布局、`data-workspace-capability.spec.ts` 已进到 ensureStageToolbar）：

- 每个注册布局 mount 后必有 `[data-stage-frame]`
- `slots.graph` 存在且 `graphAdoptTarget`（缺省按 `'section'`）为 section 时，必有 `[data-graph-section]` 和 `[data-graph-body]`；无 `slots.graph` 时不要求、也**不得为变绿而建假节点**
- `hasGraph:false` 的"图 DOM 不出现"断言**只对 split-right 和 mobile-stack**（srgb 无条件 buildGraphSection、lab 永远建 `.lab-float-graph`，不参与此条）
- 工具条宿主按三种 fixture 断言：
  - mobile（两种 fixture）：宿主 = `.mobile-transport-toggles`
  - split/srgb/lab + transport 能力：宿主 = 浮条；且 `.stage-toolbar`/`.lab-stage-toolbar` 上**不得**同时有该属性
  - 无 transport、调用 ensureStageToolbar 后：split/srgb 落 `.stage-toolbar`、lab 落 `.lab-stage-toolbar`，且已补标
  - **"只 mount 布局"不要求 split/srgb/lab 已有宿主**（浮条是能力建的，mount 时不存在）

---

## 批 1 · 死代码清理（P1-A）——可立即开工

1. `types.ts`：删 `LayoutConfig.slots`（:72）、`__managedByContainer`（:105）、`SlotName`/`LayoutSlots` 的 `'data-workspace'`（:24,:59）、`CapabilityScope`（:130）、`CreateContainerOptions.defaultLayout`（:339）
2. `scene-bootstrapper.ts:116`：删 defaultLayout 传参（真缺省在 scene-adapter.ts:68）
3. `capabilities/index.ts`：删 `CAPABILITY_SCOPES`/`getCapabilityScope`；工厂表（:145-156）与 `createCapabilityDefinition` switch（:158-183）合并为单一工厂表——**合并后 `capability-orchestrator.ts:110`（存在性判断）与 `:125`（创建调用）两个入口必须仍指向同一张表**
4. `dataWorkspace` 收窄为 `boolean`（已核实场景侧只有 `dataWorkspace: true`，无对象形态）：删 `DataWorkspaceConfig`（declarations:10-12）、platform 侧 reserved `chartAnalysis`（platform/data-workspace.ts:18-21）、runtime 的 `void cfg; void config`（capabilities/data-workspace.ts:111-112）；**同步改** `data-workspace-declarations.ts:22-24` 的 object 分支和 `data-workspace-lazy.ts` 的同名类型，否则 quality:core 会红。**不碰** `DataWorkspaceSpec.chartAnalysis`、panel 的 `dataset.slot`、`CapabilityId` 里的 `'data-workspace'`
5. 偏好双写单读：删 `getDefaultLayoutId`/`saveLayoutPreference`/`LAYOUT_PREF_KEY`/`migrateLayoutPref`（registry.ts）+ container.ts:557 调用与 :12 import。**不删** `persistState`/`setUserPreferredLayout`（活偏好走 container-persistence）
6. 测试同步：`scene-bootstrapper.spec.ts`（4 处断言）、`scene-container.spec.ts:33,267-275`、`layout-registry.spec.ts`（整段 describe + 字面量钥匙）；`container-stress/edge-cases/capability-orchestrator.spec.ts` 的 scope mock 是多余键（删不删都不红，顺手删）；`capability-system.spec.ts:812-813` 的多余 mock 导出顺手删
7. **明确不删**：`layoutOverrides`（container.ts:498-515 活读者，chase-meet 在用）
8. 全仓 grep 复查每个被删符号

**验收**：`pnpm quality:core`。

---

## 批 2 · 语义定案 + 挂载点属性化（P1-D → P0-1）

### 2a. P1-D

1. registry.ts 加两字段；auto-register.ts 四处补齐（mobile 填 `slot` + `honorsGraphInitiallyHidden:false` 并注释理由）
2. `lab-stage.ts`：`floatGraph` 有效值 = `config.floatGraph ?? (config.graphInitiallyHidden ? false : true)`；`floatData` 不动；`floatGraph===false` 时仍写 `dataset.graphInitiallyHidden`；**不推导 collapsed**（lab 默认折叠 ≠ hidden）。已核实：全仓只有 ticker-tape 同时传两者，公式在显式布尔上与现状 `!== false` 等价，零行为变化
3. `ticker-tape/page.ts`：删冗余 `floatGraph:false`（由推导覆盖）；floatData 保留
4. mobile-stack：仅元数据声明，零行为变化

### 2b. P0-1

1. `platform/stage-chrome.ts`：加 6 个属性常量
2. 布局打标：按映射表。split/srgb 的 graph-body 新增中间层（带 flex 契约，见映射表）；mobile 不打 graph-section/graph-body；toolbar host 按"单一宿主语义"表执行——split/srgb/lab 只在 `createFloatingControls` 创建浮条时打标，**mount 时不预打标**（预打到 `.stage-toolbar` 会被属性优先抢走按钮）；mobile 在 mount 时打 `.mobile-transport-toggles`
3. `capabilities/data-workspace.ts`：`placeWorkspaceHost` 先查 `[data-stage-frame]` 再走旧链；`adoptGraphIfNeeded` 按 `graphAdoptTarget`（缺省 section）分流，section 路径先查属性再走旧链
4. `capabilities/demo-profile.ts`：graphSel 默认改 `'[data-graph-section], .graph-section'`（删死选择器 `.layout-graph-section`——JS 里无赋值点；responsive-demo.css 只删 :227 死规则的第二个选择器，**:226 的 `.graph-section.is-collapsed-demo` 是活规则，保留**）；`:331,439,549` 改查 `.readout-panel`（安全：class 串是 `` `${prefix}-readout-panel readout-panel` ``，`endsWith('-readout-panel')` 仍先命中带前缀者，前缀拼接不受影响）。**不动** `${prefix}-is-overlay` 拼接
   - **新行为警告**：改后 lab 演示模式会第一次摸到 `.lab-float-graph`（demo-profile.ts:410-432 会写 display/data-collapsed；过继仍有 `.layout-left-panel` 门槛 :286，不会搬进舞台）→ **验收**：用 projectile-components（默认 lab + `graphPanel:'visible'` 的唯一现成场景）进演示模式，预期三条：浮窗不进舞台；visible 不展开 `.is-collapsed`（lab 的 modechange 先于 demo 加折叠 class，demo 不摘）；离开演示不残留 inline `display`（savedGraphDisplay 用 getComputedStyle，有把 flex 写成永久 inline 的风险，需验证）
5. `ui/stage-toolbar.ts`：属性优先 + 对最终返回节点补标（见全局约定）
6. panzoom 双标记（v2 修正：**旧属性保留**——`data-double-slit-instruments` 有 data-workspace.css:425 几何规则、e2e 9 处、视觉 2 处、stage-panzoom.spec.ts:196,207 共 4 类消费方）：
   - `double-slit/scene.entry.ts:141`：同一宿主元素**加** `dataset.panzoomPanIgnore = 'true'`，旧属性不动
   - `stage-panzoom.ts:23` `PAN_IGNORE_SELECTOR`：`[data-double-slit-instruments]` → `[data-panzoom-pan-ignore]`
   - `WHEEL_IGNORE_SELECTOR`（:35-42）**不加**（仪器上滚轮缩放必须保留）
   - `stage-panzoom.spec.ts` 对应断言同步改用新属性
7. 契约测试落地（见全局约定）
8. `AGENTS.md` 布局扩展规范补打标要求 + `data-panzoom-pan-ignore` 写进逃生口文档（注明与 `data-panzoom-ignore` 的 pan/wheel 区别）
9. CSS 分叉规则（data-workspace.css:446-450 flex、:509-513 --dw-h 等）保持 class 不动
10. 顺手项：`selector.ts:63-65` 兜底（现为 `availableLayouts[0]`）改两分支——先在 `autoSelectable && satisfiesConstraints`（含 maxWidth，layout-constraints.ts:21）内按 priority 取最大（逻辑同 default-strategies.ts:38-44）；空集时在 autoSelectable 内按 priority 取最大，**仍须满足 satisfiesConstraints**；priority 并列按注册顺序。**禁止**只看 minWidth（mobile 只有 maxWidth:768 无 minWidth，宽屏会落到 mobile）。当前四布局下该兜底走不到，属防御性修补

**验收**：quality:core + 布局矩阵全量 + 工作区 e2e 22 + double-slit 交互 e2e（滚轮缩放回归）+ lab 演示模式图浮窗显隐检查。视觉红走 `scripts/visual-linux-container.sh update`。

---

## 批 3 · page 反查收口（P1-B）

1. `ticker-tape/page.ts:92-100`：描点工具条锚点改查 `[data-graph-body]`（lab 的 `.lab-float-body` 已在批 2 打标）；查不到显式 no-op + 注释
2. `projectile-components`：**两个锚点保持分开，不合并**——数据宿主（`data-panel.ts:94-114` 的 `findProjectileDataHost`）保持 `[data-lab-data-slot]` 优先，mobile 才落到打在 `.mobile-readout-panel` 上的 `[data-readout-slot]`；`page.ts:113-116` 的读数面板锚点改 `[data-readout-slot]`（lab 上是 `.lab-readout-slot`）；`data-panel.ts:161-171` 的 `hideLabGraphFloat`/`placeLabDataFloat` 摆的是 `.lab-float-graph`/`.lab-float-data`，**移出本次迁移**（不是读数槽）
3. `mechanical-energy/data-panel.ts:87-104`：读数查找改 `[data-readout-slot]`（含 split/srgb 的 readout-panel 内部 `ul`——已在批 2/本批由能力创建点打标）
4. `double-slit/scene.entry.ts:461-463`：`--dw-h` 改写 `[data-stage-frame]`（桌面 frame 上多一个无人读的内联变量，已核实无害——唯一消费规则在 data-workspace.css:509-513，要求 `.mobile-animation-section` 且 split/lab 的 frame 不是其祖先）
5. **不做**：双 class（`teaching-stage-floating-controls`+`stage-floating-controls`）合并不夹在批 3——要做就单独 PR 连 split-right.css、data-workspace.css、stage-toolbar.ts 一起改

**验收**：全量矩阵 + 工作区 e2e + 相关场景单测。

---

## 批 4 · 场景侧 hasFloatingReadout 统一（P1-C）

1. 属性 `data-readout-overlay`（避开 `data-readout-placement`；演示模式不改它）：split/srgb/lab = `'true'`、mobile = `'false'`，打在布局根元素
2. `src/platform/stage-readout.ts` 新建 `readoutOccludesStage(anchorEl)`：从锚点向上查属性，缺省 `true`（与多数副本的 fallback 一致）。**分层已核实**：platform 可放 DOM 查询（platform/input/keyboard-shortcuts.ts 已有 closest 先例）；helper 只向上读属性，**不 import 布局/registry**；scene.sim.ts 可依赖 platform
3. 迁移 19 处副本 + view 层选择器：`magnetic-mirror/scene.view.ts:115,128,150,593`、block-board、single-slit、accel-force、vertical-circle、displacement-time、three-forces 等。**像素测量继续量 `.readout-panel`**，不要改成只剩布尔
4. oscilloscope 单独：helper + 浮窗实测的复合判断，单测钉像素后切换

**验收**：全量矩阵 + 涉及场景单测；逐场景 diff 留白行为零变化（本身即 bug 的 lab 留白逐一确认后放行）。

---

## 批 5 · 去重（独立 PR 序列）

- **PR-5a（P2-A）**：`src/ui/utils/node-mover.ts` 的 `moveNode/restoreNode`（只管 parent/next）；demo-profile 还原改用保存的节点（修复"选择器一改图回不了家"）。注意：`.layout-graph-section` 在批 2 已删，不要留到本批；批 2→5a 之间还原能工作是因为新选择器打在被搬走的节点上，restoreGraphHome 重查仍找得到
- **PR-5b（P2-B）**：`src/app/layouts/request-layout-resize.ts` 共享 helper；四处接入（data-workspace.ts:94-98、demo-profile.ts:94-98、lab-stage.ts:348-350、sidebar-toggle.ts:132-134）；lab-stage.ts:171-173 同步 dispatch 不动
- **PR-5c（P2-C）**：`capabilities/base-declarations.ts` 的 `buildBaseCapabilities`；只抽公共尾巴（hideTransport 三元、dataWorkspaceDeclarations、theme/mode、demo-profile、debug）；**transport 不收**（mobile `{}`+mount 注入 controlBar vs 桌面 `{mountSlot:'animation'}`）
- **PR-5d（P2-D）**：split-helpers.ts:215-218、mobile-stack.ts:340-344 删 documentElement 写入
- **PR-5e（P1-E）**：`ui/stage-toolbar.ts` 加 `buildStageToolbar()`；三处骨架接入；共享 class 不变（快捷键链 scene-adapter.ts:294-316 不受影响）；**抽骨架后批 2 的 `data-stage-toolbar-host` 打标逻辑必须保留**。动视觉走截图容器
- **PR-5f（demoCapable，从批 6 移来）**：`capabilities/demo-profile.ts:87` 的 `isDesktopDemoLayout` 改用 `getCurrentLayoutId()` + `layoutRegistry.getMetadata()`；删 `platform/demo-profile.ts` 的 `DESKTOP_DEMO_LAYOUTS` 硬编码名单，LayoutMetadata 加 `demoCapable?: boolean`；`auto-register.ts` 给 split-right / split-right-graph-bottom / lab-stage 显式设 `demoCapable: true`，mobile 不设；**缺省（含空 layout id 时元数据 undefined）按 false**，与现状 `isDesktopDemoLayout('')` 一致。**查找必须留在 app 能力层**——platform import registry 会把 layouts 经 `/src/platform/`→`core` chunk 拖进首页（vite.config.ts:266-274）

**验收**：5a-5d 单测+quality:core；5e 加视觉容器基线；5f 单测+演示模式 e2e。

---

## 批 6 · 大文件拆分（每文件独立 PR，必跑 check:bundle）

1. `scene-adapter.ts` → keyboard-shortcuts / readout-filter / perf-monitor（app/ 内无 chunk 牵连，最先）
2. `capabilities/demo-profile.ts` → saved-state / graph 过继 / chips
3. `capabilities/stage-panzoom.ts` → 交互 / 渲染
4. `ui/components/data-workspace-panel.ts` → table/summary/review/steps；**manualChunks 的 `data-workspace-panel.` 前缀规则同步改**，否则面板掉进首页 `ui` chunk
5. `platform/data-workspace.ts` → spec-validation/session/tolerance；**`/src/platform/data-workspace.` 前缀规则同步改**，否则引擎掉进 `core` chunk；保住 declarations 不引引擎

## 随手项

- `container.ts:361-370` 焦点恢复改 data 属性（批 5）
- `enabledSteps` 文档澄清（批 6 platform 拆分 PR）
- **不做**：`lab-stage.ts:299` 的 `mobile-tab-panel` 换名（承重 class：lab-stage.css:215-224 + applyOpen + layout-matrix.spec.ts:60-63 三处依赖）

## 里程碑验收总表

| 批    | quality:core | 单测 | 矩阵 960 | 工作区 e2e | check:bundle | 视觉容器 | 专项                        |
| ----- | ------------ | ---- | -------- | ---------- | ------------ | -------- | --------------------------- |
| 1     | ✅           | ✅   | —        | —          | —            | —        | —                           |
| 2     | ✅           | ✅   | ✅       | ✅         | —            | 若红     | 双缝滚轮回归 + lab 演示显隐 |
| 3     | ✅           | ✅   | ✅       | ✅         | —            | —        | —                           |
| 4     | ✅           | ✅   | ✅       | —          | —            | —        | 留白 diff                   |
| 5a-5d | ✅           | ✅   | —        | —          | —            | —        | —                           |
| 5e    | ✅           | ✅   | —        | —          | —            | ✅       | —                           |
| 5f    | ✅           | ✅   | —        | —          | —            | —        | 演示 e2e                    |
| 6     | ✅           | ✅   | —        | —          | ✅           | —        | —                           |

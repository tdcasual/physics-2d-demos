# 布局系统 × 实验模式 架构重构清单（v3 · 定稿）

> 来源：2026-09-21 双 agent 架构审计 + Grok 交叉审计两轮（第 1 轮核实证据/纠优先级，第 2 轮复核并指出 8 处方案漏洞，本版已全部修补）。
> 状态：**历史审计快照（2026-09-21）**。2026-09-27 v10 实施后的活债务见 `docs/debt-ledger.md`。
> 术语：本文"容器"一律指 SceneContainer；Linux 截图环境称"截图容器"。
>
> **v10 映射（2026-09-27）**
>
> | 本清单项                         | 状态                                                                                                                                                                                                                                                                                                |
> | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | P0-1 私有 class 挂载点           | 已清（v10）：`data-stage-frame` / `data-graph-section` / `data-stage-toolbar-host` 属性 + 契约测试；data-workspace 能力改语义属性查找                                                                                                                                                               |
> | P1-A 死代码与假契约              | 已清（2026-09-25 批次）                                                                                                                                                                                                                                                                             |
> | P1-B 场景反查布局内部 DOM        | 已清（v10 + v12 C6）：readout 集中 `readoutOccludesStage`； projectile-components / mechanical-energy 迁到 `[data-readout-slot]`（864d26e），`#mobile-panel-readout` / `.mobile-stack-layout` 零残留并入契约                                                                                        |
> | P1-C hasFloatingReadout 漂移副本 | **未动（19 处仍在）** → 裁定：转入 ledger B 区，冻结 19 项只缩不增（守卫待建，见 E4 收尾）                                                                                                                                                                                                          |
> | P1-D graphInitiallyHidden 定案   | 已清（v10）：`honorsGraphInitiallyHidden` 元数据 + mobile-stack 显式 false 带理由                                                                                                                                                                                                                   |
> | P1-E 工具条按钮认领链            | 已清：`buildStageToolbar` 收敛（src/ui/stage-toolbar.ts:36），三布局只传配置                                                                                                                                                                                                                        |
> | P2-A 搬家-还原 helper            | 已清：`src/ui/utils/node-mover.ts`（moveNode/MovedNode.restore），data-workspace 与 demo-profile 均已采用                                                                                                                                                                                           |
> | P2-B requestLayoutResize 收敛    | **部分**：四处已收敛（request-layout-resize.ts）；残留 `lab-stage.ts:196-198` 浮窗 onResize 裸 dispatch 绕过 suppress 闸门 → 列入小修待办                                                                                                                                                           |
> | P2-C 能力声明数组去重            | 已清：`buildBaseCapabilities`（capabilities/base-declarations.ts:26）+ 差异插入点                                                                                                                                                                                                                   |
> | P2-D setTheme 双写               | 已清：documentElement 写入收敛到 container.ts:647；残留观察 scene-adapter.ts:320（另记）                                                                                                                                                                                                            |
> | P2-E 过大文件拆分                | 进行中（v12 Wave E）：platform/data-workspace 1413→6 模块（0c4d773）；panel / ticker-tape view 在 E2/E3；scene-adapter / demo-profile / stage-panzoom 维持棘轮                                                                                                                                      |
> | P2-F 小项                        | 6 项中 4 项已清（selector 兜底 / 焦点恢复 data 属性 / enabledSteps 联合类型 / DESKTOP_DEMO_LAYOUTS→demoCapable 元数据）；**未动 2 项**：双 class（stage-toolbar/floating-controls）列入小修待办；lab-stage `mobile-tab-panel` 承重 class **显式保留**（CSS/矩阵/测试基建三方依赖，改动成本 > 收益） |

## 优先级定义

- **P0**：新增布局/场景时能力会挂错位置且**无告警**（静默失效）
- **P1**：现存行为分叉或误导性假契约
- **P2**：重复/过大文件，长期收益

---

## P0-1 能力层用布局私有 class 找挂载点，找不到静默兜底

**问题**：能力层 JS 用布局私有 class 枚举定位挂载点，第 5 个布局出现时工作区挂错父节点且静默 `container.appendChild` 兜底。

**证据**（两轮核实）：

- `capabilities/data-workspace.ts:84-86` stage-frame 选择器串；`:176-178` graph section 选择器串（对不上退回 `slots.graph`，mobile 正走此退路）；`:91` 静默兜底
- `demo-profile.ts:58` graphSel 默认含半截死选择器 `.layout-graph-section`（src/ 无赋值）；`:331,439,549` 用 `[class*="-readout-panel"]` 通配 + `:455-457` class 后缀反推 prefix 拼 `${prefix}-is-overlay`
- `stage-toolbar.ts:11-12,35-55` 工具条宿主三级 fallback 枚举布局内部结构
- `stage-panzoom.ts:23` `PAN_IGNORE_SELECTOR` 硬编码 `[data-double-slit-instruments]`

**方案（两轮修正后的最终版）**：

1. **新增三个挂载点属性，落点精确定义**（打错层 = 挂错位置）：
   - `data-stage-frame`：打在今天 `closest()` 命中的**外层 frame**（split/srgb 的 `*-stage-frame`、mobile 的 `.mobile-animation-section`、lab 的 `.lab-stage-anim`）。**不是** `slots.animation`（那是内层 stage-slot，打上去工作区会插进 frame 内部而非其后）
   - `data-graph-section`：打在今天**被搬走的那一层**（split/srgb 的 section、lab 的 `.lab-float-graph` 面板）。mobile 没有这层、今天退回收养 `slots.graph` 本身——mobile 不打此属性，在布局元数据里声明"收养目标 = slot 本身"（打在 tab panel 上会把整个 tabpanel 收养走）
   - `data-stage-toolbar-host`：各布局标在首选工具条宿主上，替代 stage-toolbar 的三级 class fallback
2. **契约测试**：每个已注册布局 mount 后必有 `data-stage-frame`；`data-graph-section` 仅当图 slot 存在时必有（`hasGraph:false` 场景不建图 DOM，不得被契约逼出假节点）；toolbar host 必有。缺标记测试红，不靠 console.warn；DOM 兜底保留
3. **共享 class 用到底的仅限已全布局覆盖者**：`.readout-panel`（demo-profile 读数查找改查它）和按钮 class（`.theme-toggle-btn` 等）。**`.graph-section` 不在此列**（lab/mobile 没有，铺开会带进 split 图区 CSS）——这正是要 `data-graph-section` 属性的原因
4. **panzoom 忽略拆两个标记**（合并会把双缝仪器上的滚轮缩放弄坏——`WHEEL_IGNORE_SELECTOR` 故意不含双缝属性，stage-panzoom.ts:31-34 注释即为此）：`data-panzoom-ignore`=平移+滚轮都让（控件自标，现状）；新增只挡平移的标记（如 `data-panzoom-pan-ignore`）给双缝仪器宿主，删除场景 id 特判
5. **CSS 分叉规则保留在 class 上**：`data-workspace.css` 按布局分叉的规则不是同一套（桌面 stage frame `flex:1 1 auto` 在 :446-450，mobile `height: var(--dw-h)` 在 :509-513；:288-294 是收养后定位、:396-421 是隐藏侧栏/读数/图区），本项只改 JS 查找点
6. `${prefix}-is-overlay` 前缀拼接是独立 CSS 债，不在本项

**影响面**：4 布局 mount、3 个能力文件 + stage-toolbar、契约测试、测试夹具（data-workspace-capability.spec.ts 用 class 搭 DOM）、e2e。

**前置依赖**：P1-D 先定案（收养节点 + mobile 语义），否则 graph 查找改两遍。

---

## P1-A 死代码与假契约（最低风险，批 1）

均已 grep 核实无生产消费方：

1. `CreateContainerOptions.defaultLayout`（types.ts:339；bootstrapper 传了 container 不读，真缺省在 scene-adapter.ts:68）→ 删字段+改 scene-bootstrapper.spec 断言
2. `CAPABILITY_SCOPES`/`getCapabilityScope`（capabilities/index.ts:186-201；且把 demo-profile 等标成 container 级与运行时相反）→ 删除，**不接 scope 语义**（orchestrator 设计就是切换即全部重建）
3. `SlotName` 的 `'data-workspace'`（types.ts:24,59）→ 删；**别误删** data-workspace-panel.ts:77 的 `dataset.slot='data-workspace'`（活标记）
4. `LayoutConfig.slots`/`__managedByContainer` → 删
5. `DataWorkspaceConfig.chartAnalysis`（Reserved，runtime `void cfg` 整体丢弃 config）→ 删；**别误删**活的 `DataWorkspaceSpec.chartAnalysis`
6. 偏好双写单读：删 `getDefaultLayoutId`（registry.ts:412-426）+ container.ts:557 的 `saveLayoutPreference` 写入，**连同** `saveLayoutPreference`/`LAYOUT_PREF_KEY`/`migrateLayoutPref` 死导出一起删，并改 scene-container.spec.ts / layout-registry.spec.ts 里对这把钥匙的断言（只删调用会留死导出）
7. **别误伤**：`layoutOverrides` 有生产读者（container.ts:498-515，chase-meet 在用）

验收：tsc + 单测。

---

## P1-B 场景 page 反查布局内部 DOM

**证据**：ticker-tape/page.ts:92-100（`#lab-panel-graph .lab-float-body`）；projectile-components/data-panel.ts:98-114,161-171 + page.ts:113-116（读数槽、`.lab-float-graph`）；mechanical-energy/data-panel.ts:87-104（mobile/srgb/teaching 读数槽）；double-slit/scene.entry.ts:461-463（用 `.mobile-animation-section` 写 `--dw-h`）。现成先例：`[data-lab-data-slot]`（lab-stage.ts:148）。

**方案**：

- 描点工具条类（ticker-tape）→ 锚点 = `[data-graph-section]` 的 body，或补 `data-chart-toolbar-anchor`
- **读数/数据宿主类（projectile/mechanical-energy）需要自己的锚点**（它们找的是读数槽和数据浮窗，不是 graph section）→ 复用/推广 `data-lab-data-slot` 式标记，不能塞进 `data-graph-section`
- 双缝 `--dw-h` 收口后**保持仅 mobile 写入**（CSS 只有 mobile 消费此变量）
- **不做** `CapabilityContext.getGraphToolbarMount()` 之类新 API（page 反向依赖 capability，违反分层）

验收：全量矩阵 + 工作区 e2e。

---

## P1-C 场景侧 `hasFloatingReadout` 漂移副本（19 处，P0-1 的下游）

**问题**：19 处副本（18 处 scene.sim.ts + 第 19 处在 `magnetic-mirror/scene.view.ts:115`），已漂移：多数只认 `.teaching-readout-panel, .srgb-readout-panel`；block-board/displacement-time 多认 `.readout-panel`；oscilloscope 另认 `.lab-stage-layout`+`.lab-float-data`；认不出默认 true。另有 scene.view.ts 里的面板像素测量选择器（block-board、single-slit、accel-force、vertical-circle、displacement-time、three-forces）也在迁移范围。**新增布局时静默画错留白的主战场。**

**方案**（两轮修正版）：

- 新属性名**不得**用 `data-readout-placement`（与 P0-1 第 6 点为 CSS 债预留的名字撞车，且值域不同：演示模式的 overlay/docked-top/docked-bottom 是另一回事，**演示模式不改这个属性**）
- 按今天短路语义，四布局取值：mobile = 不留白；split/srgb/lab = 留白（lab 靠默认 true，遮挡物是浮窗不是 readout-panel——别把 lab 标成 inline，画布留白会变）
- 静态布尔只能复刻"mobile=不留白，其余=留白"，**表示不了停靠位置**；oscilloscope 的像素来自浮窗测量，迁移时逐场景用单测钉住 overlay 像素
- 单独一批，放 P0-1 之后（避免两批同时改 DOM 约定）

验收：全量矩阵 + 场景单测。

---

## P1-D `graphInitiallyHidden` 语义定案（P0-1 前置）

**事实**（两轮核实）：`floatData`/`floatGraph` 是 `LabStageConfig extends LayoutConfig` 的接口重复声明（非两套存储）；lab-stage 只读 floatData/floatGraph（:137-138），`floatGraph===false` 时顺手写 `dataset.graphInitiallyHidden`（:160-163）——但 split 的 CSS（split-right.css:43）也读 `[data-graph-initially-hidden]` 放开控制区 max-height，lab 无 `.teaching-control-section` 故今天只影响矩阵。split-right:124 / srgb:183 读配置字段。mobile-stack 完全不读。

**定案**：

- `floatData` 保留（ticker-tape 要单独藏数据浮窗）
- lab-stage 可从 `graphInitiallyHidden` 推导图浮窗显隐，**不推导 collapsed**（lab 折叠默认开，≠hidden）
- **mobile-stack：显式声明忽略**（mobile 的图在 tab 里，默认不激活即不可见，语义天然成立），在类型/布局元数据里写明，**不改行为**——若未来改为吃此字段，必须同步写 `data-graph-initially-hidden` dataset，否则矩阵断言会错
- 收养节点定义（随本项写入布局元数据）：split/srgb=section、lab=`.lab-float-graph` 面板、mobile=slot 本身

---

## P1-E 工具条按钮认领链（与 P2-C 分 PR）

认领键是共享 class（`theme-toggle-btn`/`mode-toggle-btn`/`layout-switch-btn`），失败模式是多造一颗按钮而非能力消失。骨架三处：split-helpers.ts:132-168、lab-stage.ts:240-259、mobile-stack.ts:117-130（mobile 无 layout-switch）。**含快捷键链**：scene-adapter.ts:294-316 的 `l` 点 `.layout-switch-btn`、Esc 点 `.mode-toggle`（mobile 上 `l` 今天已空转）。

方案：共享 class 用到底；抽共享 `buildStageToolbar()` 消除三份骨架（**动视觉基线，Linux 基线必须走 `scripts/visual-linux-container.sh`，禁止宿主机 `--update-snapshots`**）。

---

## P2-A "搬家-还原"最小 helper

三份快照字段不同（data-workspace 存 node/parent/next/hidden/collapsed/inlineStyle；demo-profile 只存 parent/next/height 且**还原按 graphSel 重新 query**；chips 用 Map 不恢复 hidden/style）。只抽最小 `moveNode`/`restoreNode`（只管 parent/next）；**demo-profile 还原改用保存的节点**（现在选择器一改图就回不了家）；不做大一统 `adoptElement`。时机：P0-1 之后。

## P2-B `requestLayoutResize()` 收敛

rAF+dispatch 共四处：data-workspace.ts:94-98、demo-profile.ts:94-98、lab-stage.ts:348-350、sidebar-toggle.ts:132-134。（lab-stage.ts:171-173 是同步 dispatch 交给 makeResizable，不算。）语义保持：真实布局变化派 window resize，纯重绘走 requestStageRepaint。

## P2-C 布局能力声明数组去重（仅公共尾巴）

差异是真实的（srgb 横向 resizer+readout collapsed 写死、lab 无 readout/sidebar/resizer+sidebarSelector、mobile inline readout 等）。只抽公共尾巴。**注意 transport 不是真公共**：mobile 配置 `{}` 后由 mount 注入 `container: controlBar`（mobile-stack.ts:134-142），桌面是 `{mountSlot:'animation'}`——buildBaseCapabilities 若统一 transport，只能靠"有 container 就提前返回"碰巧不坏，不允许靠碰巧。

## P2-D `setTheme` 双写

container.ts:579 先写 documentElement，split-helpers.ts:215-218 / mobile-stack.ts:340-344 重复写。布局层去掉 document 写入安全（容器先写；切换/失败恢复路径 container.ts:387,481 直接调 layout.setTheme 时 document 主题已是当前值）。

## P2-E 过大文件拆分（带打包边界警告）

platform/data-workspace.ts 1134、data-workspace-panel.ts 999、scene-adapter.ts 736、demo-profile.ts 597、stage-panzoom.ts 504。
**`vite.config.ts:235-242` 用文件名前缀切 chunk**：platform 文件改名后对不上 `/src/platform/data-workspace.` 会掉进 `/src/platform/`→`core` chunk；面板文件会先命中 `/src/ui/`→`ui`（首页 chunk）。拆分必须同步改 manualChunks，验收含 `pnpm check:bundle`。保住 `data-workspace-declarations.ts` 不引引擎的边界。每文件独立 PR。

## P2-F 小项

- `selector.ts:63-65` 兜底 → 只在 `autoSelectable && satisfiesConstraints` 里按 priority 选；可行集空时，再在 `minWidth <= 视口` 的 autoSelectable 里选（mobile 只有 maxWidth 无 minWidth，"全局最小 minWidth"算法在宽屏会挑错）。现状四布局下兜底走不到，属防御性修补
- stage-toolbar.ts:58 / floating-controls.ts:28-29 双 class → 收敛单 class（潜伏分叉，demo-profile:255 只查 `.stage-floating-controls`）
- `lab-stage.ts:299` 浮窗 body 的 `mobile-tab-panel` 是**承重 class**（lab-stage.css:215-224 尺寸、`applyOpen` 切 `.active`、layout-matrix.spec.ts:60-63 的跳过条件都依赖它）——要换名必须同步改 CSS 和矩阵跳过条件，否则矩阵开始量一个被折叠的图
- container.ts:361-370 焦点恢复 className 拼选择器 → data 属性标记
- `enabledSteps` 四值 vs 面板两 tab → 文档澄清或收敛枚举
- **新增（Grok 第 2 轮漏项）**：`platform/demo-profile.ts` 的 `DESKTOP_DEMO_LAYOUTS` 硬编码布局名单（split/srgb/lab）——不在名单的布局，演示模式侧栏折叠/图过继/读数放大全部静默跳过 → 改为布局元数据声明 `demoCapable` 或纳入 layoutTestProfile

---

## 实施批次（定稿）

1. **批 1 · 死代码清理**（P1-A）。验收：tsc+单测
2. **批 2 · 语义定案 + 标记属性**（P1-D 先定 → P0-1 三属性+契约测试+panzoom 标记拆分+demo-profile 改查 `.readout-panel`）。验收：quality:core + 布局矩阵 960 + 工作区 e2e 22
3. **批 3 · page 反查收口**（P1-B，复用批 2 词汇；读数/数据宿主单独锚点）。验收：全量矩阵 + e2e
4. **批 4 · 场景侧 hasFloatingReadout**（P1-C，19 处逐场景迁移，单测钉像素）。验收：全量矩阵 + 场景单测
5. **批 5 · 去重**（P2-A / P2-B / P2-C / P2-D；P1-E 单独 PR，动视觉走截图容器基线流程）
6. **批 6 · 拆文件**（P2-E，每文件一个 PR，带 manualChunks 同步）。验收含 check:bundle
7. P2-F 随手带入相关批次

**验收分级**：P0-1/P1-B/P1-C/P1-D 全量；P1-A/P2-D 单测+tsc；P2-E 必含 check:bundle；涉像素一律 `scripts/visual-linux-container.sh`，禁止宿主机更新 `*-linux.png`。

---

## 全部做完后的剩余风险（Grok 第 2 轮结语，清单故意不动的地方）

1. **样式层仍按布局 class 分叉**：data-workspace.css / responsive-demo.css / readout-panel.css 继续枚举 teaching/srgb/lab/mobile；第 5 个布局的 JS 挂载可被契约测住，外观仍要手写整套 CSS 且无测试告警
2. **留白测量仍是场景私有**：P1-C 最多统一布尔，遮挡像素仍各自算；没有禁止旧选择器的检查，副本会再长出来
3. **场景 page 仍直接摸布局 DOM**（只是从 class 换成属性）；契约只锁挂载属性时，后续锚点会再变成口头约定
4. **manualChunks 仍是文件名点号匹配**：这轮同步改规则只保这轮，下次文件改名又会掉 chunk
5. **第 5 个布局的成本没降到"注册元数据"**：仍需新 DOM 构建、整份布局 CSS、能力数组差异项、演示名单、视觉基线。清单去掉的是"挂错了还不响"，不是布局私有结构本身

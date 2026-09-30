# v15 剩余债务清零总方案（2026-09-29，v15.1 修订版）

> 状态：Phase A-G 全部实施完成（2026-09-30）；**唯一遗留 = 容器 AA 渲染漂移锁定验证**，续作指南见 `docs/plans/2026-09-30-v15-execution-progress.md` §3。

> 前作：v13、v14（均已执行）。目标：台账 B 区无可清偿项。
> 本版已并入两轮交叉审计（Grok 5 阻塞 + Claude 27 项修订，结论收敛）的全部修订。
> 实施：Grok；验收：Kimi + Claude + Grok 三方（沿用 v13/v14 协议：提交态验收、变异检验、红绿对照、负载背景记录）。
> 永久在管不清偿（机制本身即终态）：B2、B3、B4（由 B19 覆盖）、B7（已接受）、B5/B5b/B10/B12-B15/B19。

## 0. 全局顺序（两审计方共识倒序，基线重生次数 3→1）

1. **Phase A：2b**（toBeCloseTo 容差，纯单测，零像素）
2. **Phase B：B23 棘轮**（纯新契约，零像素）
3. **Phase C：B11 第 1 批 = B9 四场景 + 试点**（先造金标 + 验证 autoPlay 阈值策略）
4. **Phase D：B9 拆分**（用第 3 步金标验零 diff）
5. **Phase E：B1 十六场景迁移**（分批；double-slit/emf-analogy 同批）
6. **Phase F：2a highDiff**（此时两场景已是迁移后代码，只重生 1 轮）
7. **Phase G：B11 其余 ~97 场景**（阈值策略经试点验证后铺开）
8. 收尾

**环境纪律（两审计方实测）**：本机负载下浏览器像素工作不可靠（load 36-48 时 Playwright 启动超时、quality:core 出现无关 5s 超时）。**一切像素工作走容器**（`scripts/visual-linux-container.sh`，冷启动 ~15min/轮）；门禁引用必须附负载背景；verify:scene/e2e 单独、低负载跑。

## Phase A：B20-2b toBeCloseTo 容差收紧

- **计数口径对齐**：冻结 regex 只见 21 处，括号平衡口径实为 **23**（漏 2 处多行：wedge.sim.spec.ts:50、ticker-tape-data-workspace.spec.ts:1810）。`tolerance-freeze.spec.ts` 的扫描同步改为括号平衡或补登记。
- **剔除假目标**：variable-work.view.spec.ts:239 是 `.not.toBeCloseTo`（收紧它反而放宽）。
- 逐处分类：数学严格 0 → `toBe(0)` 或高精度；浮点噪声 → 收紧到误差阶；**保留桶 ≥2 处**（maxwell mostProbable Δ7.93e-2、force-composition baseEnd.x Δ3.04e-1，物理近似无法收紧，保留并注释理由）。
- 每处改动跑该 spec 3 次确认不 flake。

验收：tolerance-freeze 条数按真实口径下降；quality:core 绿（附负载）。

## Phase B：B23 真棘轮

- **扫描单元 = 函数体（AST）**：名为 `contentBoxSize` / `sizeGraphCanvasToHost`（含 internal-energy/variable-work 内联形态）的函数体内对 `getBoundingClientRect` 的 CallExpression。不用文本扫描（误伤注释/mock/指针原点/core 回落）。
- **冻结 11 个场景**：B23 的 8（emf-internal-resistance、impulse-momentum、mechanical-energy、oscilloscope、potential-energy-graphs、rod-model、single-loop、internal-energy）+ B17 已审阅但代码仍在的 3（block-board、variable-work、accel-force），后者注释「已审阅，不修，禁止当新债」。
- **双向断言**：匹配集 === 冻结集（外加即红）；且集合内每个 id 必须仍能被扫描命中（防假冻结）。
- 撤销测试：集外新增同构函数 ⇒ 红。
- **不做**机械 readElementLayoutSize 替换（返回含 padding 的 border box；happy-dom 下 offset 恒 0 测不出）。
- 台账 B23 守卫列改指新契约，销 v14 终审 N1 机制缺口。

验收：契约红绿对照 + quality:core。

## Phase C：B11 第 1 批（B9 四场景 + 阈值策略试点）

**前置大坑（Claude §7.3，本方案最大未定义项）**：101 个 debt 场景中 **79 个 `autoPlay: true` 且零个在 `dynamicSceneIds`（冻结集合）**——直接移入 covered 会在标准 800/0.2 阈值下为自动播放场景造不稳定金标。本批同时是**阈值策略试点**。

步骤：

1. **阈值策略先行**：逐场景分类——
   - 确定性静态场景（无 autoPlay 或 autoPlay:false，无 Math.random）→ 标准阈值。
   - autoPlay 场景 → 加入 `dynamicSceneIds` 并**逐场景证明可冻结**（冻结 rAF 后像素稳定；emf-analogy 的 Math.random 粒子是反例——不可冻结的场景标出）。
   - 不可冻结场景 → 单独记录，走 Phase F 的统一口径（实测 P99 + 余量或场景改造）。
2. **本批对象**：B9 四场景（pendulum-period、potential-energy-graphs、multimeter-practice、rod-model——已核实无 Math.random/performance.now，确定性渲染）+ 2-3 个试点 autoPlay 场景验证冻结策略。
3. **流程**（每一步都不可省）：
   a. 改 `baseline-coverage.json`（covered += 批、debt -= 批、`screenshotSpecCount = 2 × covered.length`）+ 同步 `visual-baseline-coverage.spec.ts` 的 `101`/`38` 与 `visual-regression.spec.ts:73-76` 的硬编码；
   b. 容器 `update --grep '<desktop|mobile> <id>…'` 生成 Linux PNG；
   c. `git status` 检视：预期只有 2N 张新文件，出现既有 PNG 改动必须逐张解释或回滚；
   d. **截图审阅**（desktop+mobile 两张/场景：遮挡/溢出/空画布/字体异常）；
   e. push（允许缺 Darwin 的红窗口，`hasAuthoritativePair` 在本地 core 红）；
   f. Darwin workflow dispatch（**先给 workflow 加 `inputs.grep`**）→ 下载 artifact → 提交 darwin PNG；
   g. 容器**无 grep** 全量 verify（计数断言 + canary）。
4. 试点结论写回方案（autoPlay 场景在标准阈值 + 冻结下是否稳定）。

验收：本批 4×4 + 试点场景 PNG 入库；容器全量 verify 绿；审阅记录；三方验收。

## Phase D：B9 四场景 view 拆分

- 对象：pendulum-period（1091）/ potential-energy-graphs（1078）/ multimeter-practice（1019）/ rod-model（1006）。**纯代码移动，零像素变化**（金标已在 Phase C 备好）。
- 形态对齐 v12 E3 ticker-tape：`scene.view.ts` 主文件 + `renderer/` 子模块；**禁止模块顶层读 window/canvas**；import 顺序不得改变绘制调用序列（happy-dom 单测锁「绘制调用序列等价」，定位写清：不是像素等价，像素等价由容器零 diff 证明）。
- **新模块 ≤800 行**（WATCHLIST 已满 19 条，落 (800,1000] 会红）；GRANDFATHERED 四条随拆分删除。
- rod-model 的 6 处 toBeCloseTo 已在 Phase A 处理，不在本 Phase 重复。
- 拆分后容器对该 4 场景 grep verify：**desktop + mobile 均零 diff**。

验收：GRANDFATHERED 删除、新模块 ≤800、场景 view 单测绿、容器零 diff、core 绿。

## Phase E：B1 十六场景裸数字迁移

**关键事实（两审计方实测）**：

- 桌面 1440×900 split-right 舞台 `responsiveScale` = **1.5（clamp 上限）**，不是 0.8-1.0 ⇒ 「desktop 像素不变」不可达，政策改为**双视口基线均重生 + 双视口审阅**。
- **以桌面为锚、向移动端收缩**：`newBase = 当前绘制 px / desktopScale（实测，多为 1.5）`，写 `newBase * scale`——桌面取值≈原值，移动端才体现缩小。禁止 `旧字面量 * scale` 机械迁移（桌面会放大 50%）。
- **8/16 场景零违规**（doppler-effect、field-lines、ganshe、interference-formula、micrometer、projectile、thin-film、vernier-caliper、wedge——按 Claude 的棘轮命中统计），这些只需从豁免表删 id + 确认无漏网（含扁平 render 文件：micrometer-render.ts 有 font-weight 700/400 误报，已知误报类见下）。**有违规的 7 个**：chase-meet 25、double-slit 27、spring-oscillator 16、electrification 6、vt-integral 4、mechanical-wave 3、emf-analogy 2（chase-meet 另有 draw-fallback.ts +1）。
- **参考措辞**：`resolveVisuals` 仅 chase-meet 有（且它一场景内并存两套 scale 系统，不能当范式）；projectile 是内联 `Math.min(width/800, height/600)`。
- **已知误报类**（不要为消误报改坏代码）：`.max(80, 130*s)` 型下限（s 不匹配扫描 regex）、spring-oscillator 的 margin 阈值 250/350、micrometer font-weight、chase-meet `rect.width || 1280`、double-slit 60×60 草稿画布与 382×155 缓存。

**批次**（按违规数配平，double-slit 与 emf-analogy 必须同批以与 Phase F 共用一轮基线）：

- 批 1：chase-meet（25）+ vt-integral（4）+ projectile（0）+ wedge（0）
- 批 2：double-slit（27）+ emf-analogy（2）+ thin-film（0）+ interference-formula（0）
- 批 3：spring-oscillator（16）+ electrification（6）+ field-lines（0）+ doppler-effect（0）
- 批 4：mechanical-wave（3）+ ganshe（0）+ micrometer（0）+ vernier-caliper（0）

每批流程：迁移 → 该场景相关单测串行 → `LARGE_RENDER_LITERAL_EXEMPT` 摘 id + size 断言 -4 → 容器 `update --grep` 该批 8 张 → 双视口审阅（重点：桌面构图是否被放大破坏）→ git status 检视 → Darwin dispatch（grep）→ 提交 → 三方验收。批末 core（单独低负载）。

## Phase F：B20-2a highDiff 拆分决策

**两场景拆开决策**（Claude §3.2/3.3 实证）：

- **double-slit**：动画走 scene-shell rAF（`time += dt*12`），无 transport 控件、无 autoRun 键 ⇒ 暂停路径 = Space 快捷键（keyboard-shortcuts 已注册）或 page.evaluate 调 scene API。**把 pause/冻结移到 remainder 之前**（现在 freeze 在 1200ms remainder 之后，相位已漂）。钉相位后试标准 800/0.2。
- **emf-analogy**：不确定性来自 `createWaterParticle` 的 **4 处 Math.random()**（粒子初始化进模块级 pool），冻结/暂停**都无效** ⇒ 修法只有：注入式 PRNG / 固定 seed（改场景，推荐——确定性渲染是基线前提），或负载受控环境实测 P99 + 余量（脚本与原始数据入 artifacts/）。
- **必改文件同步**：`tolerance-freeze.spec.ts`（highDiff regex、HIGH_DIFF_MAX_PIXELS 3000 / THRESHOLD 0.3 / CEILING 2）。
- `extraWait` 把 chase-meet 与 highDiff 绑在一起（:97），动 remainder 时不得误伤 chase-meet。

验收：highDiff 分支删除或收窄（emf 先单测 800/0.2）；基线只重生 1 轮（linux grep + darwin grep）；容器全量 verify；tolerance-freeze 更新。

## Phase G：B11 其余场景（~97）

阈值策略经 Phase C 试点验证后铺开，约 10 批 × ~10 场景，每批流程同 Phase C 步骤 3（JSON+硬编码 → linux grep update → git status 检视 → 审阅 → push → darwin grep dispatch → 提交 → 每 2-3 批一次无 grep 全量 verify）。批次从真实 legacyDebtSceneIds 取（**不用 field-lines 举例**——它是 covered+dynamic 的反面教材）。容器 update+verify 合并为同一次容器调用省轮次（若脚本支持，否则合并到同一次冷启动内串行）。

## 收尾

- 台账 B 区大扫除：B20/B1/B9/B11/B23 移入已清记录；B 区只剩永久机制项。
- 全量门禁：quality:core（低负载单独）+ e2e（低负载单独）+ 容器全量 verify；Darwin 侧以「PNG 已提交且 workflow 跑过 visual-regression」为准（CI 从不跑 Darwin 像素，ci.yml 仅 ubuntu）。
- 终验：double-slit + chase-meet 真实浏览器脚本全过（**单独跑**，不与 core/e2e/容器并行；脚本实为 14 项断言，同步修正 v13 checklist 的「13 项」措辞与勾选）。
- AGENTS.md 相关段落同步（豁免表清零、B9 条目消失、阈值策略说明等）。

## 明确不做

- 不改 B2/B3 等永久机制；不新增 runtime 依赖。
- B11 只审渲染质量（遮挡/溢出/空画布/字体），不做 101 场景教学内容审查。
- 不用 CI `update_snapshots: true` 做分批（全量容器 update 会重写既有基线）。
- 不做无 grep 的 Darwin / 容器 update（会重写既有金标；每批后 git status 强制检视）。

# v16 工程强化方案：控件 / 组件 / 演示类与实验类基础设施（2026-10-25）

> 状态：🚧 执行中（2026-10-25 起，分支 `v16-engineering-hardening`）。
>
> 依据：2026-10-24 ~ 10-25 三轮审计（项目审计 → 架构审计 → 工程性分析）的实测数据，
> 以及同期已落地、尚未提交的 v15.5 改造（见 §1）。文中所有数字均为 2026-10-25 在
> 工作区实测，复核方式写在各条目里。
>
> 范围：控件与组件层、演示类场景基础设施、实验类场景基础设施、配套工程手段。
> **不在范围**：视觉基线重生（用户裁定暂缓）。会改像素的工作统一归入 §8 Wave P，
> 等基线窗口开启后再做；Wave R/I/C/E/D 均按「不改像素」设计，个别例外在条目中标明。

---

## 0. 原则

1. **运行时契约优先于源码正则**。新约束一律写成「用真实 sim / page 跑一遍再断言」的
   契约（参照 `control-codec-contract`、`remount-projection-contract`）；不再新增按
   源码文本推断行为的测试。
2. **共享实现 + 只降棘轮**。每抽出一个共享零件，同时登记一条「本地实现数只许减少」的
   棘轮（参照 `shared-helper-ratchet`、`page-glue-ratchet`），新场景从第一天就用共享件。
3. **先建零件、再试点、后批量**。每个 Wave 都是：平台 API + 单测 → 1~2 个试点场景
   （人工改、浏览器验证）→ 脚本批量迁移（迁移前做等价性检查，不满足条件的页面跳过
   并列出原因）→ 下调棘轮。
4. **不改像素**（Wave P 除外）。会改变截图的改动必须在条目里标注「像素影响」，并推迟
   到 Wave P。
5. **每个 Wave 独立提交串**，任一 Wave 失败不阻塞已绿 Wave；每个 Wave 结束跑完整
   `pnpm quality:core` + 全量 E2E（本地约 5 分钟）。
6. **不引入新 runtime 依赖**。统计、格式化、交互全部自研小模块。
7. **分层不变**：`core` 无上层依赖；`platform` 不依赖 app/ui/scenes；场景非 page 文件
   不依赖 app/ui。新增模块按 §10 落位。

---

## 1. 现状基线（v15.5，已落地、未提交）

| 项          | 状态                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 依赖漏洞    | vite 7.3.7 / happy-dom 21.0.4 / vitest 4.1.12，`pnpm audit` 清零                                                                                       |
| URL 参数    | 数值严格解析（丢弃 NaN / Infinity / 十六进制），极值契约 `scene-url-extreme-params`                                                                    |
| 控件 ↔ 参数 | schema 字段 `bind: { param, scale, values, numeric }` + `visibleWhen`；URL / meta 恒为参数单位；布尔写 1/0；枚举 URL 值只收 schema 选项                |
| 绑定式控件  | `createBoundControls`（`ui/components/bound-controls.ts`），56 页已迁移；`resetSceneAndControls`（`app/control-projection.ts`）                        |
| 运行时契约  | `control-codec-contract`、`remount-projection-contract`（替换 3 个正则契约，-924 行）                                                                  |
| 共享零件    | `core/coerce.ts`、`core/draw-primitives.drawText`、`scenes/stage-fit.ts`（含 `fitStage` / `measureStageLayout`）、`platform/data-workspace/grading.ts` |
| 棘轮        | `shared-helper-ratchet`、`page-glue-ratchet`（renderSchema 62 / applyParam 43 / syncFromScene 20）                                                     |
| 错误处理    | 帧循环异常自动暂停 + 舞台提示；场景加载失败显示提示                                                                                                    |
| 质量        | 单测 8564 通过；覆盖率 语句 89.33% / 分支 75.58%；E2E 546/546；共享 JS 129.89 kB / 162 kB                                                              |

**提交建议（Wave 0，执行本方案前完成）**：把工作区按三轮拆成 6 个提交——
① 依赖与工具链（package.json、lockfile、CI、容器脚本）；② URL 解析 + 存储容错 + CSP + 测试页；
③ 场景助手去重（coerce / drawText / stage-fit）；④ 参数绑定 + 绑定式控件 + 页面迁移；
⑤ 评分规则 + 课程表去重 + stage-fit 包装；⑥ 契约替换 + 文档归档 + 文档更新。
每个提交独立跑 `pnpm quality:core`。

---

## 2. 问题清单

| ID       | 问题                                 | 证据（复核方式）                                                                                                                                                                                                                                             | 影响                                 | 归属                          |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------- |
| **P1-1** | 读数显示 `-0.00` / `-0.0`            | 运行时探针：每场景 step 600 帧扫描 `getReadoutItems()`；alternating-electric-field「位置 x = -0.0 mm」、harmonic-wave「P 位移 = -0.0 cm」、wave-superpose 三项 `-0.00 m`                                                                                     | 学生可见错误                         | Wave R                        |
| **P1-2** | 可拖拽对象无键盘操作                 | 21 个场景注册 `pointerdown/move`；含 `keydown` 处理的 0 个（`grep -rlE "addEventListener\('pointer(down\|move)"`）                                                                                                                                           | 无障碍硬伤（WCAG 2.1.1）             | Wave I                        |
| **P1-3** | 拖拽未捕获指针 / 平板滚页            | 21 个中 9 个无 `setPointerCapture`；只有 3 处设置 `touch-action`                                                                                                                                                                                             | 拖出画布即断；iPad 上拖拽滚动页面    | Wave I                        |
| P2-1     | 拖拽坐标多用 `getBoundingClientRect` | 21 个中 16 个直接用 GBCR 换算；AGENTS「舞台缩放坐标纪律」禁止                                                                                                                                                                                                | 舞台被缩放（数据工作区）时偏移       | Wave I                        |
| P2-2     | 读数格式化各写各的                   | 118 个 entry 共 484 处 `toFixed`；`ReadoutItem` 已支持 `value: number` + `unit` 但无精度字段                                                                                                                                                                 | 有效数字、单位、负零无统一策略       | Wave R                        |
| P2-3     | 数据记录无中间层                     | 只有 3 个场景用数据工作区；accel-force、emf-internal-resistance、lightbulb-iv-curve、half-deflection 在 sim 里自存 records，在画布上自画表；mechanical-energy、projectile-components 手写 DOM 数据面板                                                       | 每个记录类场景重造表格 / 删除 / 导出 | Wave E                        |
| P2-4     | 拟合算法重复                         | 最小二乘至少 3 份：ticker-tape（`fitLine` / `fitQuadratic` / `fitLineDroppingOutliers`）、emf-internal-resistance（协方差 / 方差）、projectile-data-analysis（`fitTrajectory`）                                                                              | 精度与边界处理不一致                 | Wave E                        |
| P2-5     | 数据工作区宿主样板                   | 每个实验约 100 行会话管线（ticker-tape 115 / projectile-data-analysis 101 / double-slit 96）；`platform/data-workspace/host.ts` 的选项按 ticker-tape 与 double-slit 两个消费者量身定做                                                                       | 新增实验成本高                       | Wave E                        |
| P2-6     | 步骤流程手写                         | 18 个场景有 step / mode / scene 子流程；double-slit 按步骤切 schema；9 个页面仍手写显隐                                                                                                                                                                      | 流程类逻辑散落                       | Wave C / E                    |
| P2-7     | 按钮动作需手写 `onAction`            | schema 中 button / button-grid 共 83 个                                                                                                                                                                                                                      | 页面胶水                             | Wave C                        |
| P2-8     | 组件缺测试与样式变量                 | 12 个控件组件中仅 `scene-controls.ts` 有单测；`ui/` 内联样式 102 处、布局层 131 处；滑块无 `aria-valuetext`（单位不播报）                                                                                                                                    | 回归风险、主题与演示模式难统一       | Wave C                        |
| P2-9     | 物理层碰 DOM / 不确定                | 7 个 `scene.sim.ts` 访问 DOM（bullet-block、block-board、displacement-time、force-composition、doppler-effect、oscilloscope、parallelogram-rule）；`Math.random` 在 field-lines、spring-oscillator、ganshe 等；spring-oscillator 的 sim 读 `performance.now` | sim 不可单测 / 截图不稳定            | Wave D                        |
| P3-1     | 配色无语义变量                       | 103 个场景自带调色板；场景内 2963 个色值、1100 种；「力」4 种颜色、「速度」6 种绿；`isDark` 分支 398 处                                                                                                                                                      | 教学一致性差；暗色维护成本高         | Wave P（改像素）              |
| P3-2     | 绘图零件重复                         | 73 个场景有本地 arrow / drawArrow；本地坐标轴 / 图表函数 59 个；`core/chart` 仅 2 个场景使用                                                                                                                                                                 | 维护成本                             | Wave D（API）+ Wave P（迁移） |
| P3-3     | 页面胶水仍有 62 页                   | `page-glue-ratchet` 计数                                                                                                                                                                                                                                     | 维护成本                             | Wave C                        |
| P3-4     | 部署不受 CI 约束                     | 推送 main 即自动上线，部署在仓库外                                                                                                                                                                                                                           | 回归可直接上线                       | Wave Q                        |

---

## 3. Wave R：结构化读数（修 P1-1、P2-2）

**目标**：读数成为结构化数据，由平台统一格式化；`-0.00`、`NaN`、缺单位在契约里变红。
**像素影响**：仅 3 个 P1-1 场景的读数文字（负零变零）；读数面板默认折叠的场景截图不变。可在本 Wave 做，基线差异集中在这 3 个场景。

### R1 读数类型扩展（`app/layouts/types.ts`）

```ts
export interface ReadoutItem {
  key?: string;
  label: string;
  /** number 时由平台格式化；string 视为已格式化（迁移期兼容） */
  value: string | number;
  unit?: string;
  /** 二选一：固定小数位 / 有效数字。缺省：digits = 2 */
  digits?: number;
  sigFigs?: number;
  /** 绝对值小于该阈值显示 0（默认 0.5 × 10^-digits），消负零与抖动 */
  zeroBelow?: number;
  /** 需要符号时（如位移方向）显示 + 号 */
  signed?: boolean;
  layout?: 'half' | 'full';
}
```

### R2 格式化器（新建 `platform/readout-format.ts`）

```ts
export function formatReadoutValue(item: ReadoutItem): string;
// 规则：非有限数 → '—'；|v| < zeroBelow → 0（无负号）；digits / sigFigs 二选一；
// signed 时正数加 '+'；单位以窄空格连接；返回不含 label 的值文本。
```

- 读数面板（`capabilities/readout-panel.ts`）与演示模式过滤（`scene-adapter/readout-filter.ts`）统一调用。
- 单测：负零、NaN、Infinity、sigFigs 进位（9.995 → 10.0）、signed、单位拼接。

### R3 场景迁移（脚本 + 人工复核）

1. 脚本识别 entry 中 `value: \`${<expr>.toFixed(<n>)} <unit>\``与`value: <expr>.toFixed(<n>)`两种形态，
改写为`{ value: <expr>, digits: <n>, unit: '<unit>' }`。
2. 形态不匹配的（拼接多个值、带中文说明、条件文本）保留字符串，登记到棘轮。
3. 先人工迁移 P1-1 的 3 个场景并浏览器验证，再批量。

### R4 契约

- `tests/contract/readout-format-contract.spec.ts`（运行时）：每个场景 init 后 step 600 帧，
  每 20 帧取一次读数，断言格式化后的文本不含 `-0` 形式、`NaN`、`Infinity`、`undefined`。
- `readout-string-ratchet`：仍返回预格式化字符串的读数项数量只许减少。

### R5 验收

- P1-1 三个场景默认播放无负零；契约绿；棘轮登记；全量 E2E 绿。
- AGENTS.md 增加「读数返回数值 + 精度，不要自己 toFixed」。

**工作量**：M（平台 1 天，脚本迁移 + 复核 2 天）。

---

## 4. Wave I：舞台交互零件（修 P1-2、P1-3、P2-1）

**目标**：所有可拖拽对象用同一套交互零件，自动具备指针捕获、缩放安全坐标、触屏、
键盘操作与读屏标签。
**像素影响**：无（焦点框只在键盘聚焦时出现，截图测试不聚焦）。

### I1 API（新建 `platform/input/stage-interaction.ts`）

```ts
export type StageTarget = {
  id: string;
  /** 读屏名称，如「小球 A」 */
  label: string;
  /** 逻辑坐标命中测试 */
  hitTest(p: { x: number; y: number }): boolean;
  /** 拖拽：逻辑坐标；返回实际落点（可被约束） */
  onDrag(p: { x: number; y: number }, phase: 'start' | 'move' | 'end'): void;
  /** 键盘步进（逻辑单位）；缺省 1% 画布 */
  keyStep?: number;
  /** 键盘方向键：缺省二维；'x' / 'y' 限制单轴 */
  axis?: 'xy' | 'x' | 'y';
  /** 当前位置描述，供 aria-live 播报，如「x = 1.20 m」 */
  describe(): string;
};

export function createStageInteraction(options: {
  canvas: HTMLCanvasElement;
  /** CSS 局部坐标 → 逻辑坐标（scene 提供，通常基于 fitStage 的 pose） */
  toLogical(local: { x: number; y: number }): { x: number; y: number };
  targets: () => readonly StageTarget[];
  onChange?: () => void;
}): { dispose(): void; focusTarget(id: string): void };
```

实现要点：

- 指针：`pointerdown` 命中后 `setPointerCapture`；局部坐标用 `event.offsetX/offsetY`，
  移动量经 `localPointerDelta`（免疫舞台缩放），不使用 `getBoundingClientRect` 算比例。
- 触屏：拖拽期间 `canvas.style.touchAction = 'none'`，结束恢复；空白处不拦截，保持页面可滚动。
- 键盘：canvas `tabindex=0`、`role="application"`、`aria-roledescription="可拖拽舞台"`；
  Tab / Shift+Tab 在 targets 间切换（到边界时放行到页面），方向键按 `keyStep` 移动，
  Shift 加速 ×10，Home/End 跳到约束边界（若 onDrag 有约束）；Esc 取消当前拖拽。
- 读屏：隐藏的 `aria-live="polite"` 节点播报「{label}：{describe()}」。
- 焦点可视：通过 `onChange` 让 view 画焦点环（view 读 `interaction.focusedId`）。

### I2 迁移（21 个场景，三批）

| 批                         | 场景                                                                                                                        | 现状                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| I2-a（已用局部换算，最易） | dynamic-circle、force-composition、multimeter-practice、single-slit、three-forces、ticker-tape、vertical-circle             | 有 `localPointerDelta` / `pointerToBaseNorm` |
| I2-b（有捕获、用 GBCR）    | doppler-effect、electrostatic-shielding、field-lines、harmonic-wave、impulse-momentum、potential-energy-graphs、vt-integral | 改坐标换算                                   |
| I2-c（无捕获）             | conveyor-belt、friction-critical、ganshe、mechanical-wave、molecular-potential、spring-oscillator、thin-film                | 补捕获 + 换算                                |

每个场景：把 pointer 监听替换为 `createStageInteraction`，targets 来自原命中测试，
`describe()` 复用读数格式化（Wave R）。

### I3 契约与测试

- `stage-interaction-ratchet`：场景内直接 `addEventListener('pointer…')` 的文件数只许减少（21 → 0）。
- 运行时契约 `stage-keyboard-contract`：对登记了 targets 的场景，聚焦 canvas、按 Tab
  与方向键，断言 sim 参数 / 状态发生变化、`aria-live` 有播报。
- E2E：新增 `tests/e2e/stage-keyboard.spec.ts`，覆盖 3 个代表场景（一维、二维、受约束）。

### I4 验收

- 21 个场景全部可键盘操作；iPad 模拟（Playwright `hasTouch`）拖拽时页面不滚动；
  舞台缩放 2× 时拖拽不偏移（数据工作区场景 ticker-tape 验证）。

**工作量**：L（API 2 天；迁移 21 场景约 4 天；契约 1 天）。

---

## 5. Wave C：控件与组件（修 P2-6、P2-7、P2-8、P3-3）

**像素影响**：C4 改内联样式为 class 时须逐项保证计算样式一致（用 computed-style 快照
单测兜底）；其余无。

### C1 按钮动作声明

schema `button` / `button-grid` 按钮增加 `bind: { action: 'fireBeam' }`；`createBoundControls`
对未拦截的动作键调用 `scene[action]()`（存在性检查，缺失时控制台报错并在开发态抛出）。
`reset` 动作内置为 `resetSceneAndControls`。迁移 83 个按钮中「单纯调用场景方法」的部分；
契约：声明的 action 必须是场景实例上的函数（运行时检查）。

### C2 显隐迁移

9 个手写显隐页面改 `visibleWhen`：double-slit、force-composition、internal-energy、
mechanical-energy、metal-rod-track、three-forces、ticker-tape、dynamic-circle、variable-work。
（double-slit 的按步骤切 schema 留到 E4。）新增 `disabledWhen`（同语法，设 `disabled` 与
`aria-disabled`），供「运行中不可调」类需求使用。

### C3 组件测试与无障碍

为 12 个控件组件各补单测：渲染、键盘操作（方向键 / 空格 / 回车）、静默写入不派发事件、
`hidden` 与 `disabled` 生效、dispose 清理监听。滑块补 `aria-valuetext`（值 + 单位，复用
Wave R 格式化器）。新增 axe 规则检查控件面板（已有 `@axe-core/playwright`）。

### C4 样式收口

`ui/` 102 处、布局层 131 处内联样式迁到 `src/styles/` 的 class（使用设计变量）。
单测对迁移前后的关键元素做 `getComputedStyle` 快照比对。棘轮：内联 `style.` 赋值数只降。

### C5 页面胶水继续迁移（62 页）

按 `page-glue-ratchet` 分类分批：

- 「createControls 内有额外语句」45 页：逐页人工，额外语句多为预设表、数据面板挂载、
  画布监听，分别迁到 schema（预设）、Wave E（数据面板）、Wave I（交互）后再改绑定式；
- 改名类 3 页（electric-pendulum、pendulum-period、semicylinder-tir-standard）：补 `bind.param`；
- 枚举解码类（air-track-momentum、connected-bodies-incline、electrostatic-induction、
  multimeter-practice 等）：补 `bind.values` 后迁移。
  每批下调棘轮；目标 62 → ≤ 10（留给 chase-meet、spring-oscillator、single-loop 等真特殊形态）。

### C6 控件展示页（开发用）

在 `DEV_ONLY_PAGES` 增加 `controls-gallery`：渲染全部字段类型的所有状态（亮 / 暗 / 演示模式），
供人工检查与本地截图。

**工作量**：L（C1 1 天、C2 1 天、C3 3 天、C4 3 天、C5 5 天、C6 1 天）。

---

## 6. Wave E：实验类基础设施（修 P2-3、P2-4、P2-5、P2-6）

目标是补齐「读数」与「完整数据工作区」之间的中间层，并让完整工作区可声明式定义。

```
读数（所有场景）
  └─ 测量记录 MeasurementLog（E2，记录类场景）
       └─ 数据工作区 defineExperiment（E3，学生填数 + 评分 + 图像分析）
            └─ 实验步骤 steps（E4，流程引导）
统计 core/stats（E1）横跨三层；仪器读数（E5）流入记录与工作区
```

### E1 统计模块（新建 `core/stats.ts`）

```ts
export type LinearFit = { slope: number; intercept: number; r2: number;
  slopeStdErr: number; interceptStdErr: number; n: number };
export function linearFit(points: readonly { x: number; y: number }[]): LinearFit | null;
export function linearFitThroughOrigin(points): { slope: number; r2: number } | null;
export function quadraticFit(points): { a: number; b: number; c: number; r2: number } | null;
export function fitDroppingOutliers(points, opts: { maxDrop: number; threshold: number }): …;
export function mean(values), stdDev(values), standardError(values);
```

- 数值稳定：中心化后再算（避免大坐标下的抵消误差）；点数不足、方差为 0 返回 null。
- 单测：解析值对照、退化输入、与 ticker-tape 现有实现逐点对比。
- 迁移：ticker-tape、emf-internal-resistance、projectile-data-analysis；棘轮登记本地拟合实现数。

### E2 测量记录（新建 `platform/measurement-log.ts` + `ui/components/measurement-table.ts`）

```ts
export type MeasurementColumn = {
  key: string;
  label: string;
  unit?: string;
  digits?: number;
  sigFigs?: number;
};
export type MeasurementLog = {
  columns: readonly MeasurementColumn[];
  rows(): readonly Record<string, number>[];
  record(row: Record<string, number>): void; // 场景在「记录」动作中调用
  remove(index: number): void;
  clear(): void;
  toCsv(): string;
  subscribe(listener: () => void): () => void;
};
export function createMeasurementLog(
  columns,
  opts?: { maxRows?: number }
): MeasurementLog;
```

- 表格组件挂在读数槽（`data-readout-slot`）或图表槽，带删除、清空、复制 CSV；
  数值格式复用 Wave R 格式化器。
- 页面布局：`layoutConfig.measurementLog: true` 时由能力层挂载（与 dataWorkspace 同模式，惰性加载）。
- 迁移试点：emf-internal-resistance、lightbulb-iv-curve；随后 accel-force、half-deflection、
  mechanical-energy、projectile-components（后两者替换手写 DOM 数据面板）。
- **像素影响**：在画布上自画表格的场景（accel-force、emf、half-deflection）改为 DOM 表格会改像素
  → 这三个场景的表格迁移放 Wave P；本 Wave 只把数据模型换成 MeasurementLog，画法暂不变。

### E3 声明式实验 `defineExperiment`（新建 `platform/data-workspace/define-experiment.ts`）

```ts
export function defineExperiment<TState>(def: {
  /** 按场景状态选表格规格（如有无抛出点） */
  spec(state: TState): DataWorkspaceSpec;
  eligibility(state: TState): DataWorkspaceEligibility;
  knowns(state: TState): DataWorkspaceKnown[];
  hint(state: TState, spec: DataWorkspaceSpec): string;
  /** 每个字段的评分规则：返回 GradeRule（或自定义 FieldFeedback） */
  fields: Record<
    string,
    (ctx: FieldContext<TState>) => GradeRule | FieldFeedback
  >;
  /** 每次会话变化后的整理（如固定原点行） */
  normalize?(
    session: DataWorkspaceSession,
    spec: DataWorkspaceSpec
  ): DataWorkspaceSession;
  result?(session: DataWorkspaceSession, state: TState): string | null;
}): (source: { getState(): TState }) => DataWorkspaceHost;
```

- 平台生成会话持有、clone / freeze、增删行、草稿、失效传播（复用 `dependsOn`）、
  spec 切换时重建会话等全部样板；字段评分走 `gradeNumber`。
- `FieldContext` 提供：当前 trial、已校对的同行 / 汇总字段值、`rangeOf` 等。
- 迁移：projectile-data-analysis（最简单）→ ticker-tape（端点占位、有效位数设置）→
  double-slit（仪器读数、步骤；最后做）。迁移后删除 `host.ts` 中按两个场景定制的效果开关。
- 契约：现有三个实验的数据工作区单测 / E2E（`ticker-tape-data-workspace.spec.ts`、
  `double-slit-data-workspace.spec.ts`）全绿即等价。

### E4 实验步骤

schema 顶层增加：

```ts
steps?: Array<{ id: string; title: string; /** 完成条件：场景状态谓词 */ done?: (params) => boolean }>;
```

- `step` 作为普通参数进 URL；字段 / section 用 `visibleWhen: { step: [...] }` 声明归属；
- 控制面板顶部渲染步骤条（当前 / 已完成 / 可跳转），键盘可操作；
- 试点 thin-film、wedge（结构简单）→ double-slit（替换按步骤切 schema）。

### E5 仪器读数通道

约定仪器组件输出 `MeasurementSnapshot`（已在 data-workspace 类型中），统一流向
MeasurementLog 与数据工作区的「从仪器填入」；vernier-caliper、micrometer 场景与
3 个仪器组件对齐同一接口。先出接口与适配器，不改仪器渲染。

### E6 场景类型声明

`SceneMeta` 增加 `kind: 'demo' | 'experiment'` 与 `capabilities: { measurementLog?, dataWorkspace?,
interaction?, graph? }`；脚手架按 kind 生成不同模板（实验模板带 `defineExperiment` 骨架）；
测试矩阵按能力分流（如只对有 interaction 的场景跑键盘契约）。

**工作量**：XL（E1 1 天、E2 3 天、E3 4 天、E4 3 天、E5 2 天、E6 1 天）。

---

## 7. Wave D：演示类基础设施（不改像素部分，修 P2-9、P3-2 的 API 侧）

### D1 物理层去 DOM

7 个访问 DOM 的 sim（bullet-block、block-board、displacement-time、force-composition、
doppler-effect、oscilloscope、parallelogram-rule）把布局测量移到 view / entry，sim 只收数值
（如 `stageLayout` 作为参数传入）。契约：`scene.sim.ts` 不得出现 `document.` / `window.` /
`HTMLElement` / `getBoundingClientRect`（运行时可在 node 环境 import 所有 sim 验证）。

### D2 确定性

新增 `core/random.ts`（mulberry32，emf-analogy 已有先例），field-lines、spring-oscillator、
ganshe 等改用带种子的随机数；spring-oscillator sim 不读 `performance.now`，时间由 step 推进。

### D3 绘图零件 API（只建不迁）

`core/draw/`：`drawVector`（标签、长度按量值缩放、最短可见、箭头随线宽）、`drawAxes`
（nice step 刻度、单位、原点）、`drawSeries`（折线 / 散点 / 拟合线）。全部吃尺寸变量
（`getRenderTokens`）与 Wave P 的颜色变量。新场景强制使用；旧场景迁移放 Wave P。

### D4 场景模板

脚手架提供两种模板：演示类（固定逻辑画布 + `fitStage` + 结构化读数 + 绑定式控件）、
实验类（再加 MeasurementLog / defineExperiment 骨架）。`check:scaffold` 对两种模板都验证开箱即绿。

**工作量**：M（D1 2 天、D2 1 天、D3 2 天、D4 1 天）。

---

## 8. Wave P：改像素的工作（基线窗口开启后执行）

| 项  | 内容                                                                                                                                                                           | 范围                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| P-a | 物理量颜色变量 `platform/physics-palette.ts`：速度、加速度、力（含重力 / 弹力 / 摩擦 / 安培力细分）、电场、磁场、正负电荷、轨迹、网格、参考线；亮 / 暗两套；场景调色板改为引用 | 103 个场景；棘轮：场景内色值字面量数只降              |
| P-b | 本地 arrow / 坐标轴替换为 D3 零件                                                                                                                                              | 73 场景箭头、59 个本地图表函数                        |
| P-c | B23：`stage-fit.contentBoxSize` 改用 `readElementLayoutSize`（offsetWidth 系）                                                                                                 | 11 个图区场景                                         |
| P-d | `stageTransform` 剩余 10 个变体并入 `fitStage`（补参数：如 `scaleX`、`drawW`）                                                                                                 | 10 场景                                               |
| P-e | E2 中画布自画表格的三个场景改 DOM 表格                                                                                                                                         | accel-force、emf-internal-resistance、half-deflection |
| P-f | 重生视觉基线：Linux `sudo ./scripts/visual-linux-container.sh update`；Darwin `update-darwin-snapshots` workflow；逐张审阅                                                     | 全部受影响场景                                        |

---

## 9. Wave Q：工程与发布

1. **部署门禁**（仓库外配置）：GitHub 分支保护把 `validate` 与 `e2e` 设为必过检查；或改为
   CI 绿后由部署方拉取。没有这一步，新加的 E2E job 只能「发现」不能「阻止」。
2. **容器脚本验证**：Node 24 / pnpm 版本改动后的 `visual-linux-container.sh` 尚未实跑，
   在有 docker 权限的机器上跑一次 verify。
3. **契约总表**写入 `docs/quality-gates.md`：每条运行时契约保证什么、如何复现失败。
4. **AGENTS.md 精简**：把已由类型 / 契约强制的规则从散文移出，只保留「去哪个模块、用哪个 API」。

---

## 10. 新增模块落位

| 模块                                             | 层       | 依赖                             |
| ------------------------------------------------ | -------- | -------------------------------- |
| `platform/readout-format.ts`                     | platform | 无                               |
| `platform/input/stage-interaction.ts`            | platform | core/canvas-sizing               |
| `platform/measurement-log.ts`                    | platform | readout-format                   |
| `platform/data-workspace/define-experiment.ts`   | platform | data-workspace 现有模块、grading |
| `platform/physics-palette.ts`                    | platform | 无                               |
| `core/stats.ts`、`core/random.ts`、`core/draw/*` | core     | core 内部                        |
| `ui/components/measurement-table.ts`             | ui       | platform                         |

---

## 11. 排期与依赖

```
Wave 0（提交现有改动）
  ├─ Wave R（读数）──┬─ Wave I（交互，describe 复用格式化）
  │                  └─ Wave E2（记录表复用格式化）
  ├─ Wave C1–C4（控件）── Wave C5（页面迁移，依赖 I / E2 吸收额外语句）
  ├─ Wave E1（统计）── E2 ── E3 ── E4 ── E5 ── E6
  ├─ Wave D1–D4
  └─ Wave P（基线窗口）
Wave Q 随时可做（Q1 需仓库管理员）
```

| Wave | 估时       | 可并行                   |
| ---- | ---------- | ------------------------ |
| R    | 3 天       | 与 E1、D 并行            |
| I    | 7 天       | R 完成后                 |
| C    | 14 天      | C1–C4 与 I 并行；C5 最后 |
| E    | 14 天      | E1 起步即可并行          |
| D    | 6 天       | 随时                     |
| P    | 视基线窗口 | —                        |

---

## 12. 风险与回滚

| 风险                        | 缓解                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| 批量迁移改变行为            | 迁移脚本只处理通过等价性检查的页面并列出跳过原因；每批跑运行时契约 + 全量 E2E；按批提交，可单批回滚 |
| 键盘交互与布局快捷键冲突    | canvas 聚焦时才处理方向键；全局快捷键（空格、R、F 等）在 `keyboard-shortcuts.ts` 中检查焦点归属     |
| `defineExperiment` 抽象不够 | 先迁最简单的 projectile-data-analysis；double-slit 最后迁，允许其字段规则返回自定义 `FieldFeedback` |
| 读数格式化改变可见文本      | 默认 `digits` 与原 `toFixed` 位数一致（脚本照搬）；只有负零 / NaN 文案变化                          |
| 包体增长                    | 新模块按 manualChunks 规则落 chunk（场景根共享模块已有独立分组）；每 Wave 跑 `check:bundle`         |

---

## 13. 验收总表

| Wave      | 必过                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| 每个 Wave | `pnpm quality:core`、全量 E2E、相关运行时契约、棘轮下调                                  |
| R         | `readout-format-contract` 全绿；P1-1 三场景浏览器复核                                    |
| I         | `stage-keyboard-contract` 全绿；21 场景键盘可操作；`hasTouch` 拖拽不滚页；缩放 2× 不偏移 |
| C         | 12 个组件有单测；axe 无新增违规；页面胶水 ≤ 10                                           |
| E         | 记录类 6 场景用 MeasurementLog；3 个实验用 defineExperiment；本地拟合实现 0              |
| D         | sim 去 DOM 契约绿；随机源全部带种子                                                      |
| P         | 基线重生并逐张审阅；颜色字面量棘轮下调                                                   |

---

## 附录 A：复核命令

```bash
# 读数负零探针（见 Wave R4，临时 spec 方式运行）
# 拖拽场景与键盘处理
grep -rlE "addEventListener\('pointer(down|move)" src/scenes | cut -d/ -f3 | sort -u
# 场景内色值字面量
grep -rhoE "#[0-9a-fA-F]{6}\b" src/scenes | wc -l
# 页面胶水
grep -l "renderSchema(" src/scenes/*/page.ts | wc -l
# sim 访问 DOM
grep -lE "document\.|HTMLElement|getBoundingClientRect|window\." src/scenes/*/scene.sim.ts
```

## 附录 B：页面胶水剩余 62 页（2026-10-25）

accel-force、ampere-balance、bellows、air-track-momentum、binary-stars、binding-energy、
charged-particle-circle、block-board、chase-meet、cyclotron、connected-bodies-incline、
doppler-effect、elastic-energy、displacement-time、centripetal-motion、double-slit、
electrification、electrostatic-induction、force-composition、electric-pendulum、
emf-internal-resistance、ganshe、field-lines、emf-analogy、faraday-disc、impulse-momentum、
harmonic-wave、internal-energy、mechanical-energy、mechanical-wave、oscilloscope、micrometer、
pendulum-period、multimeter-practice、parallelogram-rule、precision-tools、
potential-energy-graphs、projectile-data-analysis、photoelectric-switch、bullet-block、
projectile、projectile-components、charged-superposition、semicylinder-tir-standard、
spring-ball、three-forces、resistor-measurement、dynamic-circle、thin-film、tortoise-hare、
ticker-timer、uniformly-varied-motion、single-slit、interference-formula、vernier-caliper、
metal-rod-track、ticker-tape、wedge-film-interference、xt-graph、variable-work、
vertical-circle、wedge

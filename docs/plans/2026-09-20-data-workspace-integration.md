# Data-workspace 整合方案（grok 成果 + main 已推送工作）

> 状态：已执行。归档记录，不作为现行方案。

> 日期：2026-09-20
> 角色分工：Kimi（计划与验收）→ codex（执行）
> 前置事实：grok 的完整实现原在 `~/.grok/worktrees/.../double-slit-data-workspace`（从未提交），
> 已固化为主仓库本地分支 `grok-data-workspace`（commit c3b68ff，基于 107afd8）。
> 当前工作分支：`integration/data-workspace`（基于 main 285e0b2，已机械迁入 grok 文件，见 §1）。
> grok 自己的计划文档：`docs/plans/2026-09-18-data-workspace-catalog-hardening.md`（已随分支迁入）。

---

## 0. 背景与目标

用户实际体验过并认可 grok 版双缝"数据处理"能力：点击数据处理步骤后控制区隐藏、动画区只显示仪器、
下方出现数据录入表（x₁/x₂ 读数与仪器实时位置核对 → n 间隔数 → D → Δx → λ，逐格校验）。
该版本一直未被合并；main 上的是我（Kimi）不知情时做的简化版（WO-1 单输入校验）。

**目标**：以 grok 版为双缝数据处理主体整合进 main，保留 main 已推送的 WO-2（首页性能）与
WO-3（仪器挂载层），修掉 grok 遗留问题，并修复白光无滤光片时条纹非彩色的缺陷。

## 1. 已完成的机械合并（Kimi 已执行，勿重复）

`integration/data-workspace` 分支上已从 `grok-data-workspace` checkout 以下路径（grok 版整体覆盖）：

- `src/platform/data-workspace.ts`、`src/ui/components/data-workspace-panel.ts`、`src/ui/stage-toolbar.ts`、`src/styles/capability/data-workspace.css`
- `src/scenes/double-slit/`（整个目录，含 data-task.ts / wavelength.ts / reading-constants.ts / snapshot-meta.ts）
- `src/instruments/interference-vernier-caliper/`、`src/instruments/micrometer-eyepiece/`、`src/instruments/_utils/`
- `src/app/layouts/`、`src/app/scene-adapter.ts`、`src/app/scene-bootstrapper-types.ts`
- grok 的全部新增测试（data-workspace 系列、仪器 renderer 系列、double-slit-data-workspace e2e/visual、numeric-hints、fringe-alignment、instrument-fit-visual、capability 两个 spec 的更新、tests/helpers/wait-first-frame.ts）
- `docs/plans/2026-09-18-data-workspace-catalog-hardening.md`

同时已撤下 WO-1 残留：`tests/unit/double-slit.sim.spec.ts` 与 `tests/e2e/measure-simulation.spec.ts`
回退到 grok 版（即 base 版），`tests/contract/scene-params-contract.spec.ts` 删除了 inputLambda 登记
（保留 variable-work/internal-energy 的 autoRun 登记——那是修 HEAD 既有漂移的）。

**有意未采用 grok 的部分**（Track B，首页 catalog 虚拟模块方案）：`scripts/vite-plugin-scene-catalog.ts`、
`scripts/extract-scene-catalog.ts`、`src/catalog/catalog-record.ts`、`src/virtual-scene-catalog.d.ts`、
`tests/unit/vite-plugin-scene-catalog.spec.ts`、`tests/unit/extract-scene-catalog.spec.ts`、
`tests/e2e/homepage-catalog.spec.ts`，以及 grok 对 `src/catalog/scene-registry.ts` 的重写。
理由：main 的 WO-2（registry 聚合 chunk + dev esbuild 内存打包）已验证上线，两套方案解决同一问题，
不留并行实现。grok 方案记录在案，可作为后续优化单独立项。

## 2. WO-A：语义合并（codex 执行）

### 2.1 `vite.config.ts`（两边都改了，手工合并）

当前文件是 main 版（WO-2：无 scene-meta manualChunks、含 isolateCatalogSceneDependencies 与
bundleDevSceneRegistry 插件）。需要把 grok 版的两块移植进来（`git show grok-data-workspace:vite.config.ts`）：

1. `manualChunks` 新增 data-workspace 拆 chunk 规则（engine/panel/capability runtime 归入独立
   `data-workspace` chunk；注意 grok 注释：`data-workspace-declarations.ts`/`data-workspace-lazy.ts`
   必须留在 layouts chunk，文件名不匹配该规则）。
2. `modulePreload.resolveDependencies`：非 double-slit 页面不 preload `data-workspace` chunk；
   double-slit 页面不 preload 两个仪器 chunk 与 instruments-core（仪器仅步骤 6 动态 import）。

约束：不得恢复 `scene-meta-*` manualChunks 规则；合并后 `pnpm build && pnpm check:bundle` 必须绿，
且 `dist/assets/` 出现独立 `data-workspace-*.js` chunk。

### 2.2 `scripts/check-bundle-budget.ts` + `tests/unit/bundle-budget.spec.ts`

当前脚本是 main 版（含 scene-meta-\* 数量为 0 断言）。grok 版新增了 ExperimentsSection chunk 存在性/
scene-meta 引用为 0 的断言（`git show grok-data-workspace:scripts/check-bundle-budget.ts`，+36 行）。
合并：两个断言都保留（措辞按 main 版的统计口径适配）。**注意 grok 版在 main 基座上导致
bundle-budget.spec.ts 两个用例失败**（fixture 的 mock dist 不含 ExperimentsSection chunk）——
合并后必须同步修 fixture，使 `pnpm vitest run tests/unit/bundle-budget.spec.ts` 全绿。

### 2.3 `src/instruments/` 层兼容

`src/instruments/index.ts` 保持 main 版（含 `createInstrumentHost` 导出）。grok 改了
interference-vernier-caliper 与 micrometer-eyepiece 的 view/renderer。必须验证
`tests/unit/instrument-mount.spec.ts` 与三个仪器契约测试在 grok 版仪器上仍通过；
若 mount.ts 的假设被 grok 的改动打破，适配 mount.ts（不要回退 grok 的仪器改进）。

### 2.4 文档（AGENTS.md / README.md）

grok 改了这两个文件描述 data-workspace 与 scene-catalog。采用 grok 版中 data-workspace 相关的
段落，但**删除/改写 scene-catalog（virtual:scene-catalog、AST 抽取）相关描述**为 main 现状
（import.meta.glob 自动发现 + 聚合 chunk）。改完对照实际代码核对，不许留下与实现不符的描述。

### 2.5 double-slit 场景冒烟

grok 版 page.ts/entry/schema 是完整闭环。重点回归：

- URL 参数管线（`?step=6&lambda=650&slitDistance=30`）在 grok 版 page.ts 下仍正常；
- 既有 e2e `tests/e2e/measure-simulation.spec.ts`（已回退为 base 版）通过；
- grok 新增 `tests/e2e/double-slit-data-workspace.spec.ts` 通过。

### 2.6 WO-A 验收

`pnpm quality:core` 全绿 + `pnpm verify:scene double-slit` 全绿。

## 3. WO-B：白光无滤光片彩色条纹修复（codex 执行）

**问题**：步骤 6 `drawStep6Pattern`（`src/scenes/double-slit/renderer/draw-interference.ts`）只用单一
`lambda` 渲染条纹，白光无滤光片时显示单色条纹，物理上错误（应为各波长独立干涉叠加：中央白色亮纹、
两侧彩色）。

**修法**：

1. `drawStep6Pattern` 增加可选入参（如 `whiteSpectrum?: { wavelengths: number[] } | null`），
   白光无滤光片时按 `draw-white.ts` 的 `drawWhiteFringeDisplay` 同款算法逐波长叠加
   （cos² 干涉 × sinc² 单缝包络，逐 x 累积 rgb 后归一化）；此时条纹层 offscreen 缓存 key
   必须包含 white/filter 状态，避免串色。
2. `scene.view.ts` 在 step===6 且 `isWhiteLight(params) && !params.filterColor` 时传入 wavelengths
   （`getActiveWavelengths`）；白光+滤光片维持现状（有效波长准单色）。
3. 遵守画布响应式规范（尺寸走 contentScale/responsiveScale）。
4. 数据处理资格门槛（单色光才允许测量，`data-task.ts` 的 eligibility）不受影响；白光下步骤 6
   仍显示彩色条纹供观察。
5. 顺带核对步骤 5 白光路径（`drawWhiteFringeDisplay`）确实彩色；正常则不动。

**WO-B 验收**：`pnpm verify:scene double-slit` 绿；Playwright 截图核实白光无滤光片时步骤 5/6
条纹为彩色（Kimi 终验时做）。

## 4. 执行约束

- TS strict 零错误；禁 any；不下调任何阈值。
- 视觉基线：双缝 UI 大变，Linux 基线只能走 `scripts/visual-linux-container.sh`（禁宿主机 update-snapshots）。
  本轮先不更新基线，由 Kimi 终验时统一处理。
- grok 分支代码风格已对齐项目规范（三轮交叉审计过），合并时以"少改 grok 代码"为原则。
- 完成后输出：改动文件清单、各验收命令输出摘要、遗留风险。

## 5. 整合后延期项（记录，不执行）

- double-slit 迁移到 `createInstrumentHost`（当前用 grok 版手写接线；mount.ts 留给后续场景）。
- grok Track B（virtual:scene-catalog）作为首页性能的下一代方案备选。
- 原方案文档 §6 的 12 项路线图不变。

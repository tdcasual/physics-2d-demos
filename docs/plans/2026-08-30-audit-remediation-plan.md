# 2026-08-30 全项目审计与整改计划

> 状态：已执行。归档记录，不作为现行方案。

> 基线：`26659f5`（view-base 提取）+ `f81c3f0`（URL 参数管线）。审计时 `pnpm quality:core` 全绿，ESLint 零违规，全局覆盖率 statements 78.7% / branches 81.0% / functions 73.9%（阈值 65/70/65），bundle 预算全部通过。
>
> 审计维度：架构与代码质量、测试覆盖、性能与构建、文档与一致性。本计划按优先级分五个阶段，每项含具体文件、动作与验收方式。

## 审计结论摘要

项目整体健康：分层规则零违规、`src/` 无 `any`/ `@ts-ignore`、contract 测试体系（自动发现 + AST 棘轮）设计良好、bundle 预算余量 13%~30%。问题集中在：

- **2 个真实正确性风险**（TDZ 隐患）
- **文档与代码脱节**（README 和 agent 契约仍教人手写场景 HTML，会直接误导）
- **2 个场景 + 2 个仪器缺物理正确性测试**（有公式注释、零断言）
- **收尾型样板残留**（约 240 行可收敛重复代码）
- **个别渲染热路径 DOM 读**（view-base 迁移的未竟之处）

---

## P0 — 正确性风险（立即修）

### 1. TDZ 隐患：entry 回调在 `base` 声明前引用它

- 位置：`src/scenes/doppler-effect/scene.entry.ts:47-57`（base 在 line 59 声明）、`src/scenes/mechanical-wave/scene.entry.ts:46-50`（base 在 line 52 声明）。
- 风险：view 回调当前是异步触发所以没炸；任何同步调用路径（未来重构、测试 mock 变更）都会抛 `ReferenceError`。
- 动作：把 `const base = createStandardSceneEntry(...)` 移到回调注册之前。
- 验收：`pnpm vitest run tests/unit/scene-entries.spec.ts` + 相关场景 spec 通过。

## P1 — 文档纠偏（误导性最强，半天内可完成）

### 2. 修正「手写场景 HTML」的过时指引

- `README.md:79,204`：改为「入口由 `vite-plugin-scene-pages` 虚拟生成，`pnpm check:scenes` 拒绝 `src/pages/` 下的场景 HTML」。
- `docs/new-scene-agent-contract.md:10` 及交付要求第 1、2 条：从可修改文件清单中删除 `src/pages/<id>.html`，删除「创建 HTML 入口」要求。
- `docs/scene-modernization-guide.md:39`：同上。

### 3. 重写 URL 同步机制描述

- `docs/scene-modernization-guide.md:181`：`readSceneParams`/`writeSceneParams` 已不存在于场景页，改写为 `applySceneUrlParams` 管线 + `writeParam` 注入 + `paramSync` 逃生口（照 AGENTS.md 现行章节）。

### 4. 历史布局文档加头注

- `docs/layout-master-system-impl.md`（引用不存在的 `masters/` 目录）、`layout-master-system-pixel-perfect.md:63-73`（引用已删测试页）、`layout-v2-*` 系列、`layout-proportions-*` 系列：加「历史快照，路径已失效，现行实现见 `src/app/layouts/`」头注。

### 5. CHANGELOG 决策

- 现状：最后条目 2026-04，此后 121 个 commit 无记录，且多处写「7 个场景」（实际 16）。
- 建议：文件头声明「自 2026-05 起停止维护，以 git log 为准」，并给 `CHANGELOG.md:10` 的 `src/pages/*.html` 扫描条目加更正注记。比补记 4 个月历史更诚实、成本更低。

### 6. AGENTS.md 微调

- 删除 bundle 预算段「个别复杂场景有入口级覆盖」一句（`ENTRY_BUDGET_OVERRIDES` 已为空）。
- 「共享组件放在 `ui/components/SceneControls.ts`」改为实际路径 `ui/components/scene-controls/`。

## P2 — 物理正确性测试缺口（高价值）

### 7. `doppler-effect` sim 测试（最高优先）

- 现状：`scene.sim.ts` 58.2% stmts / 41% fns，line 4 注释写明公式 `f_recv = f_emit × (v_sound + v_obs) / (v_sound − v_src)`，零断言。
- 动作：新建 `tests/unit/doppler-effect.sim.spec.ts`——静止情形（f_recv = f_emit）、波源运动 vs 观察者运动的极限等价性、波环间距断言。
- 参考模板：现有 `tests/unit/projectile.sim.spec.ts` 风格。

### 8. `mechanical-wave` sim 测试

- 现状：60.1% stmts，纯函数 `waveY`/`waveVelocity`/`waveAcceleration`（scene.sim.ts:51,65,79）零断言。
- 动作：正弦振幅/相位、边界约束断言。成本最低、收益直接。

### 9. 仪器 sim 测试 ×2

- `src/instruments/spiral-micrometer/instrument.sim.ts`（50% fns）、`vernier-caliper/instrument.sim.ts`（57% fns）只有 smoke 测试。
- 动作：照搬 `scenes/micrometer` / `scenes/vernier-caliper` 已有 spec 的读数分解断言（0.5mm 地板、精度映射）。模板已在库内。

### 10. 小缺口补测

- `src/platform/viewport.ts`（4.5%）与 `src/instruments/_utils/viewport.ts`（0%）：platform 层其余全 100%，应补齐。
- `src/scenes/ganshe/presets.ts`（0%，54 行纯数据）：断言预设完整性。
- `src/scenes/chase-meet/expression-parser.ts`（54% stmts，100% fns）：补畸形表达式、运算符边界分支。

### 11. 测试基建小改进（低优先）

- `tests/unit/scene-entries.spec.ts:46-63` 硬编码能力清单（hasGetState/hasTransport 等），改为从 `SceneMeta.testProfile` 派生，消除手动同步点。
- `playwright.config.ts` 与 `playwright.e2e.config.ts` 仅差 testDir/snapshots，可合并为单 config 双 projects（纯美容）。

## P3 — 样板收敛收尾（约 240 行可删重复）

### 12. micrometer / vernier-caliper 视图双胞胎

- 两文件 diff 仅仪器绘制调用、状态类型、一处 `precision` 展开不同；各自手写 ~10 行 resizeCanvas + theme/mode 状态 + contentScale，约 80 行重复。
- 动作：迁入 `createCanvasViewport` + `createViewEnvironment`（view-base 现成），或提取 `createInstrumentView(drawFn)` 小工厂。

### 13. 9 个 page.ts 的 controls-handle 透传包装

- `return { setValue, setActive, dispose }` 逐字段转发块在 9 个页面逐字重复（vernier-caliper/page.ts:55-65 等）。`renderSchema` 返回的实例天然满足消费方 duck-type（url-sync.ts:160-163）。
- 动作：直接 `return renderer`，或在 `page-utils.ts` 加 `toControlsHandle()`。约 80 行可删。

### 14. `scene-entry-helpers` 增强

- 加 `wrapAction(fn)`：收敛 ~25 处「改 params → `base.renderAndEmit()` → `base.notify()`」三行组（vt-integral 7 处、field-lines 5 处、emf-analogy 4 处等）。
- 加可选 `resetView?: () => void` 钩子：让 projectile（entry 55 行手写仅为 init/reset 时调 `view.reset()`）与 chase-meet（重复实现 `createNotifySystem` 20 行）迁入标准 entry。

### 15. contentScale 语义统一

- 两种并存：`mode === 'presentation' ? hints?.contentScale ?? 1.5 : 1`（view-base 及 6 场景）vs `demoHints?.contentScale ?? ...`（field-lines/scene.view.ts:77、chase-meet 两处，normal 模式下 hints 也生效）。
- 动作：统一到 `createViewEnvironment.contentScale()` 语义；如 field-lines/chase-meet 确需 normal 模式缩放，在迁移说明中记录理由。

### 16. 零散清理（各 1~5 行）

- 删 `CaliperObjectType`（vernier-caliper/scene.sim.ts:7，零引用）。
- 删 micrometer/page.ts:47-49 空 `if (key === 'preset')` 分支；改双监听为 preset-group 原生 onChange。
- wedge/scene.view.ts:83 与 thin-film/scene.view.ts:600 的空 `dispose()` 改为调 `release()`。
- vt-integral/page.ts:19-27 冗余 dispose 自委托；`VT_SCENE_VALUES` 等仅自用的多余 export；`scene-registry.ts:6-7` 单变体联合类型。
- `mechanical-wave/scene.sim.ts:216` 的 `as unknown as` 改 `keyof` 分发（`src/` 唯一抹掉类型信息的 cast）。
- doppler-effect/page.ts:98-114 手写 applyPreset 换 `page-utils` 的 `createPresetApplier`。

## P4 — 性能与构建（低优先，滚动改进）

### 17. interference-formula 渲染热路径

- `renderer/draw-fringe-graph.ts:24-27`：render 路径内每帧 `getBoundingClientRect()` + dataset 读，而调用方 scene.view.ts:196 已持有 view-base 记录值。改签名传入 `graph.cssWidth/cssHeight/responsiveScale`。
- 同文件 66-75：逐像素 `fillRect` + 每像素分配 rgb 字符串，可照搬 thin-film 的离屏 canvas + 参数 key 缓存。

### 18. 每帧渐变缓存

- `electrification/renderer/draw-objects.ts`（4 个/帧，有 transport 播放）、`field-lines/renderer/draw-charges.ts`（每电荷 2 个/帧 + shadowBlur）：仿 emf-analogy 的 Map 缓存按（几何, theme）键控。

### 19. ganshe 波形采样

- scene.view.ts:222-352 固定步长 0.05，最坏 ~2400 次 lineTo/帧。按 scaleX 自适应步长（约每 2 设备像素一点）。

### 20. 待验证项

- standalone 构建对含动态 import 的场景（double-slit 仪器懒加载）：`vite-plugin-inline-assets.ts:208-211` 会删 chunk 文件，需人工确认 standalone 产物中仪器功能是否运行时加载失败。
- 场景页 CSS 余量 21%（最紧预算），新增 UI 类时留意。

## P5 — 规则与豁免（顺手做）

### 21. ESLint 层间规则补全或注释说明

- eslint.config.js 四处缺口（scenes 未禁 catalog/跨场景、platform 未禁 catalog/instruments、core 未禁 instruments、catalog 未禁 core/instruments），目前靠 `tests/unit/architecture-boundaries.spec.ts:131-233` 兜底。
- 动作：补上 pattern，或在配置中注释声明「契约测试为权威兜底」（参照该测试 224 行既有注释先例）。

### 22. electrification 的 hint 迁移

- controls-schema.ts:52-83「原理说明」用 `custom` 手写 DOM 渲染纯静态文本，违 AGENTS.md「优先用 hint」。迁移为场景侧首个 `hint` 范例（当前 hint 采用率：仪器 4/4、场景 0/16）。

---

## 执行建议

- **P0 + P1** 合并为一个 commit 系列（正确性 + 文档纠偏），一次完成。
- **P2** 按 7→8→9→10 顺序，每个测试文件独立 commit。
- **P3** 每一项独立 commit，便于回滚；完成后删掉的重复行数预期 240+。
- **P4/P5** 不单独排期，碰到相关文件时顺手做；20 的 standalone 验证建议在下次发布前做一次。
- 全部阶段完成后跑 `pnpm quality:core`；涉及 UI 的改动（P3-12、P4-17/18）需补跑视觉基线校验（Linux 基线走 `scripts/visual-linux-container.sh`）。

---

## 执行结果（2026-08-31 全部完成）

按 commit 追溯（`git log cd439b4..` 后段）：

- **P0**（`3d64f87`）：TDZ 修复。
- **P1**（`5417e12` + `58aba54`）：文档纠偏全部落地。
- **P2-7/8**（`bb63af4`、`035b12e`）：doppler-effect 17 例、mechanical-wave 16 例。校准中发现两点事实：波环发射按帧量化（容差按一帧传播距离）；mechanical-wave 约束系统不 clamp 直接设置的参数本身（设计取舍，断言已对齐）。
- **P2-9/10/11**（同一提交）：仪器 sim ×2（各 21 例，100% 覆盖）、platform viewport（16）、instruments viewport（8）、ganshe presets（24）、expression-parser 错误路径（26）；scene-entries 能力清单改从 testProfile 派生（顺带修正两处过期清单，断言数 157→190）。playwright config 合并不做（CI 耦合，收益仅美容）。
- **P3-12**（`90b951a`）：micrometer/vernier-caliper 迁移 view-base（raw sizing 逐帧等价配置）；附带修复 preset 键盘导航此前不更新读数的 bug。
- **P3-13/16**（`ca8b94e`）：7 个页面中**仅 projectile** 是纯透传可直返（其余 6 个含 syncFromScene / 滑块联动等真实逻辑，审计估计偏乐观）；doppler preset 收敛到 page-utils；mechanical-wave 类型擦除 cast 移除；零散死 export 清理。
- **P3-14**（`6817c01`）：`wrapAction<A, R>`（泛型透传返回值）+ `resetView` 钩子；9 个 entry 迁移 ~25 处三行组；projectile 迁回标准 entry（删 ~55 行）；chase-meet 仅复用 createNotifySystem（其通知/渲染时序与标准 base 刻意不同，不整体迁入）。
- **P3-15**（`0569f5f`）：**「两种 contentScale 语义」实为 bug**——field-lines/chase-meet 粘性保留 demoHints，presentation 切回 normal 后仍以演示倍率渲染。已统一到 view-base 语义。wedge/projectile/vt-integral 的三处内联同构表达式语义本就一致，未强行收敛。
- **P4-17/18/19**（`0569f5f`）：interference-formula 热路径 DOM 读消除 + 条纹离屏缓存；electrification/field-lines 渐变键控缓存；ganshe 自适应采样（保底不比原 0.05 更密）。
- **P4-20**（`658a0b1`）：**standalone 导出确认整体损坏并已修复**，三个叠加 bug：topoSortChunks 不跟随 dynamicImports（懒加载 chunk 被删）、内联 script 丢 type="module"（head 阶段先于 #app 执行）、esbuild IIFE 清空 import.meta 导致 \_\_vitePreload 抛 Invalid URL。修法：dynamicImports 遍历 + 保留 module defer 语义 + standalone 配置 modulePreload:false / cssCodeSplit:false / base:'./' + esbuild resolver 归一化。Playwright file:// 实测 5 场景零报错，double-slit 仪器懒加载验证通过。
- **P5-21/22**（`c0f7acf`）：ESLint 四处层间缺口补齐（跨场景导入禁令用 regex 负向前瞻，实现要点见 eslint.config.js 注释），39 个合成探针验证无误伤；electrification 成为场景侧首个 hint 范例。

**质量门禁**：`pnpm quality:core` 全绿（114 测试文件、构建 + bundle 预算通过）。渲染等价性改动（P3-12/P4）经 Linux 容器视觉基线校验。

# 双缝波长修复 + 全面审计整改方案

> 状态：已执行。归档记录，不作为现行方案。

> 日期：2026-09-20
> 角色分工：Kimi（计划与验收）→ codex（交叉审计与执行）
> 范围：双缝干涉场景波长教学闭环修复、首页实验列表加载性能、仪器挂载模式抽象、审计发现的缺陷整改
> 验收命令：`pnpm quality:core`（全绿）+ 各工作单项验收标准

---

## 0. 背景

用户上一轮目标（在其他主机上交给 codex，未执行完）：

1. 修复双缝干涉"求波长"问题：**当前只求到 Δx 就停了，没有显示当前的 L，也没有要求计算波长并校验**（已核实，见 §1）。
2. 审计仪器模式能否方便地给以后很多实验复用（鲁棒性/扩展性）。
3. 审计当前项目架构，如何改进。
4. 首页加载实验列表特别慢，如何优化。

本文件先给出核实结论与三份审计报告的摘要，然后定义执行工作单（WO-1/2/3）与延期路线图。执行者对**工作单**逐条实施，完成后由 Kimi 按 §6 验收。

---

## 1. 双缝干涉"求波长"问题核实结论（已完成）

**结论：用户报告属实。** 证据：

- `src/scenes/double-slit/renderer/draw-interference.ts:239-240`：步骤 6 画布标注只有 `Δx ≈ X mm`，且这个 Δx 是由真实 λ 反算的**理论值**（`computeFringeSpacingPx(lambda, …)`），等于把答案直接亮给学生。
- 画布上**没有 L 的任何标注**；L 只出现在右侧"实验状态"读数区（`scene.entry.ts:351-355`）。
- 全场景没有任何"学生输入 λ → 与真值校验 → 反馈"的交互：grep 整个 `src/scenes/double-slit/` 无校验逻辑，controls-schema 无输入字段与校验按钮。
- 物理关系：`λ = d·Δx / L`。场景内已有正向函数 `computeRealDeltaXmm`（`scene.sim.ts:48-56`），缺逆向函数与校验辅助。

**教学流程缺陷**：学生应"用仪器测 Δx → 结合已知 d、L 手算 λ → 提交校验"，现状是"理论 Δx 直接显示，无 λ 环节"。

---

## 2. 审计报告摘要

三份完整审计由独立探索代理完成，此处只留结论与证据指针。

### 2.1 首页实验列表加载慢（根因已定位）

**根因：120 个 per-scene meta chunk + 服务器仅 HTTP/1.1 → ~123 个请求排队 ≈ 20 轮瀑布 ≈ 2.5–3 s。**

- `vite.config.ts:166-171` 的 manualChunks 规则把每个 `scene.meta.ts` 拆成独立 chunk（`scene-meta-${id}`）。
- `ExperimentsSection`（App.tsx:16 lazy import）的构建产物内含 **120 个** `from"./scene-meta-*.js"` 静态导入；Vite `__vitePreload` 并发预载全部静态依赖。
- 实测 `x.infinitas.fun` 仅 HTTP/1.1（浏览器每域 6 并发），单请求 TTFB ~130 ms；全部 meta 合计 br 压缩后 < 40 kB——**请求数是瓶颈，字节数不是**。
- 次要问题：
  - 9 个 `scene.meta.ts` 反向 import 了 `scene.sim.ts` 的常量（accel-force、binding-energy、block-board、cyclotron、field-lines、mechanical-energy、oscilloscope、pendulum-period、three-forces），meta chunk 膨胀 3–10 倍，首页白下载 ~50 kB sim 常量。
  - `ExperimentsSection.tsx:20,71-86` 用 React state 跟踪 hoveredId，hover 触发 120 张卡片全量重渲染（纯 CSS `:hover` 即可）。
  - 首页 modulepreload 6 个 featured meta 独立 chunk（次要）。

**渲染/运行时排查结论（不是问题）**：120 张纯文本卡片一次渲染 < 50 ms；无图片/webfont；eager glob 未进首页入口包（featured-scenes.ts 直接 import 6 个 meta 绕过了 registry）。

### 2.2 仪器模式复用性（核心结论：仪器契约可用，消费侧无抽象，不宜直接推广）

- 契约侧完整：`src/instruments/_contract/instrument-contract.ts`（InstrumentSim/View/Factory + Measurable/Serializable/Calibratable 可选扩展）、manifest + registry 懒加载、契约测试齐全。
- **消费侧唯一实例 double-slit 手写了 ~244 行胶水**（`scene.entry.ts:84-328`），其中 ~70% 完全通用（叠层 DOM、动态 import dedup、TDZ/游离 DOM 防护、状态缓存、读数订阅、display 切换强刷、resize/theme/dispose 转发）。
- **真实 bug**：
  - R1（高）：布局切换后仪器静默消失——`layouts/container.ts:331-341` 重建 DOM 会销毁 `instrumentWrap`，场景侧引用仍非 null 导致 `ensureInstrumentCanvases` early-return；框架已有 `onLayoutWillChange/DidChange` 钩子但场景未接。步骤 6 旋转手机/换布局即坏，无测试覆盖。
  - R2（高）：`instrumentStateCache` 存 `{...sim.getState()}`，用户拖出的读数在 view 交互态里，恢复时被静默丢弃——离开步骤 6 再回来测量读数归零。契约的 `serialize()/deserialize()` 存在但未被使用。
  - R3（中）：display:none↔block 需手动绕过 view 的 needRender 守卫，知识只在 double-slit 注释里。
  - R4（中）：异步加载三道竞态防线（TDZ/dedup/游离 DOM）是踩坑后补的，复制时少抄一道即出 bug；加载失败后不重试。
  - R5（低）：两个仪器 `setTheme` 是 no-op（固定配色），异步加载期间切主题不补发。
  - R6（低）：仪器 view 污染宿主 `parent.style.position` 不还原，与场景侧快照/恢复叠床架屋。
  - R7（低）：硬编码设计尺寸（卡尺 695×250、测微仪 700×450），不走 responsiveScale。
- **扩展性障碍**：E1 胶水复制；E2 参数语义耦合（场景须懂仪器参数词汇表与像素换算）；E3 叠层定位写死（`top:30%;height:70%` + 未文档化 CSS 变量协议）；E4 仪器 controls-schema 是死代码且已漂移（一份参数三处真相：meta/manifest/schema）；E5 URL 同步不覆盖仪器状态；E6 SVG 仪器 `instrument-param` 事件只有库页面接了线；E8 STANDARDS.md 多处漂移（文件名约定、分类枚举、仪器数量）。
- **测试缺口**：契约测试的仪器名单 3 处硬编码（应改 import.meta.glob 自动发现）；场景集成路径（挂载/竞态/dispose/布局切换）零测试；dispose 泄漏、主题生效、serialize 往返无断言。
- **设计建议**：在 `src/instruments/mount.ts` 实现 `createInstrumentHost`（详见审计报告 §5 的 API 草案）：lazy 加载 + dedup + 竞态防护、placement 配置、内置脏检查 sync、`mapParams` 回调作为场景物理换算唯一注入点、serialize 强制化修 R2、标准接线布局钩子修 R1、SVG 事件收编修 E6。迁移路径：double-slit 先行 → 第二消费场景验证 → 契约测试自动发现 + URL 命名空间（`instr.<id>.<key>`）。

### 2.3 视图审计 + 架构审计

**视图层**：

- 响应式实质合规率高（120 场景全过棘轮检查一），view-base 采用率 114/120。
- AST 棘轮（`tests/contract/scene-standard.spec.ts`）两个逃逸通道：
  - (a) 只扫 `scene.view.ts` + `renderer/`，**不扫 sim/常量文件**——约 37 个场景把几何常量藏进 `scene.sim.ts` 的 `*Constants`；
  - (b) `containingDimensionName` 不识别对象字面量属性（如 double-slit 的 `POS = { light: 80, … }`，scene.view.ts:60-68）。
- **emf-analogy 的 `setMode` 吞掉 hints**（`scene.view.ts:77-79` 两个参数下划线丢弃），presentation 模式的 contentScale 根本没进绘制——教学功能半挂。
- **double-slit 模块级可变缓存**（`_paletteKey/_cachedPalette/_cachedScene/_cachedWl`，scene.view.ts:71-76）跨实例污染；同文件 `whiteFringeCache` 已是正确的实例化示范。
- 渲染性能热点：brownian-motion 每帧 `createRadialGradient`×2 + 对象分配；oscilloscope 每帧波形点数组；xt-graph 每帧 theme 对象。DPR 封顶 2 一致正确；DPR/transform 约定（resize 时 scale vs 每帧 setTransform）两种并存，无统一答案。

**架构层（总体健康度高于同规模项目平均水平）**：

- 分层干净（ESLint 规则 + 双契约测试保险，全库仅 2 处声明过的行内豁免）。
- **page.ts 样板是最大重复热点**：120 个 page.ts 共 14,371 行、均值 120 行；`page-utils.ts` 下沉失败（3/120 使用）；典型场景同一份 paramMap 写两遍、onChange 与 applyParam 逐行镜像。建议提供 `createSchemaControls` 高阶 helper，预计可削 40–50%。
- 103 个 page 用 `paramSync.applyParam` 逃生口 → 说明默认管线表达力不足，应把高频模式（bool 转换、preset、number 校验）下沉为声明式选项。
- `scene-adapter.ts` 691 行 God Object，建议按 transport/keyboard/perf/resize/readout 拆 collaborator。
- 文档漂移：`docs/optimization-analysis.md` 的 SchemaRenderer 结论过期（15→118）；AGENTS.md 的 projectile 参考描述与实际代码不符；`scene-bootstrapper.ts:4` 注释「~30 行」与实际均值 120 行脱节；历史审计报告无归档横幅。

---

## 3. 工作单 WO-1：双缝波长教学闭环修复（必做）

**目标**：步骤 6 形成完整教学闭环——已知 d、L → 仪器测 Δx → 学生计算 λ → 提交校验 → 反馈。

### 3.1 sim 层（`src/scenes/double-slit/scene.sim.ts`）

1. 新增纯函数 `computeWavelengthNm(deltaXmm: number, slitDistance: number, L?: number): number`——`computeRealDeltaXmm` 的逆运算（λ_m = d_m·Δx_m/L，返回 nm）。注意单位：d_m = slitDistance × PHYSICAL_D_SCALE，Δx_m = deltaXmm×1e-3。
2. 新增 `validateWavelength(inputNm: number, actualNm: number, tolerancePct?: number): { ok: boolean; errorPct: number }`，默认容差 5%。
3. 两个函数必须有单元测试（追加到 `tests/unit/double-slit.sim.spec.ts`）：逆运算往返一致性（computeRealDeltaXmm∘computeWavelengthNm ≈ identity）、边界值、容差边界（恰好 5% 判 ok）。

### 3.2 视图层（`renderer/draw-interference.ts` 的 `drawStep6Pattern`）

1. 画布标注补上当前 L 与 d：`L = 70 cm · d = 0.20 mm`（值随参数实时变化；遵守响应式规范，文字尺寸走 contentScale）。
2. **理论 Δx 不再无条件显示**（它由真实 λ 反算，等于泄题）：改为校验成功后显示完整算式 `λ = d·Δx/L = 532 nm ✓`；校验前只显示 d/L 标注。实现方式：view 增加可选入参（如 `verification?: { ok: boolean; lambdaNm: number } | null`），由 entry 透传。
3. 注意该函数现有 offscreen 缓存 key（:185），verification 状态变化必须让缓存失效（纳入 key 或单独绘制文字层，推荐后者：条纹层缓存不动，标注文字直接画在主 canvas）。

### 3.3 控制面板（`controls-schema.ts` 的 step6 schema + `page.ts`）

在 `doubleSlitStep6ControlsSchema` 增加一个 section（标题"波长测量与计算"），内容：

1. `hint`（静态）：只写公式 `λ = d·Δx/L` 与操作指引（先用仪器测 Δx，再结合读数区的 d、L 计算 λ 并输入校验）。d/L 数值由读数区已有项呈现，hint 不写动态数值。
2. **"测得 Δx"实时值放实验状态读数区**（`getReadoutItems` 新增项，entry 已从仪器 `onReadingChange` 拿到读数）。**不要**用 `SchemaRenderer.setValue` 做只读展示（它会派发 input 事件形成回环，见 §8.1）；hint 是静态的也不能用。
3. `number` 字段 `inputLambda`（单位 nm，范围 380–780）：学生输入计算结果。
4. `button` 字段 `verifyLambda`（label "校验波长"）：点击后 entry 执行 `validateWavelength(input, getEffectiveLambda(params))`。
5. 校验反馈：成功/失败 + 相对误差百分比通过**读数区**新增 item（`lambda-check`）呈现；控制面板可用 `custom` 字段自绘动态文本作为可选增强。白光模式提示"以有效波长（滤光片中心波长）为真值"。
6. 校验状态变化要触发主画布重绘（§3.2 的 ✓ 标注），且换参数（λ/d/L/滤光片）后旧的校验结果作废（状态清除）。

### 3.4 顺手修复（同场景内，小改动）

- 把 `scene.view.ts:71-76` 的模块级缓存（`_paletteKey/_cachedPalette/_cachedScene/_cachedWl`）移入 `createDoubleSlitView` 工厂闭包，消除跨实例污染；`dispose()` 相应简化。
- `drawStep6Pattern` 标注区文字绘制遵守 AGENTS.md 画布响应式规范（现有 `13 * contentScale`、`patternW - 120` 等写法保持不变即可，新增文字同样走 contentScale）。

### 3.5 WO-1 验收标准

- `pnpm verify:scene double-slit` 全绿。
- 新增 sim 测试通过；不降低覆盖率阈值。
- 手动/Playwright 路径：步骤 6 → 拖动仪器得读数 → 输入正确 λ（±5% 内）→ 读数区显示 ✓ 与误差% → 画布显示完整算式；输入错误值 → 显示 ✗ 与误差%；改动 λ 滑块后校验状态清除。
- URL 参数回归：`?step=6&lambda=650&slitDistance=30` 仍正常（page.ts 的 applyAll 管线不被破坏）。

---

## 4. 工作单 WO-2：首页实验列表加载优化（必做）

### 4.1 核心修复（quick win）

1. **删除或收窄 `vite.config.ts:166-171` 的 `scene-meta-*` manualChunks 规则**，让 120 个 meta 聚合进 ExperimentsSection 所属 chunk（或共享 registry chunk）。场景页各自内联自己的 meta（~1 kB/页重复，可接受）。
2. 验证 `scripts/check-bundle-budget.ts` 的统计口径不依赖 `scene-meta-*` 文件名（若依赖则同步修正口径，但**预算值不许下调**）。
3. 构建后人工核验产物：`dist/assets/` 中不再出现 120 个 `scene-meta-*.js`；ExperimentsSection chunk 数 ≤ 个位数；场景页 chunk 仍包含自己的 meta（页面标题正确的证据）。
4. `pnpm build && pnpm check:bundle` 全绿；首页入口预算（JS 190 kB / CSS 25 kB）不破。

### 4.2 顺手修复（低风险）

5. `ExperimentsSection.tsx`：去掉 `hoveredId` state 与 onMouseEnter/Leave，卡片边框高亮改纯 CSS `:hover`；`filteredScenes` 加 `useMemo`。视觉效果必须像素级不变（视觉回归基线兜底）。

### 4.3 WO-2 验收标准

- 构建产物中实验列表依赖链请求数从 ~123 降到个位数（以 `ExperimentsSection` chunk 的静态 import 数为准）。
- `pnpm quality:core` 全绿（含 bundle budget）。
- dev 模式首页不再拉起 120 个 meta 模块（vite dev 网络面板或 `--debug` 抽查）。
- 首页卡片视觉无变化（hover 高亮行为一致）。

---

## 5. 工作单 WO-3：通用仪器挂载层 + double-slit 迁移（必做，分两个 codex 回合）

> 这是"仪器模式能否复用"审计的落地方案。目标：下一个实验接入仪器时胶水代码 ≤ 30 行，并顺带修掉 R1/R2 两个真实 bug。

### 5.1 回合 3a：实现 `src/instruments/mount.ts` 的 `createInstrumentHost`

API 面（实现时可微调，但能力不能少）：

```ts
createInstrumentHost({
  attachTo: HTMLCanvasElement,          // 场景主 canvas
  theme: TeachingTheme,
  instruments: [{
    id: string,                          // 走 instrument-registry 懒加载
    placement: { top, left, width, height } | 'full',  // 替代写死的 top:30%
    visible: (sceneParams) => boolean,   // 替代手写 display 切换 + 强制 render/resize
    mapParams: (sceneParams) => object,  // 场景物理换算唯一注入点
  }],
  onReadingChange?: (id: string, reading: number) => void,
}): {
  sync(sceneParams): void;               // 内置脏检查
  setTheme(t): void; resize(): void;
  getReading(id): number | undefined;
  dispose(): void;                       // 走 serialize 存状态
}
```

必须内建的能力（从 double-slit 胶水中抽象）：

- 动态 import dedup + 加载完成时容器已销毁的丢弃防护（现 `scene.entry.ts:99-100,144-156,189-195`）。
- 仪器状态缓存改走契约的 `serialize()/deserialize()`（修 R2）；若某仪器未实现 serialize，host 负责补默认实现或报清晰错误。
- display 切换后强制 render+resize（修 R3 的知识内化）。
- **布局切换存活**：宿主检测 `attachTo` 的 parentElement 变化（或提供 `reattach()` 供场景在 `onLayoutDidChange` 调用），自动重挂仪器 DOM（修 R1）。
- dispose 时完整移除 document 监听与 DOM（断言可测）。
- `instrument-param` 冒泡事件由 host 统一监听回写（收编 E6）。
- 放 `src/instruments/` 层（不得 import app/ui/scenes；ESLint 分层规则会拦）。

### 5.2 回合 3b：double-slit 迁移 + 测试

1. `scene.entry.ts` 改用 `createInstrumentHost`，删除约 200 行手写胶水；场景特有逻辑（物理换算）保留在 `mapParams`。
2. 回归验证：布局切换（split-right ↔ mobile-stack）后步骤 6 仪器不消失（R1）；离开步骤 6 再回来读数保留（R2）。
3. 新增单元测试：host 的挂载/卸载/serialize 往返/dedup/布局重挂（happy-dom 环境）。
4. 契约测试的硬编码仪器名单改 `import.meta.glob('/src/instruments/*/instrument.meta.ts', { eager: true })` 自动发现（`tests/contract/instrument-manifest.spec.ts`、`tests/unit/instrument-registry.spec.ts`、`tests/unit/instrument-entries.spec.ts` 三处）。
5. 同步修正文档漂移（E8）：`src/instruments/STANDARDS.md` 的文件名约定（`<id>.sim.ts`→`instrument.sim.ts`）、分类枚举、仪器数量；新增仪器接入指南改为"host + 30 行胶水"口径。

### 5.3 WO-3 验收标准

- double-slit `scene.entry.ts` 仪器相关代码 ≤ 80 行（从 ~244 行降下）。
- R1/R2 有对应的自动化测试且通过。
- `pnpm quality:core` 全绿；既有 e2e（`tests/e2e/measure-simulation.spec.ts`）与视觉回归不红。
- 视觉回归注意：步骤 6 像素外观变化需走 `scripts/visual-linux-container.sh update` 流程（**禁止宿主机直接 update-snapshots**）。

---

## 6. 延期路线图（本轮不执行，已记录）

按优先级排序，供后续工单：

1. **9 个 meta 解耦 sim 常量**（meta 数据纯净化；每场景机械改动 + verify:scene）。
2. **AST 棘轮堵 sim 常量逃逸**（`collectSceneRenderSource` 扩到场景全目录；对象字面量属性纳入判定；同步评审 37 个 `*Constants` 场景）。
3. **emf-analogy presentation 半挂修复**（`scene.view.ts:77` 接住 hints）。
4. **page.ts 样板二次下沉**（`createSchemaControls` 高阶 helper；先迁移 10 个最重复场景；复活或删除 page-utils.ts）。
5. **paramSync 高频模式声明化**（booleanKeys/presetMap 下沉，让 applyParam 回归例外定位；103 个使用点逐步回收）。
6. **scene-adapter.ts 拆分**（691 行 → transport/keyboard/perf/resize/readout collaborators）。
7. **渲染性能小修**：brownian-motion 每帧双 gradient、xt-graph 每帧 theme 对象；补"离屏缓存何时该用"指南；统一 DPR/transform 约定并下沉 `createGraphViewport()` 预设。
8. **服务器开启 HTTP/2**（仓库外，x.infinitas.fun 反代/CDN 配置）。
9. **文档刷新**：optimization-analysis.md、AGENTS.md projectile 描述、bootstrapper 注释、历史报告归档横幅。
10. **view 层测试覆盖**：27/120 → 优先覆盖 16 个豁免场景（chase-meet/double-slit 几何推导）。
11. **仪器 URL 命名空间**（`instr.<id>.<key>` 透传，依赖 WO-3 落地）。
12. **第二仪器消费场景试点**（如 vernier-caliper-guide 挂进 precision-tools，检验 host 抽象真伪）。

---

## 8. 交叉审计修正（codex，2026-09-20）

codex 交叉审计（只读模式）确认了主线证据，并提出以下实质修正，执行时必须遵守：

### 8.1 WO-1 修正：动态反馈路径

- `platform/controls-schema.ts` 的 `hint` 是**静态**的，无更新句柄；schema **没有只读数字字段**。
- `SchemaRenderer.setValue(number)` 会派发 `input` 事件 → **不能**用它做"只读测得 Δx"展示（会触发业务回调形成回环）。
- 因此动态文本必须走以下两条通道之一：
  1. **实验状态读数区**（`getReadoutItems`，scene-adapter → SceneContainer 统一刷新）——承载"测得 Δx"实时值与校验结果（✓/✗ + 误差%）的主通道；
  2. 控制面板内用 `custom` 字段自绘动态文本（可选增强）。
- 控制面板只承担输入：`number` 字段（λ 输入）+ `button` 字段（校验）+ 静态 `hint`（公式与操作指引，不写动态数值）。

### 8.2 WO-2 修正：构建图断言

- 同一 `scene.meta.ts` 同时被首页 eager glob 和各场景页入口引用，删 manualChunks 后 Rollup 的分 chunk 行为**不确定**（可能聚合成共享 chunk 被场景页共同 preload，也可能内联）。执行后必须人工核验产物图：
  - `dist/assets/` 无 `scene-meta-*` 文件；
  - 场景页 HTML 的 modulepreload 链不因此显著变长；
  - 首页入口预算仍绿。
- 预算脚本只统计 HTML 直接引用 + modulepreload，懒加载的 ExperimentsSection chunk 不进首页预算 → **须新增产物断言**（可在 `scripts/check-bundle-budget.ts` 或独立脚本断言"assets 中 scene-meta-\* 数量为 0"），防止回归。

### 8.3 WO-3 修正：三个 API 现实

- instrument-registry **没有 getById/loadById**：host 需自行接受 factory importer（`( ) => import(...)` 映射）或先给 registry 补该 API。
- `serialize/deserialize` 只在两个 canvas 仪器上实现，**SVG 仪器（vernier-caliper-guide）没有**：host 对未实现 serialize 的仪器要降级处理（缓存 sim state 快照），不要强转契约。
- `onLayoutWillChange/DidChange` 钩子定义在外层 SceneAdapter 上，**不会转发给场景** → host 不能"接钩子"，必须在 `sync()` 内**自检** `attachTo.parentElement` 变化并自动重挂（方案文档 §5.1 已允许此路径，现确认为唯一路径）。

### 8.4 视觉基线确认

`double-slit` 已有双平台视觉基线（`tests/visual/visual-regression.spec.ts-snapshots/double-slit-{desktop,mobile}-{darwin,linux}.png`）。WO-1 改动画布标注后基线会红，须走 `scripts/visual-linux-container.sh update` 更新 Linux 基线（**禁止宿主机直接 update-snapshots**），darwin 基线标注待 Mac 重生成（CI workflow_dispatch 或暂缓并在报告中声明）。

---

## 7. 执行约束（codex 必须遵守）

- TypeScript strict 零错误；禁用 `any`；未使用变量清理干净。
- 遵守 AGENTS.md 全部强制规范（画布响应式、布局扩展、场景删除保护、视觉回归基线规则）。
- 不许下调任何测试/覆盖率/预算阈值来让门禁变绿。
- 每个 WO 完成后跑对应验收命令并附输出摘要；失败不得进入下一 WO。
- 改动 `vite.config.ts`、`scripts/check-bundle-budget.ts`、`tests/contract/*` 前注意这些文件可能受 CODEOWNERS 保护，需在报告中显式声明改动理由。
- 新增代码默认不写注释（项目规范），除非解释非常规决策。

---

## 9. 执行结果与遗留事项（2026-09-20 收尾）

**WO-1/2/3 全部完成并验收通过**，已推送 main（`107afd8..29e9c9b`，5 个提交）：

1. `1d60ec5` fix(scene)：mechanical-energy 视图类型标注（HEAD 既有 strict 报错）。
2. `112eab6` feat(double-slit)：波长教学闭环（WO-1）；顺带登记 variable-work/internal-energy 的 `autoRun` 契约豁免（HEAD 既有漂移）。
3. `29240ed` perf(home)：首页请求链 ~123 → 3（WO-2），registry 聚合 chunk gzip 29.1 kB。
4. `b480380` feat(instruments)：`createInstrumentHost` 挂载层（WO-3），修 R1/R2，double-slit 胶水 244 → ~90 行。
5. `29e9c9b` docs：本方案文档。

验收证据：`pnpm quality:core` 全绿（exit 0）；单测+契约 7096 通过；e2e 全套 425 通过；`pnpm verify:scene double-slit` 7 步全绿；`tests/e2e/measure-simulation.spec.ts` 4/4（含波长校验全路径）。

**遗留事项（随后处理，优先级从高到低）**：

1. **视觉基线欠账**（与本次改动无关，容器两轮实测确认本次改动像素干净）：仓库仅提交了 19/121 个场景的 linux/darwin 基线（各 38 张 PNG），另有 17 个既有基线已随渲染栈/字体漂移而变红。处理方式：走 CI `update_snapshots` workflow_dispatch 做全量基线重建（容器脚本同 CI 一致），不要在宿主机 `--update-snapshots`。
2. §6 延期路线图 12 项（meta 解耦 sim、AST 棘轮堵逃逸、emf-analogy hints、page.ts 样板下沉等），按文档逐项派单执行。

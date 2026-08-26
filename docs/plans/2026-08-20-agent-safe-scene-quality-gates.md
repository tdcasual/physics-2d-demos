# Agent-Safe Scene Quality Gates

> 状态：已完成（交付物已落地：`SceneTestProfile`、`LayoutTestProfile`、`tests/visual/layout-matrix.spec.ts`、
> `tests/contract/layout-contract.spec.ts`、`tests/helpers/scene-profile.ts`、`scripts/check-scenes.ts`、
> `docs/new-scene-agent-contract.md` 等均已存在并生效）
>
> 目标：让 OpenClaw、Hermes 或其他代码代理新增场景时，自动纳入结构、生命周期、响应式布局、移动端 tab、图表、可访问性和构建门禁，最大限度阻止新场景引入回归。

## 背景与边界

本项目允许通过 `import.meta.glob` 自动发现新场景，因此新增场景不应要求代理手动修改 registry。当前单元契约已经动态发现场景，但部分视觉和移动端测试仍维护静态场景列表，导致新场景可能没有进入移动端图表 tab、溢出、可访问性和跨尺寸检查。

本计划解决工程质量问题，不自动判断物理模型是否符合教材或教师意图。物理正确性、教学表达和最终截图仍需要人工审核。

## 设计原则

1. **自动发现优先**：测试从场景 registry 或统一 manifest 获取场景，不在多个测试文件重复维护场景数组。
2. **声明即验证**：场景声明了图表、播放、演示模式或移动 tab 后，通用测试必须验证对应行为。
3. **测试不得自我降级**：代理不得通过修改测试、放宽阈值、跳过 tab 或更新快照来掩盖实现错误。
4. **共享布局谨慎修改**：新场景默认只允许修改 `src/scenes/<id>/` 与 `src/pages/<id>.html`；修改 `app/ui/platform/core` 必须说明影响并增加回归测试。
5. **机器门禁与人工审查分层**：结构和布局由 CI 自动阻断，视觉基线和物理教学质量由人工确认。
6. **失败必须可诊断**：每个门禁失败应输出场景 id、入口、viewport、布局、tab、DOM selector 和实际尺寸。

## 布局扩展原则

质量门禁不能把 `mobile-stack` 当成“移动端布局”的同义词。以后引入新布局时，测试应分成两层：

1. **布局无关的核心契约**：对 `layoutRegistry` 中每一个已注册布局动态执行。检查元数据合法性、必需 slot、`mount/unmount` 幂等性、resize/theme 生命周期、场景渲染不抛错、实际 render surface 可见且尺寸非零，以及销毁后没有残留 DOM 或重复节点。
2. **布局能力适配契约**：由布局元数据声明交互模型和能力，再选择对应测试。例如 `mobile-stack` 声明 tabs，`split-right` 声明同时展示的 split，未来布局可以声明 carousel、fullscreen、tablet-split 或 `custom`，不必伪装成 tabs。

建议为 `LayoutMetadata` 增加与测试相关的声明（名称可按实现调整）：

```ts
type LayoutTestProfile = {
  viewports: Array<{ width: number; height: number }>;
  interactionModel: 'tabs' | 'split' | 'stack' | 'fullscreen' | 'custom';
  supportsSlots: SlotName[];
  requiresGraphActivation?: boolean;
  minCanvasWidth?: number;
  minCanvasHeight?: number;
};
```

规则如下：

- 新布局必须通过 `layoutRegistry` 注册，并提供完整 metadata/profile；测试文件禁止新增硬编码布局 id 列表。
- `control` 和 `animation` 是核心 slot；`header`、`graph`、`readout` 是可选 slot。测试应按 `supportedSlots` 判断兼容性，不能因可选 slot 缺失而报出误导性的 selector 错误。
- 未提供 profile 的布局不得设为 `autoSelectable: true`；可以先以显式 opt-in 的实验布局存在，但必须在进入默认选择路径前补齐契约。
- 每个新布局至少用真实场景覆盖：无 graph、含 graph、含 readout、含 controls；若声明 transport 或其他能力，也必须有对应 fixture。
- 兼容场景应运行在“场景 × 布局 × viewport”矩阵中，并覆盖从已有布局切换到新布局以及切回后的清理。场景不支持的 slot 应报告为“组合不兼容”，而不是静默跳过。
- 只有布局 profile 声明了 tabs，才执行 tab/panel ARIA、激活状态和隐藏 panel 检查；只有声明 graph 激活策略，才要求先激活某个 graph 视图。这样未来布局不会继承不适用的移动 tab 假设。

## 目标架构

### 1. 统一场景测试 manifest

新增平台级测试能力声明，建议挂载到 `SceneMeta` 或与其同源的 `SceneTestProfile`：

```ts
type SceneTestProfile = {
  hasGraph: boolean;
  hasTransport: boolean;
  supportsPresentation: boolean;
  expectedCanvasCount?: number;
};
```

要求：

- `id`、`path`、`hasGraph` 与页面/布局实际行为一致；
- 声明 `hasGraph: true` 时必须实现 `renderGraph` 或 `attachGraphCanvas`；
- 场景 profile 只描述场景需要的能力，不描述某个布局的 tab、panel 或排列方式；
- 布局 profile 声明 graph 如何被激活时，`hasGraph: true` 场景必须在该交互模型下产生可见图表内容；
- `visibleControlKeys` 必须存在于 controls schema 或 imperative controls 的可识别 key 集合；
- manifest 不得成为第二套手工 registry，优先由 `scene.meta.ts` 和页面配置派生。

### 2. 通用场景布局契约

新增 `tests/visual/scene-layout-contract.spec.ts`，动态遍历所有现代场景并覆盖：

- 桌面：`1440x900`；
- 手机：`320x568`、`375x812`；
- 平板/窄桌面：`768x900`；
- 无横向溢出；
- 至少一个激活动画 canvas 或合法 DOM render surface；
- canvas `clientWidth/clientHeight` 大于最小阈值；
- `data-responsive-scale` 存在且位于标准范围；
- 无 `console.error`、`pageerror`；
- 控件区存在且至少有一个可交互控件；
- 主题切换、演示模式切换后页面仍可渲染。

### 3. 交互模型契约

仅对 `LayoutTestProfile.interactionModel === 'tabs'` 的布局执行以下 tab 契约：

- tab button 可见并有 `role="tab"`、`aria-selected`、`aria-controls`；
- 对应 panel 有 `role="tabpanel"`、唯一 id 和 `aria-labelledby`；
- 点击 tab 后只允许目标 panel 为 active；
- active panel 内的 canvas/DOM 内容可见、尺寸合理且不越界；
- inactive panel 可以 `display:none`，但不得被错误地作为 active 内容断言；
- 从 graph tab 切回 control/readout 后场景仍可交互；
- 重复切换 tab 不得重复创建 canvas、丢失图表或产生 console error。

其他交互模型使用各自的适配契约：split/stack 检查并列 slot 的可见性与边界，fullscreen 检查唯一主舞台和退出路径，custom 必须提供明确的布局测试适配器，禁止以“跳过测试”代替实现。

### 4. 图表契约

当 `hasGraph` 为 true 时，通用测试必须：

- 确认 graph slot 存在；
- 激活 graph tab 或 graph layout；
- 确认至少一个 `canvas`、`svg` 或声明的 graph render surface；
- 检查宽高、可见性、四边边界和非空渲染；
- resize 后重新检查尺寸；
- 切换布局或销毁场景后确认无重复节点和 observer 泄漏。

### 5. 可访问性契约

自动检查至少包括：

- canvas 有 `role="img"` 与 `aria-label`；
- tab/panel 的 ARIA 关系完整；
- scene selector 的 radio group 支持 roving tabindex、方向键、Home/End；
- 所有按钮有可访问名称；
- Tab 键遍历不会进入隐藏 panel；
- axe 检查不出现 critical/serious WCAG 违规。

## 实施阶段

### 阶段 A：消除静态场景列表

**目标**：新场景无需修改测试文件即可进入通用 E2E/视觉审计。

**主要文件**：

- `src/platform/scene-contract.ts`
- `src/catalog/scene-registry.ts`
- `tests/visual/usability-mobile.spec.ts`
- `tests/visual/layout-matrix.spec.ts`
- `tests/helpers/scene-profile.ts`
- `tests/visual/visual-regression.spec.ts`
- `tests/visual/a11y-audit.spec.ts`
- `tests/visual/cross-browser-firefox.spec.ts`
- `tests/visual/cross-browser-webkit.spec.ts`

**验收标准**：

- 删除测试中的重复静态 scene array；
- 新建合法场景后，测试列表自动包含它；
- 旧场景数量减少或新增时，测试无需修改；
- 排除项只能通过集中定义的、带理由的测试 profile 配置声明。

### 阶段 B：建立统一 SceneTestProfile

**目标**：让通用测试知道每个场景有哪些布局能力，而不是猜测 DOM。

**主要文件**：

- `src/platform/scene-contract.ts`
- `src/platform/demo-profile.ts`
- `src/app/scene-bootstrapper-types.ts`
- 所有 `src/scenes/*/scene.meta.ts`
- `tests/contract/scene-standard.spec.ts`
- `tests/unit/scene-registry.spec.ts`

**验收标准**：

- 所有场景都有合法 profile；
- profile 能通过运行时导入验证；
- `hasGraph` 与实际 page/layout 配置不冲突；
- controls key 漂移会在单测中失败；
- profile 变更有对应契约测试。

### 阶段 C：实现通用布局与交互模型契约

**目标**：把 chase-meet 的移动图表回归经验推广到所有已注册布局，同时允许未来布局使用不同的交互模型。

**主要文件**：

- 新增 `tests/visual/scene-layout-contract.spec.ts`
- 新增 `tests/contract/layout-contract.spec.ts`
- 新增 `tests/visual/layout-matrix.spec.ts`
- `src/app/layouts/registry.ts`（增加并校验 `LayoutTestProfile`）
- `src/app/layouts/types.ts`（共享 slot/能力类型）
- `src/app/layouts/auto-register.ts`（为内置布局声明 profile）
- `src/app/layouts/layouts/mobile-stack/mobile-stack.ts`
- `src/app/layouts/scene-slot-renderer.ts`
- `src/app/scene-adapter.ts`
- `src/styles/layout/mobile-stack.css`
- `src/styles/scene/*.css`（仅在失败场景需要时修改）

**验收标准**：

- 每个已注册布局和其声明的 viewport 都执行核心布局契约；
- 只有 tabs 布局的 tab 被激活至少一次，其他布局执行对应交互模型适配器；
- 图表 panel 的 canvas/DOM 内容完成可见性和边界检查；
- resize、交互切换、布局切换、dispose 的生命周期均无错误；
- 新增布局只需补充 registry metadata/profile 和适配器 fixture，不修改既有场景测试列表。

### 阶段 D：增强结构与静态检查

**目标**：在浏览器测试前尽早拒绝不完整或越界场景。

**主要文件**：

- `scripts/check-scenes.ts`
- `scripts/new-scene.ts`
- `tests/contract/scene-contract.spec.ts`
- `tests/contract/scene-standard.spec.ts`
- `tests/unit/ci-scripts.spec.ts`

**新增检查**：

- scene id 与目录名、HTML 入口、meta id 一致；
- meta path 指向真实 HTML；
- `demoProfile` 完整且合法；
- `visibleControlKeys` 不得引用不存在的 key；
- `scene.entry.ts` 导出唯一合法工厂；
- `scene.view.ts` 使用响应式 canvas sizing；
- 非 `page.ts` 场景文件不得导入 app/ui；
- 禁止新场景绕过共享 SchemaRenderer 复制控制 DOM，除非使用 `controls.ts` 且有说明。

### 阶段 E：Agent 工作流和文档

**目标**：让 OpenClaw/Hermes 聚焦场景创作，并在修改边界内工作。

**主要文件**：

- `AGENTS.md`
- 新增 `docs/new-scene-agent-contract.md`
- `scripts/new-scene.ts`
- `README.md`
- `.github/workflows/ci.yml`

**Agent 强制规则**：

1. 默认只修改 `src/scenes/<id>/`、`src/pages/<id>.html` 和必要的测试 fixture。
2. 不手动修改 `src/catalog/scene-registry.ts`。
3. 不修改通用测试来绕过失败。
4. 不删除既有场景、基线或契约测试。
5. 不在视觉失败时直接更新 snapshot；必须先确认布局和字体环境。
6. 修改共享 `core/platform/app/ui` 前必须说明影响范围并增加回归测试。
7. 必须运行 `pnpm quality:core`；若环境无法运行视觉测试，必须明确报告未验证项。
8. 新场景必须通过 `320x568`、`375x812`、`768x900`、`1440x900`。
9. 声明图表时必须切换图表 tab 并验证实际内容。
10. 最终报告必须列出修改文件、运行命令、失败项和剩余风险。

### 阶段 F：CI 门禁分层

**目标**：快速失败、错误可诊断、视觉基线不被代理私自重写。

建议 CI 顺序：

```text
check:scenes
check:circular
lint
typecheck
unit tests
build
check:bundle
scene layout contract
a11y E2E
mobile E2E
visual regression
```

要求：

- 结构/类型/单元失败立即阻断；
- 视觉测试使用固定 Linux 字体和平台基线；
- snapshot 更新只能通过显式 workflow_dispatch；
- snapshot 更新流程只上传 artifact，不自动提交或覆盖主分支；
- CI 输出失败场景、viewport、tab、尺寸和截图路径。

## 新场景交付清单

代理创建场景时必须按以下顺序执行：

1. 使用 `pnpm new:scene` 或等价模板生成目录。
2. 完成 `scene.meta.ts`、`scene.sim.ts`、`scene.view.ts`、`scene.entry.ts`、controls、`page.ts` 和 HTML 入口。
3. 声明 `SceneMeta`、`demoProfile` 和 `SceneTestProfile`；不要在场景 profile 中假设 `mobile-stack` 或其他具体布局。
4. 确认所有 controls key 与 `visibleControlKeys` 一致。
5. 确认 canvas 使用标准尺寸函数和 `responsiveScale`。
6. 确认图表能力与 `hasGraph` 一致，并在所有兼容布局的交互模型下验证 graph render surface。
7. 运行静态检查、单测、类型检查、构建和全套场景布局契约。
8. 人工查看桌面和移动端截图，确认无遮挡、裁剪、空白 tab 或过密控件。
9. 只提交场景相关变更和必要的测试 fixture。

## 明确不自动化的内容

- 物理公式是否正确；
- 场景是否符合教材目标；
- 文案、图示和教学顺序是否优秀；
- 动画是否具有足够的教学表达力；
- 视觉截图是否“好看”而不仅是布局不溢出。

这些内容必须由人工审核，不能用“测试通过”替代。

## 完成定义

本计划完成的判定条件：

- 新增合法场景无需修改任何静态测试列表；
- 新场景自动进入结构、生命周期、桌面、移动、兼容布局交互模型、图表和可访问性测试；
- 新增布局只需注册 metadata/profile 并提供适配器，即可自动进入布局矩阵；
- 任意 graph tab 空白、尺寸为 0、越界或重复挂载都会使 CI 失败；
- controls key、meta/profile、HTML 入口不一致会在浏览器测试前失败；
- Agent 规则、创建模板和 CI 命令一致；
- 至少用一个临时测试场景验证“新增后自动纳入、删除后自动移除”的闭环。

## 建议验证命令

```bash
pnpm check:scenes
pnpm check:circular
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
pnpm test:e2e
pnpm test:visual
```

视觉回归仍必须在项目规定的 Linux 容器或 CI 同构环境中执行；宿主机截图只能作为开发参考。

# AGENTS.md — Physics-2D-Demos

> 本文档面向 AI 编码助手。人类贡献者请参考 README.md。

## 项目概述

Physics-2D-Demos 是一个物理教学演示中心（Teaching Demo Hub），当前包含 19 个交互式 2D 物理场景，以及 3 个可按需加载的仪器组件。

- **技术栈**: Vite 7 + TypeScript 5.9 (strict) + React 18 + Tailwind CSS v4
- **测试**: Vitest 3.2 (单元/契约) + Playwright (E2E/视觉)
- **构建产物**: 体积预算与实测口径以 `scripts/check-bundle-budget.ts` 为唯一权威（预算值：首页 JS 190 kB / CSS 25 kB；场景页 JS 180 kB / CSS 55 kB；vendor 160 kB；shared 150 kB；当前无入口级覆盖）。实测数字随构建变化，不在本文固化，运行 `pnpm check:bundle` 获取当前值
- **Runtime 依赖**: 仅 3 个（preact / react / react-dom）
- **线上地址**: <https://x.infinitas.fun>

## 部署

**<https://x.infinitas.fun> 即本仓库的线上部署**。部署是**自动**的：推送到 GitHub（`origin/main`）后通常**几分钟内**完成，无需手动操作。

对 AI 助手的含义：

- 改动合并/推送到 `main` 即视为即将上线，提交前务必跑 `pnpm quality:core`。
- 推送后如需验证线上效果，等待几分钟再访问 <https://x.infinitas.fun>。
- 不要在本仓库内寻找或修改部署脚本/CI 发布配置——发布由仓库之外的自动化流程完成。

## 架构分层

```
core/          — 物理引擎、数学工具、Canvas 渲染基础设施
               — 无上层依赖
platform/      — 平台契约、标准定义、viewport、输入抽象
               — 无 app/ui/scenes 依赖
               — 关键文件: scene-contract.ts, controls-schema.ts, standards.ts
catalog/       — 场景注册表（自动发现）
               — 仅依赖 platform/
app/           — 布局系统、场景引导器、首页
               — 可依赖 platform/core/ui
ui/            — 共享组件库（DOM widgets）
               — 可依赖 platform/core
scenes/        — 19 个物理场景（每个: meta/sim/view/entry/controls/page）
               — 场景由 catalog/scene-registry.ts 自动发现（import.meta.glob）
               — 非 page.ts 不依赖 app/ui；可依赖 instruments
instruments/   — 3 个可按需加载的仪器组件（meta/sim/entry/controls-schema）
               — 可被 scenes 依赖；不依赖 app/ui/scenes
               — 渲染技术按元素密度选择：刻度盘/读数窗类默认 SVG（meta
                 声明 renderTech: 'svg'，view 在 canvas 旁插 <svg> 兄弟节点），
                 密集条纹/图案类用 Canvas；详见 src/instruments/STANDARDS.md 第 3 节
```

### 依赖规则（ESLint 强制执行）

- `core` → 不依赖任何上层
- `platform` → 不依赖 app/ui/scenes
- `scenes/*.ts`（非 page.ts）→ 不依赖 app/ui，含声明式 `controls-schema.ts` 与 imperative `controls.ts`
- `instruments` → 不依赖 app/ui/scenes
- `app` → 可依赖 platform/core/ui
- `ui` → 可依赖 platform/core（不依赖 app/scenes/catalog/instruments）

## 新增场景指南

> **代理（OpenClaw 等）新增场景时，先读 [`docs/new-scene-agent-contract.md`](docs/new-scene-agent-contract.md) 执行卡**——按步执行、只需记住 `pnpm verify:scene <id>` 一条验证命令。本节是结构参考，控件写法见 [`docs/controls-cookbook.md`](docs/controls-cookbook.md)，sim 测试写法见 [`docs/physics-testing-guide.md`](docs/physics-testing-guide.md)。

新增一个场景只需 **6 个文件**（无需修改 registry）：

```
src/scenes/<id>/
  scene.meta.ts      — SceneMeta 导出（自动发现）
  scene.sim.ts       — 物理模拟逻辑
  scene.view.ts      — Canvas 渲染
  scene.entry.ts     — sim + view 组装
  controls-schema.ts — 声明式控制面板（推荐）或 controls.ts（复杂动态场景）
  page.ts            — bootScenePage({ meta, createScene, createControls })
```

HTML 入口**不是真实文件**：`scripts/vite-plugin-scene-pages.ts` 从
`src/scenes/*/scene.meta.ts` 自动派生虚拟场景页（内容 = 统一同构模板：
`#app` 挂载点 + `<script type="module" src="../scenes/<id>/page.ts">`，
`<title>` 取 `SceneMeta.title + " - 物理演示"`），dev URL
（`/src/pages/<id>.html`）与 build 产物路径（`dist/src/pages/<id>.html`）
与历史手抄文件完全一致，测试 URL 无需变化。`src/pages/` 下只保留工具页
真实文件（清单见 `scripts/utility-pages.ts`），`pnpm check:scenes` 会拒绝
任何其他真实 HTML（防手抄回潮）。主题防闪烁脚本仍由
`scripts/vite-plugin-theme-noflash.ts`（transformIndexHtml）在 dev 与 build
时统一注入所有 HTML（含虚拟场景页），唯一模板改动需同步
`src/app/theme-store.ts` 的存储格式。

### controls-schema.ts 示例

```typescript
import type { ControlsSchema } from '../../platform/controls-schema';

export const mySceneControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'v0',
          label: 'v₀',
          min: 0,
          max: 80,
          step: 0.5,
          value: 30,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '预设',
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          presets: [{ id: 'earth', label: '地球' }],
          initialActive: 'earth'
        }
      ]
    }
  ]
};
```

### page.ts 最小模板

```typescript
import { bootScenePage } from '../../app/scene-bootstrapper';
import { createMyScene } from './scene.entry';
import { mySceneMeta } from './scene.meta';
import { mySceneControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: mySceneMeta,
  createScene: ({ canvas, theme, mode }) =>
    createMyScene({ canvas, theme, mode }),
  createControls: ({ mount, scene, writeParam }) => {
    return renderSchema({
      mount,
      schema: mySceneControlsSchema,
      onChange: (key, value) => {
        /* 处理参数变化 */
        writeParam?.(key, value);
      },
      onAction: (key) => {
        /* 处理按钮点击 */
      }
    });
  }
});
```

### URL 参数同步（自动管线，无需样板）

`bootScenePage` 内置声明式 URL 参数管线（`applySceneUrlParams`，见
`src/app/url-sync.ts`），page.ts **不要再手写** `readSceneParams` 循环：

- **应用**：管线在 createControls 返回后统一执行
  `readSceneParams → scene.setParams（无 setParams 时退回 setParam 单键 API）
→ createControls 返回句柄回写（数值走 setValue；字符串或
`paramSync.activeKeys` 走 setActive）→ URL 非空时同步首绘`。
  合法键集合 = `defaultParams ∪ urlSyncKeys ∪ {preset}`（`resolveUrlSyncKeys`）。
- **写回**：createControls 上下文注入 `writeParam(key, value)`，
  等价旧样板的 `writeSceneParams({ [key]: value })` 但自动过滤非法键。
- **上下文注入**：`urlParams`（合法参数只读快照，供建 UI 前必须知悉参数的
  场景使用，如 double-slit 按 step 选 schema）。
- **逃生口**：`ScenePageOptions.paramSync` —— `paramMap`（meta 键 → sim 键，
  如 projectile 的 v0→speed）、`activeKeys`、`applyParam`（单键接管，返回
  true 跳过默认处理）、`applyAll`（整体接管含首绘，用于批量约束语义）、
  `afterApply`（默认管线后、首绘前）。

**已知限制**：

- `emf-analogy` 无对象式 `setParams`（`defaultParams` 已清空）。`mechanical-wave`
  仅有 `setParam` 单键 API，URL 管线会 fallback。覆盖率实测约 80%，禁止下调
  `vite.config.ts` 阈值来掩盖缺口。
- 布局重建重跑管线时，若落在 `writeParam` 150ms debounce 窗口内，存在理论性
  回灌竞态（窗口极小，非新引入）。

### 控制区列布局范式

`controlColumns: 'auto'` 启用智能分列（推荐设为默认）。每个 section（一张卡片）根据内容自动决定宽度：

- **含 `slider` 或 `text` 字段** → SchemaRenderer 自动标记 `data-span="full"`，占满整行
- **只含按钮/预设/选择器/transport** → 参与 `auto-fit` 多列并排（最小 220px）
- **手动创建卡片** → 使用 `createControlCard('标题', { span: 'full' })` 显式声明

CSS 规则：`[data-span='full'] { grid-column: 1 / -1; }`，无论当前是 1/2/3 列均生效。

**DOM 顺序原则**：先排可并列的窄卡片，最后排必须全宽的卡片，让窄卡片优先在同一行并排。例如：

```
DOM: [场景选择] [预设按钮] [观察点管理] → [含滑块的参数区 全宽]
布局: [场景] [预设] [管理]   ← 一行三列（或自动换行）
      [参数区 ────────────]  ← 全宽
```

**Section 也可显式声明**（escape hatch，用于 `custom` 类型等）：

```typescript
{ title: '原理说明', collapsed: true, span: 'full', fields: [{ type: 'custom', ... }] }
```

## 关键类型

### SceneMeta（scene-contract.ts）

```typescript
export type SceneMeta = ScenePlacardMeta & {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  objective: string;
  defaultParams: Record<string, number>;
  description?: string; // Hero 展示用
  difficulty?: 1 | 2 | 3;
  icon?: string;
  category?: 'mechanics' | 'electromagnetism' | 'method';
  featured?: boolean; // true 则出现在首页 Hero
  urlSyncKeys?: string[]; // 额外允许通过 URL query 同步的参数
  demoProfile?: SceneDemoProfile; // 演示模式配置（可选）
  testProfile?: SceneTestProfile; // 测试能力（真实场景由契约测试强制声明）
};

// ScenePlacardMeta（必填，用于生成标题卡片）：
// { subject: string; concept: string; subConcepts: [string, string] }
// SceneTestProfile = { hasGraph; hasTransport; supportsPresentation }
```

### ControlField（controls-schema.ts）

支持 12 种字段类型：`slider` | `number` | `text` | `select` | `button` | `toggle` | `preset-group` | `transport` | `scene-selector` | `button-grid` | `hint` | `custom`

`hint` 为静态提示文本（`{ key, label?, lines: string[] }`），逐行渲染为 `<p>`，颜色用 `var(--text-secondary)`，不参与 onChange。优先用 `hint` 表达纯文本说明，避免手写 `custom`。

## 编码规范

### TypeScript

- `strict: true` 必须保持零错误
- 禁用 `any`，优先用 `unknown` + 类型守卫或具体接口
- 未使用变量必须清理（ESLint `no-unused-vars`）

### DOM 组件

- 纯 DOM 操作（非 React 组件），使用 `document.createElement`
- 样式优先使用 Tailwind 类名，主题变量用 CSS custom properties (`var(--text-primary)`)
- 共享组件放在 `ui/components/scene-controls/`，新场景不复刻 DOM 风格

### 测试

- 单元测试放在 `tests/unit/*.spec.ts`
- DOM 组件测试使用 `happy-dom` 环境（已全局配置）
- Playwright 行为测试放在 `tests/e2e/*.spec.ts`，布局、无障碍、视觉与跨浏览器测试放在 `tests/visual/*.spec.ts`
- 覆盖率阈值以 `vite.config.ts` 为准：lines 65%, functions 65%, branches 70%, statements 65%

### 视觉回归基线规则（强制）

`visual-regression.spec.ts` 的截图基线**按平台分文件**：`*-darwin.png`（Mac）与
`*-linux.png`（`scripts/visual-linux-container.sh`）。像素级截图无法跨平台复现（CJK 字体光栅化
不同），**禁止**把两套基线合并成单一"平台中立"文件。

- Linux 像素唯一权威是 `scripts/visual-linux-container.sh`（ubuntu:24.04 +
  `fonts-noto-cjk`）。CI 的 visual-regression 与 `workflow_dispatch →
update_snapshots` **调用同一脚本**，不是 runner 上裸跑 PNG。
- 禁止在 Linux 宿主机 `--update-snapshots` / `pnpm test:visual:update`：会用错误光栅覆盖
  `*-linux.png`（路径模板按 `process.platform` 分文件，不会写成 darwin 文件名）。
- 改动 UI 后 Linux 基线过期：`scripts/visual-linux-container.sh update`，或 CI
  `update_snapshots` 下载 artifact 后提交。Mac 基线在 Mac 上
  `pnpm test:visual:update`，或用 `update-darwin-snapshots.yml`
  （workflow_dispatch，macos-latest，渲染栈与 Mac 本地一致）重生成后下载 artifact 提交。
- Linux 基线必须在装有 `fonts-noto-cjk` 的 ubuntu:24.04 容器内生成，保证渲染字体为
  `Noto Sans CJK SC`（见 `design-tokens.css` 字体栈）。
- 移动端断言遍历 canvas 时必须跳过非激活 tab 面板（`.mobile-tab-panel:not(.active)`
  内的 canvas 是 display:none，尺寸为 0 属设计如此），或先切换到目标 tab 再断言。
- 像素覆盖清单 = 自动发现的全部场景 − spec 内 `SNAPSHOT_OPT_OUT` 显式豁免
  （每个条目须带理由注释）。新增场景默认纳入像素覆盖，首次须生成两套平台基线。

### 场景删除保护规则（强制）

**任何涉及 `src/scenes/*` 目录的删除操作，必须经过双重确认：**

1. **检查 registry 引用**: 确认该场景不在 `src/catalog/scene-registry.ts` 的自动发现路径中（glob 模式 `/src/scenes/*/scene.meta.ts`）
2. **检查跨文件引用**: 运行 `grep -r "scene-id" src/ tests/` 确认无残留引用
3. **检查构建产物**: 删除后必须运行 `pnpm build`，确认无 chunk 缺失错误
4. **HTML 入口无需处理**: 场景页 HTML 由 `vite-plugin-scene-pages` 虚拟生成，删除场景目录后入口自动消失，不存在孤儿 HTML；`src/pages/` 下新增真实 HTML 会被 `pnpm check:scenes` 拒绝（仅 `scripts/utility-pages.ts` 清单内的工具页除外）

**历史教训**: `spring-oscillator`（弹簧振子）曾因未迁移到 controls-schema 命名规范，被误判为 dead code 而误删。场景控制面板可以是 `controls-schema.ts`（声明式）或 `controls.ts`（imperative），两者均为有效形态。

### 提交前检查

```bash
pnpm verify:scene <id>  # 场景任务的一站式验证（结构→lint→类型→测试→构建→预算，失败即停给修复指引）
pnpm quality:core # 快速门禁（结构/脚手架/布局/循环依赖/audit/lint/format/类型/覆盖率/构建/预算）
pnpm quality:full # 完整本地质量门禁（在 core 之上追加 E2E 与视觉测试）
pnpm check:audit # 依赖漏洞审计（CI 亦执行；overrides 见 pnpm-workspace.yaml）
```

契约/基线/门禁脚本受 `.github/CODEOWNERS` 保护；CI 失败时 Job Summary 附 `.github/ci-failure-triage.md` 分诊表。

Husky pre-commit 自动运行 `lint-staged`（eslint --fix + prettier --write）。

## Canvas 响应式渲染规范（强制）

所有场景的 `scene.view.ts` 必须遵循以下规范，以避免移动端元素过大/过小：

### 1. 禁止使用裸数字（magic number）定义元素尺寸

❌ 错误示例：

```typescript
ctx.arc(x, y, 45, 0, Math.PI * 2); // 45px 固定半径
ctx.fillText(label, x, y + 65); // 65px 固定偏移
const pipeHeight = Math.max(143, h * 0.24); // 143px 固定高度
```

✅ 正确示例：

```typescript
const scale = parseFloat(canvas.dataset.responsiveScale || '1');
ctx.arc(x, y, 45 * scale, 0, Math.PI * 2);
ctx.fillText(label, x, y + 65 * scale);
const pipeHeight = Math.max(110 * scale, h * 0.22);
```

### 2. 使用标准工具函数

`src/core/canvas-sizing.ts` 提供统一的响应式缩放：

```typescript
import { getResponsiveScale } from '../../core/canvas-sizing';

function resize() {
  const ctx = sizeCanvasToFill(canvas);
  // canvas.dataset.responsiveScale 已自动设置
  const scale = parseFloat(canvas.dataset.responsiveScale || '1');
  // 所有绘制尺寸基于 scale
}
```

`getResponsiveScale(width, height, referenceSize?)` 基于 canvas 短边与参考尺寸的比例计算：

- 桌面端（短边 ~500px）→ scale ≈ 0.8~1.0
- 移动端（短边 ~200px）→ scale ≈ 0.3~0.5
- 返回值范围: **[0.3, 1.5]**

### 3. 参考实现

- **projectile**（最简模式）：`scale = Math.min(width / 800, height / 600)`
- **chase-meet**（标准模式）：`resolveVisuals(mode, cssW, cssH)` 内部使用 `getResponsiveScale`
- **emf-analogy**（复杂模式）：`drawFlowArea` 接收 width/height，内部计算 `responsiveScale`

### 4. 审查清单

新增场景 PR 必须通过以下检查：

- [ ] `scene.view.ts` 中没有大于 50 的裸数字用于元素尺寸
- [ ] 使用了 `canvas.dataset.responsiveScale` 或 `getResponsiveScale`
- [ ] Playwright 移动端截图通过审查（无元素遮挡、无过度拥挤）

`scene-standard.spec.ts` 对未来新增场景实施 AST 棘轮：Canvas 空间参数和尺寸变量中大于 50 的数值必须由 scale、viewport 尺寸或标准 token 推导。现有历史场景使用冻结豁免清单，禁止把新场景加入该清单来绕过失败。

## 布局扩展规范（强制）

场景不得假设 `mobile-stack` 是唯一移动布局。布局由 `src/app/layouts/registry.ts` 动态注册，测试通过 `LayoutMetadata.layoutTestProfile` 识别其交互模型。

- 新布局必须声明 `supportedSlots`、约束和 `layoutTestProfile`。
- 内置布局经 `registerLazyLayout` 惰性注册（构造器首次使用时动态 import，元数据保持 eager）；新增布局若希望拆出独立 chunk，同样用 `registerLazyLayout` 而非静态 import。
- 所有注册布局都必须声明 `layoutTestProfile`，无论 `autoSelectable` 是否为 `true`；手动或实验布局不能绕过布局矩阵。
- `layoutTestProfile.interactionModel` 只能描述实际模型：`tabs`、`split`、`stack`、`fullscreen` 或 `custom`。
- `control` 与 `animation` 是核心 slot；`header`、`graph`、`readout` 按能力兼容，不得要求每个场景填充所有 slot。
- 不得在视觉测试中新增固定布局 id 数组。布局矩阵从 registry 自动发现，模型特有断言放在对应适配器中。
- 新布局至少要用一个无 graph 场景、一个有 graph 场景和一个带控件/读数的场景验证，并覆盖 profile 声明的 viewport。
- 可使用 `?layout=<registered-id>` 强制浏览器测试某个已注册布局；未知 id 必须回退到页面默认布局。
- 布局矩阵会自动检查活跃 Canvas 非空、尺寸达标、处于 slot 水平边界内且 `responsiveScale` 在 `[0.3, 1.5]`；tab 布局会先激活对应面板再检查 graph。

详细的代理工作流、允许修改范围和失败报告格式见 [`docs/new-scene-agent-contract.md`](docs/new-scene-agent-contract.md)。

## 已知限制

- `spring-oscillator` 与 `ganshe` 使用 imperative `controls.ts`（动态增删振子 / 观察点管理）。这两个文件 import ui 层组件，属 ESLint `no-restricted-imports` 的既有豁免（行内 disable 注释）；ganshe 为混合形态（`controls-schema.ts` + imperative 卡片），spring-oscillator 为纯 imperative（无 controls-schema.ts）
- chase-meet 的表达式解析器语义（除零得 0、悬挂操作符补 0、多余 token 静默丢弃）已被 `tests/unit/chase-meet-expression-parser.spec.ts` 固化为特征化契约；「修正」parser 前须先改测试，否则会被该契约挡住。
- E2E 套件当前稳定：本地连续 3 次完整运行（含 `--repeat-each=2` 加压，累计 304 次执行）全部通过，早期文档所述「35 个不稳定测试」已不复现。若 CI 偶发超时，优先排查浏览器/资源环境而非测试本身。

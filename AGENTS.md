# AGENTS.md — Physics-2D-Demos

> 本文档面向 AI 编码助手。人类贡献者请参考 README.md。

## 项目概述

Physics-2D-Demos 是一个物理教学演示中心（Teaching Demo Hub），当前包含 16 个交互式 2D 物理场景，以及 4 个可按需加载的仪器组件。

- **技术栈**: Vite 7 + TypeScript 5.9 (strict) + React 18 + Tailwind CSS v4
- **测试**: Vitest 3.2 (单元/契约) + Playwright (E2E/视觉)
- **构建产物**: 体积预算与实测口径以 `scripts/check-bundle-budget.ts` 为唯一权威（预算值：首页 JS 190 kB / CSS 25 kB；场景页 JS 180 kB / CSS 55 kB；vendor 160 kB；shared 150 kB；个别复杂场景有入口级覆盖，详见脚本）。实测数字随构建变化，不在本文固化，运行 `pnpm check:bundle` 获取当前值
- **Runtime 依赖**: 仅 2 个（react / react-dom）
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
scenes/        — 16 个物理场景（每个: meta/sim/view/entry/controls/page）
               — 场景由 catalog/scene-registry.ts 自动发现（import.meta.glob）
               — 非 page.ts 不依赖 app/ui；可依赖 instruments
instruments/   — 4 个可按需加载的仪器组件（meta/sim/entry/controls-schema）
               — 可被 scenes 依赖；不依赖 app/ui/scenes
```

### 依赖规则（ESLint 强制执行）

- `core` → 不依赖任何上层
- `platform` → 不依赖 app/ui/scenes
- `scenes/*.ts`（非 page.ts）→ 不依赖 app/ui，含声明式 `controls-schema.ts` 与 imperative `controls.ts`
- `instruments` → 不依赖 app/ui/scenes
- `app` → 可依赖 platform/core/ui
- `ui` → 可依赖 platform/core（不依赖 app/scenes/catalog/instruments）

## 新增场景指南

新增一个场景只需 **7 个文件**（无需修改 registry）：

```
src/scenes/<id>/
  scene.meta.ts      — SceneMeta 导出（自动发现）
  scene.sim.ts       — 物理模拟逻辑
  scene.view.ts      — Canvas 渲染
  scene.entry.ts     — sim + view 组装
  controls-schema.ts — 声明式控制面板（推荐）或 controls.ts（复杂动态场景）
  page.ts            — bootScenePage({ meta, createScene, createControls })

src/pages/<id>.html  — HTML 入口（vite 自动扫描）
```

HTML 入口约定（`pnpm check:scenes` 强制）：必须含 `#app` 挂载点与相对路径
`<script type="module" src="../scenes/<id>/page.ts"></script>`；禁止内联
`<canvas id="scene-canvas">` / `<div id="controls">` 死标记（bootScenePage 只挂载
#app，不会清理这些节点）；禁止手抄主题防闪烁脚本——它由
`scripts/vite-plugin-theme-noflash.ts`（transformIndexHtml）在 dev 与 build
时统一注入所有 HTML，唯一模板改动需同步 `src/app/theme-store.ts` 的存储格式。

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
  createControls: ({ mount, scene }) => {
    return renderSchema({
      mount,
      schema: mySceneControlsSchema,
      onChange: (key, value) => {
        /* 处理参数变化 */
      },
      onAction: (key) => {
        /* 处理按钮点击 */
      }
    });
  }
});
```

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

支持 11 种字段类型：`slider` | `number` | `text` | `select` | `button` | `toggle` | `preset-group` | `transport` | `scene-selector` | `button-grid` | `custom`

## 编码规范

### TypeScript

- `strict: true` 必须保持零错误
- 禁用 `any`，优先用 `unknown` + 类型守卫或具体接口
- 未使用变量必须清理（ESLint `no-unused-vars`）

### DOM 组件

- 纯 DOM 操作（非 React 组件），使用 `document.createElement`
- 样式优先使用 Tailwind 类名，主题变量用 CSS custom properties (`var(--text-primary)`)
- 共享组件放在 `ui/components/SceneControls.ts`，新场景不复刻 DOM 风格

### 测试

- 单元测试放在 `tests/unit/*.spec.ts`
- DOM 组件测试使用 `happy-dom` 环境（已全局配置）
- Playwright 行为测试放在 `tests/e2e/*.spec.ts`，布局、无障碍、视觉与跨浏览器测试放在 `tests/visual/*.spec.ts`
- 覆盖率阈值以 `vite.config.ts` 为准：lines 65%, functions 65%, branches 70%, statements 65%

### 视觉回归基线规则（强制）

`visual-regression.spec.ts` 的截图基线**按平台分文件**：`*-darwin.png`（Mac）与
`*-linux.png`（CI / ubuntu 容器）。像素级截图无法跨平台复现（CJK 字体光栅化
不同），**禁止**把两套基线合并成单一"平台中立"文件。

- 改动 UI 后基线过期：Linux 基线用 `scripts/visual-linux-container.sh update`
  （CI 同构 ubuntu 容器）或 CI 重生成（ci.yml 的
  `workflow_dispatch → update_snapshots`，下载 artifact 后提交）；Mac 基线在
  Mac 上 `pnpm test:visual:update`，或用
  `update-darwin-snapshots.yml`（workflow_dispatch，macos-latest runner，
  渲染栈与 Mac 本地一致）重生成后下载 artifact 提交。
- Linux 基线的权威校验同样在容器内进行：`scripts/visual-linux-container.sh`。
  宿主机直接跑 visual-regression 会因字体/光栅化环境漂移而仅供参考。
- Linux 基线必须在装有 `fonts-noto-cjk` 的 ubuntu 环境生成，保证渲染字体为
  `Noto Sans CJK SC`（见 `design-tokens.css` 字体栈与 ci.yml 的字体安装步骤）。
- 移动端断言遍历 canvas 时必须跳过非激活 tab 面板（`.mobile-tab-panel:not(.active)`
  内的 canvas 是 display:none，尺寸为 0 属设计如此），或先切换到目标 tab 再断言。
- 像素覆盖清单 = 自动发现的全部场景 − spec 内 `SNAPSHOT_OPT_OUT` 显式豁免
  （每个条目须带理由注释）。新增场景默认纳入像素覆盖，首次须生成两套平台基线。

### 场景删除保护规则（强制）

**任何涉及 `src/scenes/*` 目录或 `src/pages/*.html` 的删除操作，必须经过双重确认：**

1. **检查 registry 引用**: 确认该场景不在 `src/catalog/scene-registry.ts` 的自动发现路径中（glob 模式 `/src/scenes/*/scene.meta.ts`）
2. **检查跨文件引用**: 运行 `grep -r "scene-id" src/ tests/` 确认无残留引用
3. **检查构建产物**: 删除后必须运行 `pnpm build`，确认无 chunk 缺失错误
4. **检查 HTML 入口**: 确认 `src/pages/<scene-id>.html` 是否同时被删除

**历史教训**: `spring-oscillator`（弹簧振子）曾因未迁移到 controls-schema 命名规范，被误判为 dead code 而误删。场景控制面板可以是 `controls-schema.ts`（声明式）或 `controls.ts`（imperative），两者均为有效形态。

### 提交前检查

```bash
pnpm quality:core # 快速门禁（lint + typecheck + 覆盖率测试 + 构建 + bundle 预算）
pnpm quality:full # 完整本地质量门禁（在 core 之上追加 E2E 与视觉测试）
pnpm check:audit # 依赖漏洞审计（CI 亦执行；overrides 见 pnpm-workspace.yaml）
```

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
- E2E 套件当前稳定：本地连续 3 次完整运行（含 `--repeat-each=2` 加压，累计 304 次执行）全部通过，早期文档所述「35 个不稳定测试」已不复现。若 CI 偶发超时，优先排查浏览器/资源环境而非测试本身。

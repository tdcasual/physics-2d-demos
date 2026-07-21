# AGENTS.md — Physics-2D-Demos

> 本文档面向 AI 编码助手。人类贡献者请参考 README.md。

## 项目概述

Physics-2D-Demos 是一个物理教学演示中心（Teaching Demo Hub），当前包含 16 个交互式 2D 物理场景，以及 2 个可按需加载的仪器组件演示页面。

- **技术栈**: Vite 7 + TypeScript 5.9 (strict) + React 18 + Tailwind CSS v4
- **测试**: Vitest 3.2 (单元/契约) + Playwright (E2E/视觉)
- **构建产物**: ~560KB JS（32 个 chunk），完整 dist（含 18 个 HTML 入口与 CSS）约 1.1MB
- **Runtime 依赖**: 仅 4 个（React 生态）

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
               — 非 page.ts 不依赖 app/ui
```

### 依赖规则（ESLint 强制执行）

- `core` → 不依赖任何上层
- `platform` → 不依赖 app/ui/scenes
- `scenes/*.ts`（非 page.ts）→ 不依赖 app/ui
- `app` → 可依赖 platform/core/ui
- `ui` → 可依赖 platform/core

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
export type SceneMeta = {
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
};
```

### ControlField（controls-schema.ts）

支持 10 种字段类型：`slider` | `number` | `text` | `select` | `button` | `preset-group` | `transport` | `scene-selector` | `button-grid` | `custom`

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
- E2E 测试放在 `tests/visual/*.spec.ts`
- 覆盖率阈值以 `vite.config.ts` 为准：lines 40%, functions 60%, branches 45%, statements 40%

### 场景删除保护规则（强制）

**任何涉及 `src/scenes/*` 目录或 `src/pages/*.html` 的删除操作，必须经过双重确认：**

1. **检查 registry 引用**: 确认该场景不在 `src/catalog/scene-registry.ts` 的自动发现路径中（glob 模式 `/src/scenes/*/scene.meta.ts`）
2. **检查跨文件引用**: 运行 `grep -r "scene-id" src/ tests/` 确认无残留引用
3. **检查构建产物**: 删除后必须运行 `pnpm build`，确认无 chunk 缺失错误
4. **检查 HTML 入口**: 确认 `src/pages/<scene-id>.html` 是否同时被删除

**历史教训**: `spring-oscillator`（弹簧振子）曾因未迁移到 controls-schema 命名规范，被误判为 dead code 而误删。场景控制面板可以是 `controls-schema.ts`（声明式）或 `controls.ts`（imperative），两者均为有效形态。

### 提交前检查

```bash
pnpm quality:full # 完整本地质量门禁
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

## 已知限制

- `spring-oscillator` 使用 imperative `controls.ts`（动态增删振子），已通过 `custom` 字段兼容 controls-schema 系统
- E2E 中 35 个测试不稳定（超时/元素定位），与 schema 迁移无关

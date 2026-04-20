# AGENTS.md — Physics-2D-Demos

> 本文档面向 AI 编码助手。人类贡献者请参考 README.md。

## 项目概述

Physics-2D-Demos 是一个物理教学演示中心（Teaching Demo Hub），包含 7 个交互式 2D 物理场景（抛体运动、追及相遇、静电起电、电路水流类比、电场线演化、微元法、弹簧振子）。

- **技术栈**: Vite 7 + TypeScript 5.9 (strict) + React 18 + Tailwind CSS v4
- **测试**: Vitest 3.2 (单元/契约) + Playwright (E2E/视觉)
- **构建产物**: ~784KB，22 个 JS chunk
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
scenes/        — 7 个物理场景（每个: meta/sim/view/entry/controls/page）
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
  controls-schema.ts — 声明式控制面板（推荐）或 controls-v4.ts
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
- 覆盖率阈值: lines 10%, functions 10%, branches 5%, statements 10%

### 提交前检查

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
pnpm test:e2e    # Playwright
pnpm build       # Vite
```

Husky pre-commit 自动运行 `lint-staged`（eslint --fix + prettier --write）。

## 已知限制

- `spring-oscillator` 使用 imperative controls（动态增删振子），不支持纯 schema
- `ui/control-layout.ts` 有未使用的 legacy 代码（预留未来布局重构）
- E2E 中 35 个测试不稳定（超时/元素定位），与 schema 迁移无关

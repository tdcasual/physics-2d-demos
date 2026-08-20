# 新场景代理契约

本文档供 OpenClaw、Hermes 及其他代码代理执行新增场景任务时使用。目标是让代理专注于物理场景创作，同时让共享布局和质量门禁自动保护现有行为。

## 工作边界

默认只修改：

- `src/scenes/<id>/`
- `src/pages/<id>.html`
- 必要的场景单测或测试 fixture

不要手动修改 `src/catalog/scene-registry.ts`。场景由 glob 自动发现。修改 `src/app`、`src/ui`、`src/platform`、`src/core` 或共享样式前，必须先说明影响范围，并增加针对回归的测试。

## 场景交付要求

1. 使用 `pnpm new:scene` 或现有场景结构创建 `scene.meta.ts`、`scene.sim.ts`、`scene.view.ts`、`scene.entry.ts`、controls、`page.ts` 和 HTML 入口。
2. `SceneMeta.id`、目录名、HTML 文件名和 `path` 必须一致。
3. controls 优先使用 `controls-schema.ts` 和共享 `SchemaRenderer`；使用 imperative `controls.ts` 时说明原因。
4. `scene.view.ts` 使用标准 canvas sizing 和 `responsiveScale`，不要用固定裸数字决定移动端元素尺寸。
5. 场景只声明自身能力：是否有 graph、transport、readout、presentation；不要把 `mobile-stack`、tab id 或某个布局的 CSS selector 写入场景 profile。
6. graph 场景必须实现 `renderGraph` 或 `attachGraphCanvas`，并在每种兼容交互模型下产生实际 render surface。

## 布局交付要求

新增布局时才修改 `src/app/layouts`：

- 通过 `registerLayout` 注册，不在测试文件中复制布局列表。
- 提供 `supportedSlots` 和 `layoutTestProfile`。
- `interactionModel: 'tabs'` 才需要 tab/panel ARIA 和激活状态；split、fullscreen、custom 使用自己的适配器契约。
- `autoSelectable: true` 必须有 profile；profile 的 viewport 必须覆盖布局实际支持的设备尺寸。
- 至少验证无 graph、含 graph、含 controls/readout 的真实场景，并验证布局切换后的 DOM 清理。

## 必跑命令

```bash
pnpm check:scenes
pnpm check:layouts
pnpm check:circular
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
```

若环境允许浏览器运行，再执行 `pnpm test:e2e` 和 `pnpm test:visual`。视觉失败不能直接更新 snapshot；先确认 viewport、字体、布局和实际 DOM。移动 tab 的非激活 panel 中 canvas 可以是 `display:none`，断言前必须激活目标 tab 或过滤非激活 panel。

## 失败报告格式

最终报告必须列出：

- 修改文件和每个文件的目的；
- 运行过的命令及通过/失败结果；
- 失败场景、布局 id、interaction model、viewport、tab（如适用）、selector 和实际尺寸；
- 未运行的检查及原因；
- 仍需人工确认的物理正确性、教学表达和视觉质量风险。

代理不得通过删除测试、增加无理由 skip、放宽尺寸阈值、改写共享契约或直接覆盖视觉基线来消除失败。

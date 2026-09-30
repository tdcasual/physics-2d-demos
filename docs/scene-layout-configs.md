# 场景布局配置参考

> 数据快照：2026-08。各场景的具体取值以对应 `src/scenes/<id>/page.ts` 为准。

## 布局系统与配置入口

所有场景通过 `bootScenePage()`（`src/app/scene-bootstrapper.ts`）接入布局母版系统，
布局由 `src/app/layouts/registry.ts` 动态注册（如 `split-right`、`mobile-stack` 等）。
场景通过 `page.ts` 中的 `layoutConfig` 配置键向布局传递自定义参数：

```typescript
bootScenePage({
  meta: mySceneMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.38,
    hasGraph: true,
    controlColumns: 'auto',
    readoutCollapsed: true
  },
  createScene: ({ canvas, theme, mode }) =>
    createMyScene({ canvas, theme, mode }),
  createControls: ({ mount, scene }) =>
    renderSchema({ mount, schema, onChange })
});
```

`layoutConfig` 在类型上是 `Record<string, unknown>`（见
`src/app/scene-bootstrapper-types.ts` 的 `ScenePageOptions`），由各布局实现自行消费，
并非全局统一 schema。

## 常用配置键（按布局实现消费）

| 键                 | 类型                    | 消费方                          | 说明                                   |
| ------------------ | ----------------------- | ------------------------------- | -------------------------------------- |
| `defaultLeftRatio` | number（比例）          | split-right 系列                | 左栏默认宽度占比，如 `0.38` = 38%      |
| `leftMinWidth`     | number（px）            | split-right 系列                | 左栏最小宽度                           |
| `leftMaxWidth`     | number（px）            | split-right 系列                | 左栏最大宽度                           |
| `hasGraph`         | boolean                 | split-right / mobile-stack      | 是否提供图表 slot                      |
| `graphHeight`      | number（px）            | split-right-graph-bottom        | 图表区高度，默认 220                   |
| `controlColumns`   | `'auto' \| 1 \| 2 \| 3` | split 系列（split-layout-base） | 控制区列数，`auto` 为智能分列（推荐）  |
| `readoutCollapsed` | boolean                 | split-right 系列                | 读数区默认折叠                         |
| `readoutLabel`     | string                  | split-right 系列 / mobile-stack | 读数区标题，默认「数据读数」           |
| `hideHeader`       | boolean                 | split-right 系列                | 隐藏页头                               |
| `hideTransport`    | boolean                 | container（`LayoutConfig`）     | 隐藏 transport 浮动控制条              |
| `layoutOverrides`  | object                  | container                       | 按布局 ID 覆盖配置，如仅移动端启用图表 |

`layoutOverrides` 示例（chase-meet：桌面无图表，mobile-stack 下启用图表）：

```typescript
layoutConfig: {
  hasGraph: false,
  layoutOverrides: {
    'mobile-stack': { hasGraph: true }
  }
}
```

## 各场景当前配置（快照）

以下为 2026-08 从各场景 `page.ts` 摘录的实际值，仅供查阅；修改请以代码为准。

### 弹簧振子 (spring-oscillator)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.38,
  leftMinWidth: 380,
  leftMaxWidth: 960,
  hasGraph: true,
  // graphHeight 仅被 split-right-graph-bottom 消费；本场景 preferredLayout 为
  // split-right，代码中遗留的 graphHeight: 0.4 实际无效，不再摘录
  controlColumns: 'auto',
  readoutCollapsed: true
}
```

### 抛体运动 (projectile)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.32,
  leftMinWidth: 260,
  leftMaxWidth: 960,
  hasGraph: false,
  controlColumns: 'auto',
  readoutCollapsed: true,
  hideHeader: true,
  readoutLabel: '数据区'
}
```

### 追及相遇 (chase-meet)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.32,
  hasGraph: false,
  layoutOverrides: { 'mobile-stack': { hasGraph: true } },
  controlColumns: 'auto',
  readoutCollapsed: true
}
```

### 电场线 (field-lines)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.28,
  hasGraph: false,
  controlColumns: 'auto',
  readoutCollapsed: true
}
```

### 静电起电 (electrification)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.35,
  hasGraph: false,
  controlColumns: 'auto',
  readoutCollapsed: false
}
```

### 微元法 (vt-integral)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.35,
  hasGraph: false,
  controlColumns: 'auto',
  readoutCollapsed: false,
  hideTransport: true
}
```

### 电路类比 (emf-analogy)

```typescript
layoutConfig: {
  defaultLeftRatio: 0.3,
  hasGraph: false,
  controlColumns: 'auto',
  readoutCollapsed: true
}
```

## 响应式断点

默认断点由 `src/app/layouts/viewport-detection.ts` 定义，可被 `layoutConfig` 覆盖：

- **mobile**: < 768px（`mobileBreakpoint`）
- **tablet**: < 1024px（`tabletBreakpoint`）
- **desktop**: ≥ 1024px

移动端具体使用哪个布局由布局注册表与场景 `preferredLayout` 共同决定，
布局的交互模型（tabs / split / stack / fullscreen / custom）见其 `layoutTestProfile`。

## 控制区列布局

`controlColumns: 'auto'` 启用智能分列（推荐）：含 slider/text 字段的 section 自动占满整行，
只含按钮/预设/选择器的卡片参与多列并排。详见根目录 AGENTS.md「控制区列布局范式」。

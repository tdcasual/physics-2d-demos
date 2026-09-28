# Teaching Demo Hub

面向课堂演示的多学科 2D 动画静态站点。当前收录 120 个交互式物理教学场景与 3 个仪器组件，统一的布局母版系统，支持桌面端/移动端自适应切换。

## Tech Stack

- 构建：`Vite 7` + `TypeScript 5.9` + `pnpm`
- UI：`React 18` + `Tailwind CSS v4`
- 测试：`Vitest`（单元/契约）+ `Playwright`（E2E + 视觉回归）
- 工程质量：`ESLint` + `Prettier` + `TypeScript strict`
- 发布形态：纯静态站点（可部署到 GitHub Pages / Cloudflare Pages）

## Quick Start

```bash
pnpm install
pnpm dev
```

日常开发建议先运行快速门禁：

```bash
pnpm quality:core
```

合并或发布前运行完整门禁：

```bash
pnpm quality:full
```

## Scripts

| 命令                      | 说明                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`                | 本地开发（端口 5177）                                                                   |
| `pnpm build`              | 构建产物到 `dist/`                                                                      |
| `pnpm preview`            | 预览构建结果                                                                            |
| `pnpm check:scenes`       | 检查场景标准文件、控制面板形态与 HTML 入口                                              |
| `pnpm check:layouts`      | 检查布局注册表与 layoutTestProfile                                                      |
| `pnpm check:scaffold`     | 脚手架自证明（生成探针场景后清理）                                                      |
| `pnpm check:bundle`       | 检查生产构建产物是否超过 bundle budget                                                  |
| `pnpm check:circular`     | 检查 `src/` 循环依赖                                                                    |
| `pnpm check:audit`        | 依赖漏洞审计                                                                            |
| `pnpm verify:scene`       | 单场景一站式验证（结构→测试→构建→预算）                                                 |
| `pnpm quality:core`       | 快速本地质量门禁                                                                        |
| `pnpm quality:full`       | 完整本地质量门禁                                                                        |
| `pnpm lint`               | ESLint 静态检查                                                                         |
| `pnpm typecheck`          | TypeScript 类型检查                                                                     |
| `pnpm test`               | Vitest 单元/契约测试                                                                    |
| `pnpm test:e2e`           | Playwright E2E 测试                                                                     |
| `pnpm test:visual`        | Playwright 视觉回归测试                                                                 |
| `pnpm test:visual:update` | 更新视觉快照基线（仅限 macOS；Linux 基线走 `scripts/visual-linux-container.sh update`） |

## Project Layout

```text
src/
  app/
    scene-bootstrapper.ts      # 统一场景启动器（bootScenePage + SceneAdapter）
    layouts/                   # 布局母版系统
      registry.ts              # 布局注册表
      selector.ts              # 布局选择器（策略插件化）
      container.ts             # 场景容器（生命周期 + 布局切换）
      auto-register.ts         # 统一注册所有内置布局
      capabilities/            # 可装配布局能力（读数、控制条、主题、模式、data-workspace 等）
      layouts/                 # 具体布局实现
    main.tsx                   # React 导航首页入口
  catalog/
    scene-registry.ts          # 场景元数据注册表（import.meta.glob 自动发现，单一数据源）
  core/
    fixed-step.ts              # 固定步长步进器
    canvas-sizing.ts           # 高 DPI + 响应式画布缩放
  scenes/
    projectile/                # 抛体运动
    chase-meet/                # 追及相遇
    xt-graph/                  # 位置时间图像
    tortoise-hare/             # 龟兔赛跑
    ticker-tape/               # 打点计时器纸带
    ganshe/                    # 波的干涉
    field-lines/               # 电场线
    emf-analogy/               # 电路水流类比
    electrification/           # 起电方式
    vt-integral/               # 微元法（多子场景）
    spring-oscillator/         # 弹簧振子
  pages/
    *.html                     # 仅工具页真实文件；场景页入口由 vite-plugin-scene-pages 虚拟生成，禁止手写场景 HTML
  ui/
    floating-controls.ts       # 浮动运输控制条（桌面端，可拖拽）
    components/                # 共享 DOM 组件（SchemaRenderer / ControlCard / scene-controls/*）
scripts/
  check-scenes.ts              # 场景注册表一致性检查
  check-layouts.ts             # 布局注册表一致性检查
  new-scene.ts                 # 新场景脚手架
tests/
  unit/                        # 单元测试
  contract/                    # 场景契约测试
  e2e/                         # Playwright E2E（布局交互 + 控件响应 + 运输控制）
  visual/                      # 视觉回归 + 快照
docs/
  README.md                    # 文档索引
  layout-master-system-design.md   # 布局母版系统设计（历史快照）
  new-scene-agent-contract.md      # 新场景开发规范（当前有效）
  scene-migration-requirements.md  # 旧版场景开发规范（历史归档）
```

## Page Entrypoints

- `/`：React 导航首页（经 `src/catalog/scene-registry.ts` 的 `import.meta.glob` eager 自动发现场景元数据，支持搜索）
- `/src/pages/projectile.html`：抛体运动
- `/src/pages/chase-meet.html`：追及相遇
- `/src/pages/xt-graph.html`：位置时间图像
- `/src/pages/tortoise-hare.html`：龟兔赛跑
- `/src/pages/ticker-tape.html`：打点计时器纸带
- `/src/pages/spring-oscillator.html`：弹簧振子
- `/src/pages/ganshe.html`：波的干涉
- `/src/pages/mechanical-wave.html`：机械波
- `/src/pages/doppler-effect.html`：多普勒效应
- `/src/pages/field-lines.html`：电场线演化
- `/src/pages/emf-analogy.html`：电磁感应-水路类比
- `/src/pages/electrification.html`：静电起电
- `/src/pages/vt-integral.html`：微元法
- `/src/pages/double-slit.html`：双缝干涉
- `/src/pages/interference-formula.html`：双缝干涉公式推导
- `/src/pages/thin-film.html`：薄膜干涉
- `/src/pages/wedge.html`：劈尖干涉
- `/src/pages/vernier-caliper.html`：游标卡尺
- `/src/pages/micrometer.html`：螺旋测微仪
- `/src/pages/instruments.html`：仪器组件库（高精度干涉测微仪、干涉读数游标卡尺、游标卡尺使用演示）

## Architecture

### 场景页运行时

```
┌─────────────────────────────────────────┐
│  bootScenePage                          │
│  主题 / URL 参数 / 布局注册              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  SceneAdapter                           │
│  createScene + createSceneShell（RAF）  │
│  getTransportState / getReadoutItems    │
│  subscribe → 读数与运输条刷新            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  SceneContainer + ILayout               │
│  split-right / mobile-stack / …         │
│  Capability：transport / readout / 主题  │
│  可选 data-workspace（独立数据处理工作区） │
│  场景不 import 布局实现                  │
└─────────────────────────────────────────┘
```

### 场景启动流程

每个场景的 `page.ts` 只需调用 `bootScenePage()`：

```typescript
import { bootScenePage } from '../../app/scene-bootstrapper';

bootScenePage({
  meta: sceneMeta,
  createScene: ({ canvas, theme, mode }) =>
    createMyScene({ canvas, theme, mode }),
  createControls: ({ mount, scene }) => createMyControls({ mount, scene }),
  preferredLayout: 'split-right',
  layoutConfig: { hasGraph: false }
});
```

布局注册、容器创建、场景挂载、主题切换、响应式适配全部由 `bootScenePage()` 自动处理。数据处理工作区通过 `layoutConfig.dataWorkspace` opt-in，未设置时不会挂载入口或改变默认 DOM。场景代码**不感知**具体布局类型。

### 布局自动选择

`SceneContainerImpl` 通过 `LayoutSelector` 自动选择最佳布局：

1. **用户偏好**（最高优先级，可手动切换并持久化到 localStorage）
2. **场景声明的偏好布局**（检查视口约束是否满足）
3. **自动匹配**（基于设备类型 + 布局元数据 `constraints` + `priority`）

默认断点：

- Mobile：< 768px → `mobile-stack`
- Tablet：768px–1024px
- Desktop：≥ 1024px → `split-right`

### Teaching Demo Standard (2D)

- **布局**：桌面端左侧面板（控制 + 读数），右侧动画区；移动端垂直堆叠
- **模式**：`normal` / `presentation`
  - `presentation` 面向 1080P 投影，字号、线宽、关键点尺寸统一放大
- **控制协议**：统一 `播放/暂停/重置/单步/速度调节`
- **清晰度**：`canvas-sizing` 自动适配 `devicePixelRatio` 与响应式缩放
- **主题**：`light` / `dark`，支持系统偏好自动跟随

## Architecture Boundaries

为避免场景扩展时引入隐式耦合，使用分层约束：

- `src/scenes/**` — 除 `page.ts` 与 legacy `controls.ts` 外，**不允许**导入 `src/app/` 与 `src/ui/`
- `src/core/**` — 底层通用能力，**不允许**导入 `src/app/` 或 `src/scenes/**/page*`
- 场景导航数据以 `src/catalog/scene-registry.ts` 作为**单一数据源**（`import.meta.glob` 自动发现；生产构建由 Rollup 聚合为 `scene-registry` chunk）

新增场景时如果触发这些限制，优先通过分层拆分模块解决，而不是放宽规则。

## Adding a New 2D Scene

建议复制 `src/scenes/projectile` 的结构：

1. 新建 `src/scenes/<scene-id>/`
2. 拆分 `scene.meta.ts` / `scene.sim.ts` / `scene.view.ts` / `scene.entry.ts` / `controls-schema.ts` / `page.ts`（共 6 个 TS 文件）
3. 场景页 HTML 入口**无需创建**：由 `scripts/vite-plugin-scene-pages.ts` 从 `scene.meta.ts` 自动虚拟生成；**禁止**在 `src/pages/` 手写场景 HTML（`pnpm check:scenes` 会拒绝）
4. 无需手动注册；`src/catalog/scene-registry.ts` 通过 `import.meta.glob` 自动发现。需要数据处理能力的场景在布局配置中显式设置 `dataWorkspace`，能力运行时按需加载
5. 补齐测试：
   - 至少 1 个 unit test（数值或状态）
   - 至少 1 个 E2E test（页面截图或控件交互）
6. 执行质量门禁并更新快照（如需要）

详细规范见：[docs/new-scene-agent-contract.md](./docs/new-scene-agent-contract.md)（旧版规范 scene-migration-requirements.md 已归档，仅供追溯）

布局系统扩展指南见 AGENTS.md「布局扩展规范」。历史快照：[docs/layout-master-system-design.md](./docs/layout-master-system-design.md)

## CI

GitHub Actions workflow：`.github/workflows/ci.yml`

CI 流程：

1. install
2. scene structure check
3. layout contract check
4. circular dependency check
5. lint + typecheck
6. unit and contract tests with coverage
7. install Playwright browsers and CJK fonts
8. build + bundle budget
9. E2E behavior tests
10. visual, layout, accessibility and cross-browser tests

只有全绿才应进入发布流程。

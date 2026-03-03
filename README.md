# Teaching Demo Hub

面向课堂演示的多学科动画静态站点。当前仓库同时包含：

- `legacy` 动画资源：`animations/` 下的历史单文件 HTML（2D/3D 混合）
- `foundation` 新架构：TypeScript + Vite + 测试门禁，支持批量生产 2D 教学动画

项目目标是把可维护的 2D 教学规范先跑通，再逐步迁移 legacy 页面。

## Tech Stack

- 构建：`Vite` + `TypeScript` + `pnpm`
- 测试：`Vitest`（单元/契约）+ `Playwright`（视觉回归）
- 工程质量：`ESLint` + `Prettier`
- 发布形态：纯静态站点（可部署到 GitHub Pages / Cloudflare Pages）

## Quick Start

```bash
pnpm install
pnpm generate:index
pnpm dev
```

开发后建议运行完整门禁：

```bash
pnpm generate:index
pnpm lint
pnpm test
pnpm test:visual
pnpm build
```

## Scripts

- `pnpm dev`：本地开发
- `pnpm build`：构建产物到 `dist/`
- `pnpm preview`：预览构建结果
- `pnpm generate:index`：从场景注册表生成 `public/scene-index.json` 与 `public/scene-fallback.js`
- `pnpm lint`：静态检查
- `pnpm test`：Vitest（不包含 visual）
- `pnpm test:visual`：Playwright 视觉回归
- `pnpm test:visual:update`：更新视觉快照基线

## Project Layout

```text
animations/                    # legacy 静态动画页面
src/
  app/
    scene-index.ts             # 导航索引模型 + fallback
    scene-shell.ts             # 统一仿真时钟/播放控制
    teaching-demo-shell.ts     # 教学页壳层（左数据右演示）
    legacy-2d-*.ts             # legacy 2D 中间层适配
  core/
    fixed-step.ts              # 固定步长步进器
    rng.ts                     # 可复现实验随机数
    guards.ts                  # 参数守卫
    high-dpi-canvas.ts         # 高 DPI 画布缩放
  scenes/
    projectile/                # 示例 2D 场景
  pages/
    projectile.html            # 新架构场景页面
    legacy-2d.html             # legacy 2D 宿主页
  ui/
    control-panel.ts           # 通用播放/暂停/重置/单步控件
    teaching-demo.css          # 教学页视觉规范
scripts/
  generate-scene-index.ts      # 生成导航索引
tests/
  unit/                        # 单元测试
  contract/                    # 场景契约测试
  visual/                      # 视觉回归 + 快照
```

## Page Entrypoints

- `/`：可爱导航页（读取 `scene-index.json`，支持搜索）
- `/src/pages/projectile.html`：标准化 2D 抛体演示页
- `/src/pages/legacy-2d.html?scene=<scene-id>`：legacy 2D 统一宿主页

## Teaching Demo Standard (2D)

当前 2D 教学页遵循统一标准：

- 布局：左侧`控制 + 数据 + 状态`，右侧`动画演示区`
- 模式：`normal` / `presentation`
  - presentation 面向 1080P 投影，字号、线宽、关键点尺寸统一放大
- 控制协议：统一 `播放/暂停/重置/单步`
- 清晰度：`high-dpi-canvas` 自动适配 `devicePixelRatio`

## Legacy 2D Adapter

为了不阻断已有内容，legacy 2D 页面通过中间层接入新壳层：

- catalog：`src/app/legacy-animation-catalog.ts`
- host page：`src/pages/legacy-2d.html`
- adapter：`src/app/legacy-2d-adapter.ts`

适配器通过 `postMessage` 发送 `legacy:control` 指令，并接收可选的 `legacy:readout / legacy:status` 回传。

## Architecture Boundaries

为避免后续 2D 场景扩展时引入隐式耦合，当前仓库使用测试 + lint 双重边界约束：

- `src/scenes/**/scene.sim.ts` 只允许关注仿真与状态，不允许导入 `src/app` 与 `src/ui`。
- `src/core/**` 作为底层通用能力，不允许导入 `src/app/**`，也不允许依赖 `src/scenes/**/page*` 页面入口。
- 场景导航数据以 `src/catalog/scene-registry.ts` 作为单一源，构建脚本统一生成导航 JSON 与 HTML fallback 脚本。

新增场景时如果触发这些限制，优先通过分层拆分模块解决，而不是放宽规则。

## Adding a New 2D Scene

建议复制 `src/scenes/projectile` 的结构：

1. 新建 `src/scenes/<scene-id>/`
2. 拆分 `scene.meta.ts / scene.sim.ts / scene.view.ts / scene.entry.ts`
3. 新建对应页面 `src/pages/<scene-id>.html`
4. 在索引来源中注册元数据（当前由 `generate-scene-index.ts` 聚合）
5. 补齐：
   - 至少 1 个 unit test（数值或状态）
   - 至少 1 个 visual test（页面截图）
6. 执行质量门禁并更新快照（如需要）

## CI

GitHub Actions workflow：`.github/workflows/ci.yml`

CI 流程：

1. install
2. generate index
3. lint
4. test
5. test:visual
6. build

只有全绿才应进入发布流程。

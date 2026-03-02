# Physics Animations (Legacy + Foundation)

该仓库正在从 legacy 单文件动画逐步迁移到可规模化维护的新架构。

## Commands

- `pnpm install`：安装依赖
- `pnpm generate:index`：生成 `public/scene-index.json`
- `pnpm dev`：启动本地开发服务器
- `pnpm build`：构建静态产物
- `pnpm preview`：预览构建产物
- `pnpm lint`：静态检查
- `pnpm test`：运行单元测试
- `pnpm test:visual`：运行 Playwright 视觉回归
- `pnpm test:visual:update`：更新视觉快照基线

## Quality Gate

发布前请确保以下命令全部通过：

```bash
pnpm generate:index
pnpm lint
pnpm test
pnpm test:visual
pnpm build
```

## Current Foundation

- 工具链：Vite + TypeScript + pnpm
- 测试：Vitest + Playwright
- 场景模板：`src/scenes/<scene-id>/{scene.meta,scene.sim,scene.view,scene.entry}.ts`
- 首个示例场景：`src/scenes/projectile`

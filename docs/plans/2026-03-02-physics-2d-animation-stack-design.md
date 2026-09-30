# Physics 2D 动画静态站技术设计

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

## 1. 目标与约束

- 目标：支持“持续新增大量 2D 物理教学动画”，保持静态部署、低运维、可回归验证。
- 硬约束：纯静态站点，无后端依赖；动画可离线在本地 `http.server` 下运行。
- 成功标准：
  - 新增一个动画从脚手架到可发布不超过 30 分钟。
  - 每个动画具备统一控制交互（播放、暂停、重置、单步）。
  - 发布前有自动化数值与视觉回归门禁。

## 2. 技术栈定稿

- 包管理与构建：`pnpm + Vite + TypeScript`
- 2D 渲染：`PixiJS v8`
- 物理计算：
  - 主体：自研 `sim-core`（教学可解释模型）
  - 补充：`Matter.js`（碰撞、刚体类演示）
- 测试：`Vitest`（数值/契约）+ `Playwright`（截图回归）
- 质量工具：`ESLint + Prettier`
- 部署：`Cloudflare Pages` 或 `GitHub Pages`

设计取舍：不引入 React 作为主框架，避免在“动画页规模化”场景下增加额外 UI 框架复杂度。页面层坚持轻壳策略，核心复杂度集中在仿真与渲染。

## 3. 工程架构

建议目录：

```text
src/
  core/                # 时间步进、向量、单位、积分器、数值工具
  sims/                # 物理模型（匀变速/振动/电场等）
  scenes/              # 每个动画场景
    <scene-id>/
      scene.meta.ts
      scene.sim.ts
      scene.view.ts
      scene.entry.ts
  ui/                  # 通用控件（滑块、按钮、读数面板）
  app/                 # 导航页渲染、索引读取
scripts/
  generate-scene-index.ts
  new-scene.ts
tests/
  unit/
  contract/
  visual/
```

每个场景四文件职责：

- `scene.meta.ts`：标题、关键词、教学目标、默认参数、排序信息。
- `scene.sim.ts`：纯物理状态与 `step(dt, params)`，不依赖 DOM。
- `scene.view.ts`：Pixi 图层与渲染，不做物理推导。
- `scene.entry.ts`：组装 UI、时钟、仿真、渲染生命周期。

## 4. 标准数据流

统一链路：

`controls -> params -> sim.step(dt) -> state -> view.render(state) -> readout`

关键规则：

- `sim` 与 `view` 强隔离，防止“显示逻辑污染物理模型”。
- 使用固定时间步（如 `1/60`）与补帧上限（如 `maxSubSteps=5`）确保数值稳定。
- 所有随机过程使用可设定 `seed`，保证复现性。
- 生命周期契约统一为：`init / reset / step / render / dispose`。

## 5. 批量生产机制

- 提供脚手架命令：`pnpm new:scene <scene-id>`
- 自动生成场景模板、测试模板、默认参数与文档注释。
- 导航页不手写卡片，构建阶段扫描 `scene.meta.ts` 生成 `scene-index.json`。
- 首页读取 `scene-index.json` 渲染卡片与搜索，新增场景后无需改导航逻辑。

## 6. 错误处理与稳定性

- 参数守卫：输入参数先做范围、单位、步长校验。
- 非法参数处理：回退到最近合法值，并给 UI 提示（不崩溃、不白屏）。
- 渲染降级：Pixi 初始化失败时显示降级说明与重试入口。
- 资源回收：场景切换必须调用 `dispose` 清理 ticker、纹理、事件监听。

## 7. 测试与发布门禁

三层验证：

1. `Vitest` 数值测试：边界条件、误差上限、守恒/单调性。
2. 场景契约测试：所有场景实现统一生命周期接口。
3. `Playwright` 视觉回归：固定 seed、固定分辨率、固定采样时间截图。

CI 发布门禁：

```bash
pnpm lint
pnpm test
pnpm test:visual
pnpm build
```

仅全部通过时允许发布静态产物。

## 8. 里程碑建议

- M1（基础）：搭建 Vite+TS+Pixi 基础骨架与首个示例场景。
- M2（规模化）：完成脚手架与 `scene-index.json` 自动生成。
- M3（质量化）：接入数值测试与视觉回归，建立发布门禁。
- M4（迁移）：将现有 legacy 页面按优先级逐步迁移到新架构。

## 9. 非目标

- 本阶段不做服务端数据存储。
- 本阶段不做多人协作编辑后台。
- 本阶段不优先移动端复杂手势体系（先保证桌面课堂稳定演示）。

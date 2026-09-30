# 2D 教学演示页面规范（阶段性）

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

## 目标

- 将后续 2D 物理动画统一到同一页面结构，而非继续维护彼此独立的页面模板。
- 保证课堂演示可读性：针对 1920x1080 投影场景，默认提供可切换“演示模式”。
- 3D 页面暂不改造，保持原状，后续迁移到独立项目处理。

## 页面结构（必须）

- 左侧：`数据区 + 控制区 + 状态区`
  - 控制区包含：播放、暂停、重置、单步。
  - 数据区至少包含关键物理量（时间、位置、速度）。
- 右侧：`动画演示区`
  - 仅承载 2D 渲染画布（Canvas）。
  - 不在该区域堆叠复杂参数表单。

## 显示模式

- `标准模式`：用于个人调试与常规浏览。
- `演示模式`：用于课堂投影，确保 3.4 米外可辨识。
  - 1080P 基准视口：`1920 x 1080`
  - 文本与控件字号显著增大
  - 轨迹线条、坐标轴线条、关键点半径增大
- 高分屏支持（2D）：
  - 画布 backing store 按 `devicePixelRatio` 等比提升，避免高 DPI 模糊。
  - 监听 `resize` / `visualViewport.resize` / DPR 变化，显示缩放后自动重算画布分辨率。

## 当前落地（2026-03-02）

- 已在 `projectile` 页面完成首个样板改造：
  - 通用壳层：`src/app/teaching-demo-shell.ts`
  - 模式标准：`src/app/teaching-standards.ts`
  - 通用样式：`src/ui/teaching-demo.css`
  - 页面接入：`src/scenes/projectile/page.ts`

## 迁移策略

- 新增 2D 场景：必须直接基于统一壳层开发。
- 现有 2D legacy 页面：按优先级逐步迁移，迁移后接入统一控制与读数。
- 现有 3D 页面：本阶段不改动，不纳入 2D 规范执行范围。

## 中间层（共享能力）

- `src/app/legacy-animation-catalog.ts`
  - 维护 `2d/3d` 分类与统一注册信息。
  - 2D 条目自动映射到共享宿主页路由。
- `src/pages/legacy-2d.html` + `src/app/legacy-2d-page.ts`
  - 统一左侧教学壳层 + 右侧 legacy 2D 承载。
- `src/app/legacy-2d-adapter.ts`
  - 通过 `postMessage` 统一控制协议（play/pause/reset/step）与读数回传协议。
  - 后续新增动画 HTML 只需实现同协议即可无缝接入。

# Legacy -> Modern Parity Checklist

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

> 用于逐场景验证“modern 版本与 legacy 演示一致”。
> **迁移实施前请阅读：[场景迁移到统一框架的要求规范](../scene-migration-requirements.md)**

> **归档说明（2026-08）**：legacy 页面和 `renderer` 查询路由已经从产品中移除，
> `tests/parity/` 及其 Playwright 配置也已删除。本文件只保留迁移历史记录，
> 不再是新增场景的测试要求。当前场景请使用 `tests/contract`、
> `tests/e2e` 与 `tests/visual/layout-matrix.spec.ts`。

## Global Rules

- 固定同一 viewport、DPR、字体加载策略、seed（如适用）。
- 对照同一时间点截图（t=0、t=1s、t=3s 等固定采样点）。
- 控制动作顺序一致：`reset -> play -> pause -> step -> reset`。
- 对照项同时覆盖：`readout`、`状态文案`、`关键几何/轨迹`、`交互反馈`。

## Scene Checklist

### legacy-chase-meet

- [x] 路由统一：默认入口与 `renderer=modern`/`renderer=modern-lab` 已切至 modern，`renderer=legacy` 保留回退

- [ ] 初始参数和初始读数一致
- [ ] 播放后距离随时间变化曲线一致
- [ ] 单步行为与时间步长一致
- [ ] 重置后回到完全同态

### legacy-vt-integral

- [ ] 已回退到迁移前：默认入口恢复 legacy（仅 `renderer=experimental` 使用 modern）

- [ ] 子场景切换行为一致
- [ ] 面积/体积读数与公式展示一致
- [ ] 动画推进节奏与暂停位置一致
- [ ] 参数修改后重算逻辑一致

### legacy-electrification

- [x] 路由统一：默认入口与 `renderer=modern`/`renderer=modern-lab` 已切至 modern，`renderer=legacy` 保留回退

- [ ] 三种起电流程步骤一致
- [ ] 状态切换与提示文本一致
- [ ] 可视电荷分布变化一致
- [ ] 重置后状态机一致

### legacy-emf-analogy

- [x] 路由统一：默认入口与 `renderer=modern`/`renderer=modern-lab` 已切至 modern，`renderer=legacy` 保留回退

- [ ] 通路开关语义一致
- [ ] 流动方向/速度表现一致
- [ ] 关键读数变化趋势一致
- [ ] 参数边界行为一致

### legacy-field-lines

- [x] 路由统一：默认入口与 `renderer=modern`/`renderer=modern-lab` 已切至 modern，`renderer=legacy` 保留回退

- [ ] 场景预设切换一致
- [ ] 电荷拖拽反馈一致
- [ ] 场线密度调节结果一致
- [ ] 关键视觉快照（多采样点）一致

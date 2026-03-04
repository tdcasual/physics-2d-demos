# Legacy -> Modern Parity Checklist

> 用于逐场景验证“modern 版本与 legacy 演示一致”。

## Global Rules

- 固定同一 viewport、DPR、字体加载策略、seed（如适用）。
- 对照同一时间点截图（t=0、t=1s、t=3s 等固定采样点）。
- 控制动作顺序一致：`reset -> play -> pause -> step -> reset`。
- 对照项同时覆盖：`readout`、`状态文案`、`关键几何/轨迹`、`交互反馈`。

## Scene Checklist

### legacy-chase-meet

- [ ] 初始参数和初始读数一致
- [ ] 播放后距离随时间变化曲线一致
- [ ] 单步行为与时间步长一致
- [ ] 重置后回到完全同态

### legacy-vt-integral

- [ ] 子场景切换行为一致
- [ ] 面积/体积读数与公式展示一致
- [ ] 动画推进节奏与暂停位置一致
- [ ] 参数修改后重算逻辑一致

### legacy-electrification

- [ ] 三种起电流程步骤一致
- [ ] 状态切换与提示文本一致
- [ ] 可视电荷分布变化一致
- [ ] 重置后状态机一致

### legacy-emf-analogy

- [ ] 通路开关语义一致
- [ ] 流动方向/速度表现一致
- [ ] 关键读数变化趋势一致
- [ ] 参数边界行为一致

### legacy-field-lines

- [ ] 场景预设切换一致
- [ ] 电荷拖拽反馈一致
- [ ] 场线密度调节结果一致
- [ ] 关键视觉快照（多采样点）一致

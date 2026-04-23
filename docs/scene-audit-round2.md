# 场景二次审计报告

> 审计日期: 2026-04-18  
> 审计范围: 7 个物理场景（移动端适配、教学目标匹配、测试覆盖、布局兼容、代码健康）

---

## 总体结论

| 场景 | 移动端 | 教学匹配 | 布局兼容 | 测试覆盖 | 代码健康 | 仍需改造 |
|------|--------|----------|----------|----------|----------|----------|
| spring-oscillator | 🟡 | 🟢 | 🔴 | 🔴 | 🟡 | **是** |
| emf-analogy | 🟢 | 🟢 | 🟡 | 🔴 | 🟡 | **是** |
| projectile | 🟡 | 🟢 | 🟡 | 🟢 | 🟢 | 轻微 |
| chase-meet | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | 否 |
| field-lines | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 轻微 |
| electrification | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 | 轻微 |
| vt-integral | 🟡 | 🟢 | 🟡 | 🟡 | 🟢 | 否 |

**图例**: 🟢 良好 / 🟡 可接受但有改进空间 / 🔴 需要改造

---

## 🔴 需要继续改造的场景

---

### 1. spring-oscillator (弹簧振子) — 优先级最高

**核心问题**: 这是唯一一个 **0% 单元测试覆盖率** 的场景。

| 维度 | 详情 |
|------|------|
| **测试覆盖** | `scene.entry.ts` 0%, `scene.sim.ts` 0%, `controls.ts` 0%。从 git 恢复后没有任何单元测试。只有 3 个 Playwright 视觉测试。 |
| **布局兼容** | 使用 `getDeviceType(canvasWidth)` 做阶梯式判断（mobile/tablet/desktop），而非连续的 `responsiveScale`。在 420px/640px 边界处会突然跳变。 |
| **代码健康** | `scene.view.ts` 859 行，过于庞大。包含历史数据管理、点击检测、图表绘制、弹簧绘制等，应该拆分为 renderer 子模块。 |
| **模块级状态** | `globalFrameCount` 是模块级变量，多个实例共享。 |

**建议改造**:
1. 拆分 `scene.view.ts` 为 renderer 子模块：`draw-spring.ts`, `draw-oscillator.ts`, `draw-graph.ts`
2. 添加单元测试：`scene.sim.spec.ts`（简谐运动计算正确性）、`controls.spec.ts`（动态列表交互）
3. 将 `getDeviceType()` 阶梯式判断改为基于 `responsiveScale` 的连续缩放
4. 移除模块级 `globalFrameCount`，改为实例级

**工作量**: 6-8 小时

---

### 2. emf-analogy (电路水流类比) — 优先级高

**核心问题**: 新写的 `draw-circuit.ts` 和 `draw-water-analogy.ts` 完全没有测试覆盖。

| 维度 | 详情 |
|------|------|
| **测试覆盖** | `draw-circuit.ts` 1.56%, `draw-water-analogy.ts` 0.43%。renderer 目录整体 0.94%。新写的 1000+ 行绘制代码在 happy-dom 中无法执行。 |
| **布局兼容** | 使用 `computeHiDpiCanvasMetrics`（`high-dpi-canvas.ts`）而非标准 `canvas-sizing.ts`。功能等效但代码路径不一致。 |
| **代码健康** | `scene.view.ts` 的 `setMode` 中 `nextMode` 被 `void` 掉，mode 实际上未被使用。 |

**建议改造**:
1. 迁移到 `sizeCanvasToFill`（标准系统）
2. 添加 renderer 的单元测试：至少验证函数不抛异常、正确读取 snapshot 参数
3. 修复 `setMode` 中未使用的参数

**工作量**: 2-3 小时

---

## 🟡 轻微改进即可的场景

---

### 3. projectile (抛体运动)

| 问题 | 严重程度 | 建议 |
|------|----------|------|
| 未读取 `canvas.dataset.responsiveScale` | 低 | 当前有自己的 `scale = Math.min(width/800, height/600)`，等效但非标准 |
| `originX = 60` 固定值 | 低 | 在 390px 宽屏幕上占 15%，可改为 `Math.max(40, width * 0.08)` |
| 小球半径 `8` 未缩放 | 低 | 移动端小球偏小，可改为 `Math.max(5, 8 * scale)` |

**工作量**: 0.5 小时

---

### 4. field-lines (电场线)

| 问题 | 严重程度 | 建议 |
|------|----------|------|
| `_cachedScale` 模块级变量 | 中 | 如果同时打开多个电场线实例，会共享 scale。应改为 view 实例的属性 |
| view.ts 无单元测试 | 低 | 已通过 Playwright 视觉测试覆盖主要功能 |

**工作量**: 1 小时

---

### 5. electrification (静电起电)

| 问题 | 严重程度 | 建议 |
|------|----------|------|
| `_cachedScale` 模块级变量 | 中 | 同 field-lines |
| 文本叠加层仍存在 | 低 | 场景/说明文字在 canvas 上绘制，但同样的信息已在 readout 面板中显示。可移除以减少 canvas 复杂度 |

**工作量**: 1 小时

---

## 🟢 当前状态良好的场景

---

### 6. chase-meet (追及相遇)

- 有自己的 `resolveVisuals` + `responsiveScale` 实现（`shortEdge / 550`）
- 功能完善，移动端适配良好
- 单元测试覆盖 83%，sim 测试完整
- 唯一的非标准是使用 `high-dpi-canvas.ts` 而非 `canvas-sizing.ts`，但效果等效

**结论**: 不需要改造。

---

### 7. vt-integral (微元法)

- 已引入 `responsiveScale`，柱状图和数据面板已响应式化
- 单元测试覆盖 72.5%，sim 测试完整
- 教学功能完整（5 个场景：矩形逼近、曲线长度、圆内接、表面积、球体积）

**结论**: 不需要改造。

---

## 建议的改造优先级和顺序

### 第一阶段（本周）: 测试覆盖 — 最重要的债务

| 场景 | 工作量 | 关键产出 |
|------|--------|----------|
| spring-oscillator sim 测试 | 2h | 验证简谐运动计算 |
| spring-oscillator controls 测试 | 2h | 验证动态列表交互 |
| emf-analogy renderer 测试 | 2h | 验证双视图绘制不抛异常 |

### 第二阶段（下周）: 代码质量

| 场景 | 工作量 | 关键产出 |
|------|--------|----------|
| spring-oscillator view 拆分 | 3h | 拆分 renderer 子模块 |
| spring-oscillator 连续缩放 | 1h | getDeviceType → responsiveScale |
| field-lines/electrification _cachedScale | 1h | 改为实例级变量 |
| projectile 微调 | 0.5h | originX + 小球半径缩放 |

### 第三阶段（可选）: 统一标准化

| 场景 | 工作量 | 关键产出 |
|------|--------|----------|
| chase-meet → canvas-sizing | 2h | 迁移到标准系统 |
| emf-analogy → canvas-sizing | 1h | 迁移到标准系统 |

---

## 视觉回归测试状态

重构后更新了 5 个场景的截图基线（`--update-snapshots`）：
- ✅ emf-analogy mobile（双视图重构）
- ✅ field-lines desktop（responsiveScale）
- ✅ field-lines mobile（responsiveScale）
- ✅ electrification desktop（相对坐标 + responsiveScale）
- ✅ electrification mobile（相对坐标 + responsiveScale）

全部 138 个 Playwright 视觉测试通过。

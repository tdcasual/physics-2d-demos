# 场景移动端视图审计报告

> 审计日期: 2026-04-18  
> 审计范围: 7 个物理场景的 `scene.view.ts` 移动端适配情况  
> 审计标准: `canvas-sizing.ts` 规范（`responsiveScale` + 禁止裸数字）

---

## 审计方法

1. **代码扫描**: 检查每个场景的 view.ts 是否使用标准响应式工具
   - `sizeCanvasToFill` / `sizeCanvasToFit` — 标准 canvas 尺寸管理
   - `getResponsiveScale` / `canvas.dataset.responsiveScale` — 标准缩放因子
   - `getDeviceType` / `innerWidth` — 非标准窗口级判断（容易出错）
   - 裸数字（magic number）— 固定像素值在移动端会溢出

2. **测试覆盖**: 检查 Playwright 移动端测试（390×844）是否通过

3. **渲染策略分类**: 按场景内容特性判断适配难度

---

## 总体评级

| 评级 | 场景 | 代码行 | 适配状态 | 重构优先级 |
|------|------|--------|----------|-----------|
| 🔴 A级-需重构 | field-lines (电场线) | 321 | **完全无移动端适配** | P0 |
| 🔴 A级-需重构 | electrification (静电起电) | 255 | 摩擦场景固定坐标溢出 | P0 |
| 🟡 B级-需优化 | spring-oscillator (弹簧振子) | 859 | 自定义 getDeviceType，非标准 | P1 |
| 🟡 B级-需优化 | vt-integral (微元法) | 263 | 有 fill 无 scale，部分裸数字 | P1 |
| 🟢 C级-良好 | chase-meet (追及相遇) | 549 | 标准 responsiveScale + viewport | 保持 |
| 🟢 C级-良好 | emf-analogy (电路类比) | 212 | drawFlowArea 有 responsiveScale | 保持 |
| 🟢 C级-良好 | projectile (抛体运动) | 225 | 动态坐标映射 + isMobile 检测 | 保持 |

---

## 详细分析

### 🔴 A级 — 需要重构

---

#### 1. field-lines (电场线) — 优先级 P0

**问题严重性**: 高。在移动端（390×844 竖屏）下，电荷和电场线箭头会严重 oversized。

**具体问题**:

```typescript
// scene.view.ts:32-56 — VISUAL_CONFIG 完全固定像素值
const VISUAL_CONFIG: Record<TeachingMode, VisualConfig> = {
  normal: {
    chargeRadius: 26,          // ❌ 固定 26px，移动端占屏幕 1/15
    chargeFontPx: Math.round(...), // ❌ 基于 teachingStandards，无 canvas 缩放
    arrowStrokeWidth: ...,     // ❌ 固定笔触宽度
    arrowSize: 20,             // ❌ 固定箭头大小
    maxArrowLength: 34,        // ❌ 固定
    minArrowLength: ...        // ❌ 固定
  },
  presentation: {
    chargeRadius: 40,          // ❌ 更大！移动端直接溢出
    // ...
  }
};
```

```typescript
// scene.view.ts:109-117 — toPixelCharges: 电荷半径不随屏幕缩放
toPixelCharges(next) {
  return next.charges.map(charge => ({
    x: charge.x * surface.cssWidth,    // ✅ 位置归一化
    y: charge.y * surface.cssHeight,   // ✅ 位置归一化
    radius: visuals.chargeRadius       // ❌ 半径固定！
  }));
}
```

```typescript
// scene.view.ts:92-106 — resizeCanvas 无 responsiveScale 设置
function resizeCanvas() {
  surface = computeHiDpiCanvasMetrics({ cssWidth, cssHeight, dpr });
  applyHiDpiCanvasMetrics(canvas, ctx, surface);
  // ❌ 缺少: canvas.dataset.responsiveScale = ...
}
```

**移动端表现预测**:
- 390px 宽屏幕上，单个电荷半径 26px = 屏幕宽度的 13.3%，两个电荷加间距就占满屏幕
- 箭头大小 20px 在密集电场线中互相重叠
- 电荷标签字体（基于 teachingStandards，约 18px）在 390px 屏幕上可读但偏大

**重构建议**:
1. 引入 `getResponsiveScale(surface.cssWidth, surface.cssHeight, 600)`
2. 所有 `VISUAL_CONFIG` 数值乘以 `responsiveScale`
3. `resizeCanvas()` 中设置 `canvas.dataset.responsiveScale`
4. 电场线密度（`density`）在移动端应自动降低，避免过度绘制

**重构工作量**: 约 2-3 小时（修改 view.ts 即可，sim 无需改动）

---

#### 2. electrification (静电起电) — 优先级 P0

**问题严重性**: 高。摩擦起电子场景在移动端完全不可用。

**具体问题**:

```typescript
// scene.view.ts:25-121 — drawFrictionLegacyLike: 全部硬编码坐标
drawFrictionLegacyLike(ctx, width, height, theme, visuals) {
  const viewW = 800;
  const viewH = 450;
  const scale = Math.min(width / viewW, height / viewH); // ✅ 有 scale
  // ...
  
  drawBody(500, 150, 40, 200, 20);   // ❌ 硬编码！基于 800×450 坐标系
  drawAtom(500 + 20, atomY, 500 + 5); // ❌ 硬编码！
  
  drawBody(250, 125, 80, 250, 10);   // ❌ 硬编码！
  drawAtom(atomX, atomY, atomX - 15); // ❌ 硬编码！
}
```

问题分析：
- `scale` 计算正确，但 `drawBody`/`drawAtom` 的参数是 **设计坐标系（800×450）下的绝对位置**
- 当移动端 canvas 只有 350×500 时，原点在 (250, 125) 的物体经缩放后仍然在画布中央偏左，但 `viewW=800` 导致 `scale ≈ 0.44`
- 缩放后的物体间距变得很小，文字标签重叠
- 更严重的是：当 canvas 高度 < 450 时，scale 由高度决定，物体会被压扁

```typescript
// scene.view.ts:171-229 — 主场景 drawScene: 文本位置固定
const leftX = width * 0.3;    // ✅ 相对定位
centerY = height * 0.52;      // ✅ 相对定位
bodyW = width * 0.16;         // ✅ 相对定位

// 但文本说明是绝对位置:
ctx.fillText(`场景：${...}`, 16, 30);     // ❌ 固定 (16, 30)
ctx.fillText(`下一步动作：${...}`, 16, 56); // ❌ 固定 (16, 56)
ctx.fillText(next.state.explanation, 16, 84); // ❌ 固定 (16, 84)
```

**移动端表现预测**:
- 摩擦起电场景：两个物体（500,150）和（250,125）在 350px 宽屏幕上经 0.44 缩放后，间距只有约 110px，非常拥挤
- 文字 "场景：friction" 在 (16, 30) 位置始终可读，但如果 canvas 高度 < 200px，后续文字会超出可视区域

**重构建议**:
1. **摩擦场景**: 将硬编码坐标改为相对设计坐标系的比例值
   ```typescript
   // 改为基于 viewW/viewH 的比例
   const body1X = viewW * 0.625; // 500/800
   const body1Y = viewH * 0.333; // 150/450
   ```
2. **主场景**: 文本区域使用 `responsiveScale` 调整字体和行距
3. 考虑将文字信息移入 readout 面板，减少 canvas 上的文本渲染

**重构工作量**: 约 3-4 小时（需要重新设计摩擦场景的坐标系）

---

### 🟡 B级 — 需要优化

---

#### 3. spring-oscillator (弹簧振子) — 优先级 P1

**问题严重性**: 中。有移动端适配但实现方式不标准，存在布局切换时的误判风险。

**具体问题**:

```typescript
// scene.view.ts:26-31 — 使用 window.innerWidth 而非 canvas 尺寸
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth; // ❌ 应该是 canvas 的宽度！
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
```

问题分析：
- 在 `split-right` 布局下，canvas 只占右侧面板（约 60% 窗口宽度）
- 当窗口宽度 900px 时，`getDeviceType()` 返回 `tablet`，但 canvas 实际宽度可能只有 540px，应该按 `mobile` 处理
- 这导致移动端布局误判为平板，元素尺寸过大

```typescript
// scene.view.ts:50-85 — getResponsiveSizes 基于 deviceType 而非 canvas 尺寸
function getResponsiveSizes(deviceType, cellWidth) {
  const isMobile = deviceType === 'mobile'; // ❌ 二态判断，无渐变
  const maxSpringLength = isMobile
    ? Math.min(cellWidth * 0.4, 80)
    : isTablet ? Math.min(cellWidth * 0.5, 120)
    : Math.min(cellWidth * 0.6, 180);
}
```

其他问题：
- `globalFrameCount` 是模块级变量，多个弹簧振子实例共享（虽然此场景通常只有一个实例）
- 历史数据降采样基于 `deviceType` 而非实际 canvas 尺寸

**移动端表现预测**:
- 在 split-right + 中等窗口（800-1000px）时，canvas 实际狭窄但按 tablet 渲染，弹簧可能溢出单元格
- 小球半径 22px（desktop）/ 18px（tablet）/ 14px（mobile）的阶梯式变化在边界处会突然跳变

**重构建议**:
1. 移除 `getDeviceType()`，改用 `canvas.dataset.responsiveScale`
2. 所有尺寸基于 `responsiveScale` 连续变化，而非阶梯式
3. 网格布局 `calculateGridLayout` 也应基于 canvas 宽度而非窗口宽度

**重构工作量**: 约 4-6 小时（859 行代码，改动面较大但结构清晰）

---

#### 4. vt-integral (微元法) — 优先级 P1

**问题严重性**: 中低。基本可用但部分元素在移动端会不协调。

**具体问题**:

```typescript
// scene.view.ts:25-31 — 有 sizeCanvasToFill，但不使用 responsiveScale
function resizeCanvas() {
  const newCtx = sizeCanvasToFill(canvas); // ✅ 设置了 responsiveScale
  ctx = newCtx;
  canvasWidth = canvas.clientWidth;
  canvasHeight = canvas.clientHeight;
  // ❌ 不读取 canvas.dataset.responsiveScale
}
```

```typescript
// scene.view.ts:37-68 — drawMetricBox: boxWidth 默认 330px
drawMetricBox(x, y, lines, fontSize, boxWidth = 330) {
  // ❌ 默认 330px，在 390px 宽屏幕上几乎占满
}

// scene.view.ts:230 — draw 中有适配但不完整
const boxWidth = Math.min(330, Math.max(180, width - 60)); // ✅ 部分适配
```

```typescript
// scene.view.ts:151-181 — scene4/5 柱状图: 固定 barW = 48
const barW = 48;         // ❌ 固定像素
const baseX = width * 0.22; // ✅ 相对位置
ctx.fillRect(baseX, ..., barW, ...);   // 48px 在 350px 宽屏幕上占比 13.7%
ctx.fillRect(baseX + 70, ..., barW, ...); // 间距 70px 也是固定值
```

```typescript
// scene.view.ts:125-147 — scene3 圆内接多边形
const cx = width * 0.28;  // ✅ 相对位置
const cy = height * 0.42; // ✅ 相对位置
const r = Math.min(width, height) * 0.2; // ✅ 相对半径
```

**移动端表现预测**:
- 数据面板（`drawMetricBox`）在 390px 宽屏幕上宽度约 330px，会遮挡左侧图形
- scene4/5 柱状图：两个柱子宽 48px + 间距 70px = 166px，在窄屏幕上看起来还可以，但位置 `baseX = width * 0.22` 在 350px 屏幕上只有 77px，柱子会超出画布
- scene1 的矩形填充和 scene3 的圆在移动端表现良好

**重构建议**:
1. 读取 `canvas.dataset.responsiveScale` 并应用到所有固定尺寸
2. `barW` 改为 `Math.max(24, 48 * responsiveScale)`
3. 柱状图间距改为相对值
4. `drawMetricBox` 在移动端应缩小字体并移到不遮挡图形的位置

**重构工作量**: 约 2-3 小时

---

### 🟢 C级 — 良好，保持现状

---

#### 5. chase-meet (追及相遇) — 标杆场景

**优点**:
- `resolveVisuals()` 基于 canvas 短边计算 `responsiveScale`（`shortEdge / 550`）
- `resizeCanvasWithDpr()` 正确设置 `canvas.dataset.responsiveScale`
- 所有绘制尺寸（markerRadiusPx、fontPx、strokePx）都乘以 `responsiveScale`
- 使用 `getResponsiveViewport()` 支持 narrow/mobile 检测
- 移动端布局时自动将图表迁移到独立 slot

**唯一改进点**:
- `view-utils.ts` 中的 `MODE_SCALE`（normal: 1.45, presentation: 2.6）在移动端可能仍然偏大，可考虑乘以 `responsiveScale` 的二次衰减

---

#### 6. emf-analogy (电路类比) — 良好

**优点**:
- `drawFlowArea()` 内部有 `responsiveScale = Math.max(0.3, Math.min(1.0, shortEdge / 400))`
- 管道高度 `Math.max(110 * visualScale, height * 0.22)` 双重保障
- 字体大小取 `readability` 和 `teachingStandards` 的最大值，保证可读性
- 卡片布局全部使用相对值（`width * 0.012`, `cardH * 0.17`）

**注意事项**:
- `legacy-overlay` 分支使用绝对定位的 DOM 覆盖层，在移动端可能有定位问题
- `draw-cards.ts` 和 `draw-legend-formula.ts` 需要检查是否也使用了 responsiveScale

---

#### 7. projectile (抛体运动) — 良好

**优点**:
- 使用 `sizeCanvasToFill()` 标准接口
- `worldToScreen()` 动态计算坐标映射，基于轨迹数据自适应缩放
- `isMobile = width < 500` 检测调整轴线和字体
- 坐标系原点 `(60, height - 60)` 使用固定边距 + 动态区域

**可改进点**:
- `originX = 60` 是固定值，在 390px 宽屏幕上占 15%，可考虑 `Math.max(40, width * 0.08)`
- 小球半径 `8` 在移动端没有缩放

---

## 重构优先级与推荐顺序

### 第一阶段（本周）: P0 — 严重问题

| 场景 | 工作量 | 影响面 | 推荐策略 |
|------|--------|--------|----------|
| field-lines | 2-3h | view.ts 321行 | 引入 `responsiveScale`，缩放所有 VISUAL_CONFIG |
| electrification | 3-4h | view.ts 255行 | 摩擦场景坐标系改为比例值，主场景文本 responsive 化 |

### 第二阶段（下周）: P1 — 优化体验

| 场景 | 工作量 | 影响面 | 推荐策略 |
|------|--------|--------|----------|
| spring-oscillator | 4-6h | view.ts 859行 | 移除 `getDeviceType()`，改用 `responsiveScale` |
| vt-integral | 2-3h | view.ts 263行 | 应用 `responsiveScale` 到固定尺寸元素 |

### 第三阶段（可选）: 锦上添花

| 场景 | 工作量 | 改进点 |
|------|--------|--------|
| projectile | 1h | originX 改为相对值，小球半径缩放 |
| chase-meet | 1h | MODE_SCALE 在移动端二次衰减 |
| emf-analogy | 1h | 检查 draw-cards / draw-legend 的移动端适配 |

---

## 技术债务清单

1. **非标准移动端检测方式**（应统一为 `canvas.dataset.responsiveScale`）
   - `spring-oscillator`: `getDeviceType()` 基于 `window.innerWidth`
   - `projectile`: `isMobile = width < 500`（基于 canvas 宽度，可接受但非标准）

2. **未使用 `canvas-sizing` 的场景**（使用旧的 `computeHiDpiCanvasMetrics`）
   - `electrification`
   - `field-lines`
   - `emf-analogy`

3. **遗留代码**（未使用的分支）
   - `emf-analogy`: `legacyOverlay` 分支和 `legacyFlowDark` 选项
   - `spring-oscillator`: `chartState` 兼容旧路径（`resizeGraphCanvas` 中的 `if (chartState.cssWidth > 0) return`）

---

## 重构模板

对于需要引入 `responsiveScale` 的场景，参考以下最小改动：

```typescript
// 1. resize 中读取 responsiveScale
import { getResponsiveScale } from '../../core/canvas-sizing';

function resizeCanvas() {
  // ... 现有尺寸计算 ...
  const scale = getResponsiveScale(cssWidth, cssHeight, 600);
  canvas.dataset.responsiveScale = String(scale);
}

// 2. draw 中应用 scale
function draw() {
  const scale = parseFloat(canvas.dataset.responsiveScale || '1');
  
  // 所有固定像素值乘以 scale
  const chargeRadius = 26 * scale;
  const arrowSize = 20 * scale;
  const fontSize = Math.max(10, 16 * scale);
}
```

---

## 结论

- **7 个场景中，2 个（field-lines、electrification）在移动端存在严重显示问题，需要立即重构**
- **2 个（spring-oscillator、vt-integral）有适配但不完整，建议第二轮优化**
- **3 个（chase-meet、emf-analogy、projectile）移动端表现良好，可保持现状**
- **核心问题根源**: 早期迁移的场景（electrification、field-lines）使用了固定像素值和硬编码坐标，未接入 `canvas-sizing` 响应式系统

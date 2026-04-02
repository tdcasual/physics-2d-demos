# 场景界面统一设计方案

## 1. 现状问题总结

通过代码审查发现以下主要问题:

### 1.1 布局不一致
- **projectile**: 使用 `teaching-demo-shell` ✅
- **spring-oscillator**: 使用自定义 `spring-layout` ❌
- **chase-meet**: 混合使用shell和legacy渲染 ❌
- **其他场景**: 类似但不完全一致

### 1.2 配色不统一
- 各场景使用不同的颜色值（如 `#0f172a`, `#e2e8f0`等）
- 没有统一引用 `core/colors.ts` 的配色常量
- 深色/浅色模式切换实现各异

### 1.3 控制组件差异
- 参数控制UI样式不统一
- 按钮、滑块等组件行为不一致
- 状态显示格式各异

### 1.4 渲染逻辑重复
- 每个场景都重复实现网格、坐标轴绘制
- 轨迹渲染、数据面板显示逻辑重复
- 坐标系转换逻辑不统一

### 1.5 显示比例不合理
- **侧边栏过宽**: 当前 340-360px，占据约26%视口宽度
- **spring-oscillator 双面板**: 等分 1fr:1fr，每个面板过窄
- **响应式断点**: 1024px 过高，导致 900-1024px 区间布局拥挤
- **Canvas 比例**: 未根据舞台区域自动优化

---

## 2. 统一设计规范

### 2.1 视觉设计

#### 配色方案
```
主色调: 珊瑚橙 #FF6B6B (活力、重点)
辅助色: 薄荷青 #4ECDC4 (冷静、辅助)
点缀色: 明黄色 #FFE66D (高亮、提醒)

背景: 米白色 #FFFEF7 (浅色) / 深蓝 #1A1A2E (深色)
文字: 深灰 #2C3E50 (浅色) / 浅灰 #EAEAEA (深色)
```

#### 布局结构
```
┌─────────────────────────────────────────────────────┐
│ teaching-demo-shell                                  │
├─────────────────────┬───────────────────────────────┤
│ teaching-sidebar    │ teaching-stage-panel          │
│ (固定 320px)         │ (弹性宽度)                     │
│                     │                               │
│ ┌─────────────────┐ │ ┌───────────────────────────┐ │
│ │ 标题区域         │ │ │ 工具栏                    │ │
│ │ - 中文标题       │ │ │ - 主题切换                 │ │
│ │ - 英文副标题     │ │ │ - 演示模式                 │ │
│ └─────────────────┘ │ └───────────────────────────┘ │
│                     │                               │
│ ┌─────────────────┐ │ ┌───────────────────────────┐ │
│ │ 控制面板         │ │ │                           │ │
│ │ - 播放/暂停/重置 │ │ │   Canvas 舞台             │ │
│ │ - 参数滑块       │ │ │                           │ │
│ │ - 选项选择       │ │ │   ┌─────────────────┐     │ │
│ └─────────────────┘ │ │   │  物理仿真渲染     │     │ │
│                     │ │   │                 │     │ │
│ ┌─────────────────┐ │ │   │  - 网格背景       │     │ │
│ │ 状态栏           │ │ │   │  - 坐标轴        │     │ │
│ │ - 实时数据       │ │ │   │  - 物理对象       │     │ │
│ │ - 说明文字       │ │ │   │  - 矢量箭头       │     │ │
│ └─────────────────┘ │ │   └─────────────────┘     │ │
│                     │ │                           │ │
│                     │ │ ┌───────────────────────┐ │ │
│                     │ │ │ 数据读数面板           │ │ │
│                     │ │ │ - 位置、速度、时间等   │ │ │
│                     │ │ └───────────────────────┘ │ │
└─────────────────────┴───────────────────────────────┘
```

#### 显示比例规范（优化后）

**侧边栏与舞台比例:**
```
侧边栏 : 分隔条 : 舞台 ≈ 22% : 最小 : 78%

具体参数:
- 侧边栏宽度: 240-380px（默认300px）
- 分隔条: 8px（更细的视觉分隔）
- 舞台: 剩余弹性空间

响应式:
- 桌面 (>1200px): 侧边栏可调整 300-340px
- 平板 (900-1200px): 侧边栏固定 280px
- 移动端 (<900px): 上下布局，侧边栏置顶
```

**双面板场景比例 (spring-oscillator):**
```
x-t 图像 : 弹簧动画 ≈ 45% : 55%

理由:
- x-t 图像需要时间轴延伸，适合稍宽
- 弹簧动画主要是垂直运动，可以稍窄
- 55%:45% 接近黄金分割，视觉更舒适
```

**Canvas 视口比例:**
```
根据舞台区域自动选择最佳比例:
- 宽屏 (16:9+): 使用 16:9 比例
- 标准屏 (4:3-16:9): 使用 4:3 比例
- 接近正方形: 使用 1:1 比例

边距: 四周各 40px，确保内容不被遮挡
```

### 2.2 交互规范

#### 播放控制
- 点击"播放"开始动画，按钮变为"暂停"
- 点击"暂停"停止动画，保留当前状态
- 点击"重置"恢复初始状态

#### 参数调整
- 数值变化时实时更新仿真
- 播放中调整参数时自动暂停
- 滑块拖拽结束后应用新值

#### 主题切换
- 点击"春日"/"月夜"切换浅色/深色
- 动画过渡时间 300ms
- Canvas 立即重新渲染

---

## 3. 新框架 API

### 3.1 快速开始

```typescript
import { createPhysicsDemo } from '@/core/physics-demo';

// 定义仿真逻辑
const sim = {
  init(params) { /* 初始化 */ },
  update(dt, state) { /* 物理更新 */ },
  reset() { /* 重置状态 */ }
};

// 定义渲染逻辑
const view = {
  render(ctx, width, height, state, theme) {
    // 使用统一工具函数
    drawGrid(ctx, width, height, theme);
    drawBall(ctx, x, y, 8, Colors.coral);
    drawTrail(ctx, points, Colors.mint);
  }
};

// 创建演示
const demo = createPhysicsDemo({
  title: '抛体运动',
  subtitle: 'Projectile Motion',
  params: [
    { key: 'v0', label: '初速度', type: 'slider', value: 50, min: 10, max: 100 },
    { key: 'angle', label: '抛射角', type: 'slider', value: 45, min: 0, max: 90 }
  ],
  sim,
  view
});

// 挂载到DOM
demo.mount(document.getElementById('app'));
```

### 3.2 工具函数

```typescript
// 统一绘制工具
import { 
  drawGrid,        // 标准网格
  drawAxes,        // 坐标轴
  drawBall,        // 高亮球体
  drawTrail,       // 运动轨迹
  drawVector,      // 矢量箭头
  drawDataPanel,   // 数据面板
} from '@/core/unified-canvas';

// 配色
import { Colors, alpha, getThemeColors } from '@/core/colors';

// 控制组件
import { createUnifiedControls } from '@/core/unified-controls';
```

---

## 4. 迁移计划

### Phase 1: 基础设施 (已完成 ✅)
- ✅ `core/colors.ts` - 统一配色
- ✅ `core/unified-canvas.ts` - 统一Canvas工具
- ✅ `core/unified-controls.ts` - 统一控制组件
- ✅ `core/unified-scene.ts` - 场景基类

### Phase 2: 试点场景 (建议: projectile)
目标: 验证新框架可行性

修改 `scenes/projectile/scene.view.ts`:
```typescript
// 替换原有实现
import { drawGrid, drawBall, drawTrail, drawDataPanel } from '../../core/unified-canvas';
import { getThemeColors } from '../../core/colors';

export function createProjectileView(canvas, options) {
  return {
    render(state, theme) {
      const colors = getThemeColors(theme);
      
      // 使用统一网格
      drawGrid(ctx, width, height, { showAxes: true }, theme === 'dark');
      
      // 使用统一绘制函数
      drawTrail(ctx, state.trail, colors.secondary);
      drawBall(ctx, state.x, state.y, 8, colors.primary);
      
      // 统一数据面板
      drawDataPanel(ctx, 20, 20, [
        { label: '时间:', value: `${state.t.toFixed(2)}s` },
        { label: '高度:', value: `${state.y.toFixed(1)}m` }
      ], theme === 'dark');
    }
  };
}
```

### Phase 3: 批量迁移
按复杂度排序:
1. vt-integral (简单)
2. field-lines (中等)
3. electrification (中等)
4. emf-analogy (复杂UI)
5. chase-meet (双渲染器)
6. spring-oscillator (双Canvas，特殊处理)

### Phase 4: 清理
- 删除旧版控制组件
- 统一导出接口
- 更新文档

---

## 5. Spring-Oscillator 特殊处理

该场景需要特殊处理，因为它使用双Canvas布局:

```
┌────────────────────────────────────────┐
│ teaching-stage-panel                   │
│ ┌────────────────────────────────────┐ │
│ │ spring-split-layout                 │ │
│ │ ┌──────────────┬─────────────────┐ │ │
│ │ │ graph-canvas │ stage-canvas    │ │ │
│ │ │ (x-t 图像)   │ (弹簧动画)      │ │ │
│ │ │              │                 │ │ │
│ │ │ 薄荷青曲线   │ 珊瑚橙弹簧      │ │ │
│ │ └──────────────┴─────────────────┘ │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

实现方式:
1. 使用 `teaching-demo-shell` 作为外层容器
2. 在 `stage-frame` 中使用自定义CSS实现双面板
3. 两个Canvas共享相同的仿真状态
4. 使用 `unified-canvas` 工具分别渲染

---

## 6. 预期效果

### 视觉统一
- 所有场景使用相同的配色方案
- 控制面板风格一致
- Canvas 渲染风格统一

### 开发效率
- 新场景开发时间减少 50%
- 复用现有工具函数
- 减少重复代码

### 用户体验
- 跨场景学习成本降低
- 一致的交互模式
- 平滑的主题切换

# 场景界面显示比例分析与优化方案

## 1. 现状分析

### 1.1 当前布局参数

| 场景                | 侧边栏宽度            | 舞台区域 | 内部布局       | 问题       |
| ------------------- | --------------------- | -------- | -------------- | ---------- |
| teaching-demo-shell | 280-520px (默认360px) | 弹性 1fr | 单Canvas       | 侧边栏偏宽 |
| spring-oscillator   | 340px 固定            | 弹性 1fr | 双面板 1fr:1fr | 面板过窄   |
| projectile          | 使用shell             | -        | 单Canvas       | -          |
| field-lines         | 使用shell             | -        | 单Canvas       | -          |

### 1.2 屏幕尺寸适配分析

**笔记本屏幕 (1366×768)** - 最常见的教学场景

```
当前:
侧边栏: 360px (26.4%) + 分隔条 12px (0.9%) + 舞台: 994px (72.7%)

spring-oscillator 双面板:
每个面板: 497px - 对于物理演示偏窄
```

**大屏显示器 (1920×1080)**

```
侧边栏: 360px (18.8%) + 分隔条 12px (0.6%) + 舞台: 1548px (80.6%)
比例合理
```

**平板横屏 (1024×768)**

```
当前响应式: 切换为移动端布局 (侧边栏在上，舞台在下)
但 1024px 刚好在断点，可能频繁切换
```

### 1.3 具体问题

1. **侧边栏过宽 (340-360px)**
   - 占据了26%的横向空间
   - 控制内容并不需要这么宽

2. **spring-oscillator 双面板比例**
   - 等分 1fr:1fr 不够灵活
   - x-t 图像需要更宽的区域显示时间轴
   - 弹簧动画可以稍窄

3. **Canvas 显示区域比例**
   - 物理仿真通常需要正方形或横向比例
   - 当前布局在笔记本上显得拥挤

---

## 2. 优化方案

### 2.1 黄金比例布局

采用 **侧边栏:舞台 = 1:3** 的比例（约25%:75%）

```
优化后参数:
- 侧边栏: 280-320px (最小240px，最大380px)
- 分隔条: 8px (更细，减少干扰)
- 舞台: 剩余空间
```

**各屏幕尺寸适配:**

| 屏幕宽度 | 侧边栏 | 分隔条 | 舞台   | 侧边栏比例 |
| -------- | ------ | ------ | ------ | ---------- |
| 1366px   | 300px  | 8px    | 1058px | 22%        |
| 1440px   | 320px  | 8px    | 1112px | 22%        |
| 1920px   | 340px  | 8px    | 1572px | 18%        |

### 2.2 双面板场景优化 (spring-oscillator)

采用 **黄金分割比例 38%:62%** 或 **40%:60%**

```
布局结构:
┌────────────────┬──────────────────────────┐
│ 侧边栏 300px   │     主区域 (弹性)         │
│                │ ┌──────────┬─────────────┐ │
│                │ │ x-t 图像 │ 弹簧动画    │ │
│                │ │   45%    │    55%      │ │
│                │ └──────────┴─────────────┘ │
└────────────────┴──────────────────────────┘
```

**理由:**

- x-t 图像需要时间轴延伸，适合稍宽
- 弹簧动画主要是垂直运动，可以稍窄
- 55%:45% 的比例接近黄金分割，视觉更舒适

### 2.3 响应式断点优化

```
桌面端: > 1200px
  - 完整三栏布局
  - 侧边栏可调整 240-380px

小平板: 900px - 1200px
  - 侧边栏固定 260px (不可调整)
  - 保持桌面布局

移动端: < 900px
  - 切换为上下布局
  - 侧边栏折叠为抽屉或置顶
```

### 2.4 Canvas 视口比例

**物理演示推荐的 Canvas 比例:**

```typescript
// 根据舞台区域自动计算最佳 Canvas 尺寸
function getOptimalCanvasSize(stageWidth: number, stageHeight: number) {
  const margin = 40; // 边距
  const availableWidth = stageWidth - margin * 2;
  const availableHeight = stageHeight - margin * 2;

  // 物理演示通常需要 4:3 或 16:9 比例
  // 如果舞台足够宽，使用 16:9
  // 否则使用 4:3

  const aspect16_9 = 16 / 9;
  const aspect4_3 = 4 / 3;

  let width = availableWidth;
  let height = width / aspect16_9;

  if (height > availableHeight) {
    // 高度不够，改用4:3
    height = availableHeight;
    width = height * aspect4_3;

    if (width > availableWidth) {
      // 还是不够，按宽度计算
      width = availableWidth;
      height = width / aspect4_3;
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
}
```

---

## 3. 具体实现方案

### 3.1 teaching-demo-shell 修改

```typescript
// 调整参数
const sidebarMinPx = 240; // 从 280 减小
const sidebarMaxPx = 380; // 从 520 减小
const stageMinPx = 600; // 从 700 减小 (因为侧边栏也小了)
const dividerPx = 8; // 从 12 减小

// 默认宽度计算
function getDefaultSidebarWidth(viewportWidth: number): number {
  if (viewportWidth >= 1440) return 320;
  if (viewportWidth >= 1200) return 300;
  return 280; // 小屏幕
}
```

### 3.2 spring-oscillator 双面板修改

```css
.spring-main {
  display: grid;
  grid-template-columns: 45% 55%; /* 替代 1fr 1fr */
  gap: 16px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .spring-main {
    grid-template-columns: 48% 52%;
  }
}

@media (max-width: 1024px) {
  .spring-main {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
```

### 3.3 响应式断点调整

```typescript
// teaching-demo-shell.ts
const COMPACT_BREAKPOINT_PX = 900; // 从 1024 降低

// 小屏幕平板优化
const TABLET_BREAKPOINT_PX = 1200;
```

---

## 4. 视觉比例参考

### 4.1 推荐的界面元素比例

```
侧边栏内部:
┌─────────────────┐
│ 标题区  (15%)   │  标题 + 副标题
├─────────────────┤
│ 控制区  (60%)   │  滑块、按钮、选择器
├─────────────────┤
│ 状态区  (15%)   │  状态文字
├─────────────────┤
│ 间距    (10%)   │  padding/margin
└─────────────────┘

舞台区域:
┌─────────────────────────────┐
│ 工具栏 (40px)               │
├─────────────────────────────┤
│                             │
│     Canvas (居中)            │
│     保持 4:3 或 16:9        │
│                             │
├─────────────────────────────┤
│ 数据读数 (浮动)              │
└─────────────────────────────┘
```

### 4.2 边距规范

```css
:root {
  /* 边距系统 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* 阴影 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.16);
}
```

---

## 5. 验证清单

- [ ] 侧边栏宽度 280-320px，不超过 380px
- [ ] 分隔条 8px，视觉不突兀
- [ ] 舞台区域至少占视口宽度的 70%
- [ ] Canvas 保持适当比例（4:3 或 16:9）
- [ ] 响应式断点 900px 和 1200px
- [ ] 小屏幕下布局不拥挤
- [ ] 双面板场景比例 45%:55%

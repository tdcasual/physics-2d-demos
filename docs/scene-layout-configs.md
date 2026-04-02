# 场景布局配置参考

## 四区域布局系统 V2

所有场景使用统一的四区域布局系统，通过 `layout` 配置项自定义。

## 配置选项

```typescript
interface LayoutConfig {
  /** 左侧默认宽度占比 (0.3 = 30%) */
  defaultLeftRatio?: number;
  
  /** 左侧最小宽度 (px) */
  leftMinWidth?: number;
  
  /** 左侧最大宽度 (px) */
  leftMaxWidth?: number;
  
  /** 是否显示图表区 */
  hasGraph?: boolean;
  
  /** 图表区默认高度 (px) */
  graphHeight?: number;
  
  /** 控制区列数 (auto=自适应, 1/2/3=固定) */
  controlColumns?: 'auto' | 1 | 2 | 3;
  
  /** 数据区默认折叠 */
  readoutCollapsed?: boolean;
}
```

## 各场景推荐配置

### 1. 弹簧振子 (spring-oscillator)
- 需要显示 x-t 图像（图表区）
- 控制区较复杂，需要自适应列数
- 动画区需要较大空间

```typescript
layout: {
  defaultLeftRatio: 0.35,
  leftMinWidth: 280,
  leftMaxWidth: 450,
  hasGraph: true,
  graphHeight: 280,
  controlColumns: 'auto',
  readoutCollapsed: true,
}
```

### 2. 抛体运动 (projectile)
- 无图表区
- 控制区简单，单列即可
- 动画区需要最大空间

```typescript
layout: {
  defaultLeftRatio: 0.30,
  leftMinWidth: 260,
  leftMaxWidth: 380,
  hasGraph: false,
  controlColumns: 1,
  readoutCollapsed: true,
}
```

### 3. 追及相遇 (chase-meet)
- 可能需要显示 v-t 图像
- 适中左侧宽度

```typescript
layout: {
  defaultLeftRatio: 0.32,
  leftMinWidth: 270,
  leftMaxWidth: 400,
  hasGraph: true,
  graphHeight: 200,
  controlColumns: 1,
  readoutCollapsed: true,
}
```

### 4. 电场线 (field-lines)
- 无图表区
- 主要交互在动画区

```typescript
layout: {
  defaultLeftRatio: 0.28,
  leftMinWidth: 250,
  leftMaxWidth: 350,
  hasGraph: false,
  controlColumns: 1,
  readoutCollapsed: true,
}
```

### 5. 静电起电 (electrification)
- 步骤演示，控制区为主
- 需要更多左侧空间

```typescript
layout: {
  defaultLeftRatio: 0.35,
  leftMinWidth: 280,
  leftMaxWidth: 400,
  hasGraph: false,
  controlColumns: 1,
  readoutCollapsed: false,
}
```

### 6. 微元法 (vt-integral)
- 需要显示曲线图
- 图表区较大

```typescript
layout: {
  defaultLeftRatio: 0.35,
  leftMinWidth: 280,
  leftMaxWidth: 420,
  hasGraph: true,
  graphHeight: 250,
  controlColumns: 'auto',
  readoutCollapsed: true,
}
```

### 7. 电路类比 (emf-analogy)
- 复杂交互
- 动画区为主

```typescript
layout: {
  defaultLeftRatio: 0.30,
  leftMinWidth: 260,
  leftMaxWidth: 380,
  hasGraph: false,
  controlColumns: 1,
  readoutCollapsed: true,
}
```

## 使用方式

在场景的 `page.ts` 中：

```typescript
import '../../ui/teaching-demo.css';
import '../../ui/teaching-demo-v2.css';  // 引入V2样式

const shell = createTeachingDemoShell({
  mount,
  title: '场景标题',
  subtitle: '场景副标题',
  hideHeader: true,  // 或 false
  readoutLabel: '数据区',
  layout: {
    // 根据上方推荐配置
    defaultLeftRatio: 0.35,
    hasGraph: true,
    // ...
  }
});

// 如果有图表区，创建 Canvas 放入
if (shell.graphSlot) {
  const graphCanvas = document.createElement('canvas');
  shell.graphSlot.appendChild(graphCanvas);
}
```

## 控制区列数自适应规则

| 左侧宽度 | 列数 | 说明 |
|---------|------|------|
| < 300px | 1列 | 手机/窄屏 |
| 300-400px | 2列 | 平板/中等 |
| > 400px | 3列 | 桌面宽屏 |

## 响应式断点

- **桌面**: > 900px，左右布局，可拖拽分隔线
- **平板**: 600-900px，左右布局，固定比例
- **手机**: < 600px，上下堆叠，控制区可折叠

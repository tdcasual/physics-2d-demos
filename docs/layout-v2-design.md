# 四区域布局架构设计 V2

## 目标

统一所有教学演示的布局，支持四区域灵活配置。

## 四区域定义

| 区域   | 标识    | 可选 | 默认显示 | 说明               |
| ------ | ------- | ---- | -------- | ------------------ |
| 控制区 | control | 否   | 是       | 参数调节、场景切换 |
| 图表区 | graph   | 是   | 视场景   | x-t图、数据曲线等  |
| 动画区 | stage   | 否   | 是       | 主要动画演示       |
| 数据区 | readout | 否   | 默认折叠 | 数值读数面板       |

## 桌面端布局

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │              │  │                              │  │
│  │   控制区     │  │                              │  │
│  │  [1/2/3列]   │  │        动画区                │  │
│  │              │  │     (Canvas/SVG/DOM)         │  │
│  │  ┌──────────┐│  │                              │  │
│  │  │ 图表区   ││  │                              │  │
│  │  │(可选)    ││  │                              │  │
│  │  └──────────┘│  │                              │  │
│  │              │  │                              │  │
│  └──────────────┘  └──────────────────────────────┘  │
│         ↑                    ↑                       │
│    可拖拽分隔线 (左右调节宽度)                        │
│                                                      │
│  [浮动数据区 - 默认折叠]                              │
└──────────────────────────────────────────────────────┘
```

## 配置选项

```typescript
interface LayoutConfig {
  // 左侧宽度占比 (0.3 = 30%)
  defaultLeftRatio: number;

  // 左侧最小/最大宽度
  leftMinWidth: number;
  leftMaxWidth: number;

  // 是否显示图表区
  hasGraph: boolean;

  // 图表区默认高度 (在左侧内)
  graphHeight?: number;

  // 控制区列数 (auto/1/2/3)
  controlColumns: 'auto' | 1 | 2 | 3;

  // 数据区默认折叠
  readoutCollapsed: boolean;
}

// 场景特定配置
const sceneLayoutConfigs: Record<string, LayoutConfig> = {
  'spring-oscillator': {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 450,
    hasGraph: true,
    graphHeight: 250,
    controlColumns: 'auto',
    readoutCollapsed: true
  },
  projectile: {
    defaultLeftRatio: 0.3,
    leftMinWidth: 260,
    leftMaxWidth: 380,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
  // ...
};
```

## 控制区列数自适应规则

| 左侧宽度  | 列数 | 适用场景  |
| --------- | ---- | --------- |
| < 300px   | 1列  | 手机/窄屏 |
| 300-400px | 2列  | 平板/中等 |
| > 400px   | 3列  | 桌面宽屏  |

## 响应式断点

- **桌面**: > 900px，左右布局，可拖拽
- **平板**: 600-900px，左右布局，固定比例
- **手机**: < 600px，上下堆叠

## 实现要点

1. **CSS Grid/Flexbox 混合布局**
   - 外层：左右 flex 容器
   - 左侧：垂直 flex 容器
   - 控制区：CSS Grid (auto-fit)

2. **拖拽分隔线**
   - 鼠标事件监听
   - 实时计算宽度比例
   - 边界限制检查
   - 存储用户偏好

3. **图表区可选**
   - 动态插入/移除 DOM
   - 高度可配置
   - Canvas 自动 resize

4. **场景配置注入**
   - 通过 shell 选项传入
   - 默认值回退机制

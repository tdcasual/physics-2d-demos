# 场景演示界面分析报告

## 1. 现有架构概览

### 1.1 核心组件层

```
┌─────────────────────────────────────────┐
│         teaching-demo-shell.ts          │  <- 统一样式容器
│  - 左侧: 控制面板 (标题/控制/状态)       │
│  - 右侧: 演示区域 (Canvas + 数据读数)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         scene-shell.ts                  │  <- 动画循环管理
│  - requestAnimationFrame                │
│  - step/render 生命周期                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         scene.entry.ts                  │  <- 场景入口
│  - 整合 sim + view + controls           │
└─────────────────────────────────────────┘
```

### 1.2 各场景差异分析

| 场景              | UI模式                       | 特殊组件             | 布局差异            |
| ----------------- | ---------------------------- | -------------------- | ------------------- |
| projectile        | teaching-demo-shell          | 标准                 | 3栏: 控制/分隔/舞台 |
| chase-meet        | teaching-demo-shell / legacy | 双渲染器             | 支持iframe回退      |
| field-lines       | teaching-demo-shell          | 电荷放置UI           | 鼠标交互特殊        |
| emf-analogy       | teaching-demo-shell          | 水管类比可视化       | 复杂UI覆盖层        |
| electrification   | teaching-demo-shell          | 材料选择器           | 多步骤演示          |
| spring-oscillator | **自定义**                   | 双Canvas (图形+舞台) | 完全不同布局        |
| vt-integral       | teaching-demo-shell          | 图表区域             | 标准                |

### 1.3 关键差异点

**spring-oscillator 异常:**

- 使用自定义布局 `spring-layout` + `spring-sidebar` + `spring-main`
- 双Canvas设计: `graphCanvas` + `stageCanvas`
- 独立的CSS文件和交互逻辑

**控制组件差异:**

- 大部分使用 `createXXXControls` 模式
- 但参数结构、回调命名不统一
- 有的返回 dispose，有的不返回

**View渲染差异:**

- 有的使用Canvas 2D，有的尝试WebGL
- 颜色主题处理方式不一
- 坐标系、缩放逻辑各自实现

---

## 2. 统一框架设计

### 2.1 核心设计原则

1. **单一容器**: 所有场景使用 `teaching-demo-shell` 作为唯一布局容器
2. **插件化控制**: 控制面板通过插槽(slot)机制注入
3. **统一配色**: 使用 `core/colors.ts` 的配色系统
4. **标准生命周期**: 所有场景实现统一的 `SceneLifecycle` 接口

### 2.2 新架构设计

```typescript
// 统一场景接口
interface UnifiedScene {
  // 生命周期
  mount(options: SceneMountOptions): void;
  unmount(): void;

  // 控制
  play(): void;
  pause(): void;
  reset(): void;
  step(): void;

  // 配置
  setParams(params: Record<string, unknown>): void;
  getParams(): Record<string, unknown>;

  // 状态
  getState(): SceneState;
  subscribe(callback: StateCallback): Unsubscribe;
}

// 统一控制组件接口
interface UnifiedControls {
  render(container: HTMLElement): void;
  destroy(): void;
  setEnabled(enabled: boolean): void;
}

// 统一视图接口
interface UnifiedView {
  render(state: SceneState): void;
  resize(width: number, height: number): void;
  setTheme(theme: 'light' | 'dark'): void;
}
```

### 2.3 组件标准化

**控制组件标准结构:**

```typescript
// controls.ts
export function createSceneControls(options: {
  container: HTMLElement;
  initialParams: SceneParams;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep?: () => void;
  onApplyParams: (params: Partial<SceneParams>) => void;
  onStatus?: (text: string) => void;
}): { dispose: () => void } {
  // 统一实现
}
```

**View渲染标准结构:**

```typescript
// view.ts
export function createSceneView(options: {
  canvas: HTMLCanvasElement;
  theme: 'light' | 'dark';
}): {
  render(state: SceneState): void;
  reset(): void;
  dispose(): void;
} {
  // 使用 Colors 配色
  // 统一的网格、坐标轴绘制
}
```

### 2.4 布局标准化

所有场景统一使用以下布局:

```
┌─────────────────────────────────────────────┐
│ teaching-demo-shell                         │
├──────────────────┬──────┬───────────────────┤
│ teaching-sidebar │resizer│ teaching-stage   │
│ ┌──────────────┐ │      │ ┌───────────────┐ │
│ │ header       │ │      │ │ stage-topbar  │ │
│ │ (title/sub)  │ │      │ │ (toolbar)     │ │
│ └──────────────┘ │      │ └───────────────┘ │
│ ┌──────────────┐ │      │ ┌───────────────┐ │
│ │ control-card │ │      │ │ stage-frame   │ │
│ │ (slot)       │ │      │ │ ┌───────────┐ │ │
│ └──────────────┘ │      │ │ │stage-slot │ │ │
│ ┌──────────────┐ │      │ │ │ (canvas)  │ │ │
│ │ status-card  │ │      │ │ └───────────┘ │ │
│ └──────────────┘ │      │ │ stage-readout │ │
└──────────────────┴──────┴───────────────────┘
```

### 2.5 spring-oscillator 迁移方案

将 spring-oscillator 的特殊布局整合到标准容器中:

```
┌─────────────────────────────────────────────┐
│ teaching-sidebar                            │
│ (保持原有控制面板)                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ teaching-stage                              │
│ ┌─────────────────────────────────────────┐ │
│ │ stage-frame (自定义双Canvas布局)         │ │
│ │ ┌────────────────┬──────────────────┐   │ │
│ │ │ graph-canvas   │ stage-canvas     │   │ │
│ │ │ (x-t图像)      │ (弹簧动画)       │   │ │
│ │ └────────────────┴──────────────────┘   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

通过 `stage-frame` 的自定义CSS实现双Canvas并排布局。

---

## 3. 实施路线图

### Phase 1: 基础设施 (1周)

- [ ] 完善 `core/colors.ts` 配色系统
- [ ] 创建 `core/unified-canvas.ts` 统一Canvas工具
- [ ] 创建 `core/unified-controls.ts` 控制组件基类
- [ ] 更新 `teaching-demo-shell.ts` 支持自定义stage布局

### Phase 2: 试点改造 (1周)

- [ ] 选择 1-2 个简单场景 (projectile/vt-integral)
- [ ] 验证新架构可行性
- [ ] 收集反馈调整设计

### Phase 3: 批量迁移 (2周)

- [ ] 改造 field-lines
- [ ] 改造 emf-analogy
- [ ] 改造 electrification
- [ ] 改造 chase-meet

### Phase 4: 复杂场景 (1周)

- [ ] 改造 spring-oscillator (双Canvas特殊处理)

### Phase 5: 清理优化 (1周)

- [ ] 删除旧代码
- [ ] 统一文档
- [ ] 性能优化

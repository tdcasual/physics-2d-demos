# 布局母版系统设计文档

## 审阅记录

| 版本 | 日期       | 审阅人       | 状态                                              |
| ---- | ---------- | ------------ | ------------------------------------------------- |
| v0.1 | 2026-04-02 | AI Assistant | 草案                                              |
| v0.2 | 2026-04-03 | AI Assistant | 已优化（鲁棒性增强）                              |
| v0.3 | 2026-04-18 | AI Assistant | 扩展性升级：策略插件化 + 注册解耦 + Vite 自动扫描 |

## 1. 设计目标

- 建立 5-6 种预设布局母版，场景按需选择
- 母版优化惠及所有使用该母版的场景（类似 PPT 母版）
- 场景可主动请求切换布局，用户可手动覆盖
- 所有母版共享统一主题系统
- 保留现有弹簧振子作为模板，新系统不破坏旧代码
- **布局与场景零耦合**：场景不感知具体布局类型，只通过标准接口提供数据

## 2. 架构设计

### 2.1 核心概念

```
┌─────────────────────────────────────────────────────────┐
│  LayoutMaster (布局母版)                                 │
│  - 定义区域结构 (Slots)                                   │
│  - 处理响应式逻辑                                         │
│  - 管理区域显隐/折叠                                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  SceneContainer (场景容器)                               │
│  - 管理 LayoutMaster 实例                                 │
│  - 处理场景状态持久化                                     │
│  - 协调布局切换动画                                       │
│  - 订阅场景状态变化并同步到布局                           │
│  - 代理浮动控制条、主题/模式切换                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Scene (场景)                                             │
│  - 声明 preferredLayout                                  │
│  - 渲染内容到 Slots                                       │
│  - 通过 subscribe() 通知内部状态变化                      │
│  - 通过 getReadoutItems() / getTransportState() 提供数据  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心接口

```typescript
// 布局母版接口
interface LayoutMaster {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  // 渲染布局，返回区域槽位
  render(container: HTMLElement): LayoutSlots;

  // 生命周期
  mount(): Promise<void>;
  unmount(): Promise<void>;

  // 响应式
  handleResize(width: number, height: number): void;

  // 主题
  setTheme(theme: 'light' | 'dark'): void;

  // 布局切换动画（支持中断保护）
  enter(transition?: LayoutTransition): Promise<void>;
  exit(transition?: LayoutTransition): Promise<void>;

  // 可选：设置浮动控制条回调
  setFloatingControls?(options: {
    isPlaying?: () => boolean;
    onTogglePlay?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
  }): void;

  // 可选：获取所有已渲染的区域槽位
  getSlots?(): Partial<LayoutSlots>;

  // 可选：刷新运输控制状态
  updateTransportState?(state: TransportState): void;

  // 可选：刷新读数面板
  updateReadout?(items: ReadoutItem[]): void;
}

// 区域槽位
interface LayoutSlots {
  header?: HTMLElement;
  control: HTMLElement;
  animation: HTMLElement;
  graph?: HTMLElement;
  readout?: HTMLElement;
}

// 场景接口
interface Scene {
  readonly id: string;
  readonly preferredLayout: string;

  // 渲染到槽位
  renderControl(container: HTMLElement): void;
  renderAnimation(container: HTMLElement): void;
  renderGraph?(container: HTMLElement): void;
  renderReadout?(container: HTMLElement): void;

  // 布局切换回调
  onLayoutWillChange?(from: string, to: string): Promise<void>;
  onLayoutDidChange?(to: string): void;

  // 状态持久化
  saveState?(): object;
  restoreState?(state: object): void;

  // 主题/模式/控制（由容器自动代理）
  setTheme?(theme: 'light' | 'dark'): void;
  setMode?(mode: 'normal' | 'presentation'): void;
  startAll?(): void;
  pauseAll?(): void;
  reset?(): void;
  setTimeScale?(scale: number): void;

  // 标准数据契约
  getTransportState?(): TransportState;
  getReadoutItems?(): ReadoutItem[];
  subscribe?(listener: () => void): () => void;
}

// 场景容器
interface SceneContainer {
  readonly currentLayout: LayoutMaster | null;
  readonly currentScene: Scene | null;

  // 设置场景（异步，防止竞态）
  setScene(scene: Scene): Promise<void>;

  // 布局切换（事务性：只有全部成功后才提交状态）
  switchLayout(layoutId: string, options?: SwitchOptions): Promise<void>;
  setUserPreferredLayout(layoutId: string): void;

  // 事件订阅
  on<K extends keyof SceneContainerEvents>(
    event: K,
    listener: (payload: SceneContainerEvents[K]) => void
  ): () => void;

  // 销毁
  dispose(): void;
}
```

## 3. 目录结构

```
src/
├── app/
│   └── layouts/                    # 布局母版系统
│       ├── types.ts                # 核心接口定义
│       ├── registry.ts             # 布局注册表（含输入校验 + 扩展元数据）
│       ├── selector.ts             # 布局选择器（策略插件化）
│       ├── default-strategies.ts   # 默认选择策略
│       ├── auto-register.ts        # 统一注册所有内置布局
│       ├── container.ts            # 场景容器实现（状态桥接、事务切换）
│       ├── transport-bridge.ts     # 场景状态 → 布局同步
│       ├── layout-primitives.css   # 布局共享 CSS 原语
│       ├── masters/                # 母版实现
│       │   ├── base-layout.ts      # 基类（动画保护、主题隔离、工具方法）
│       │   ├── split-right/        # 桌面端：左右分栏 + 可拖拽面板
│       │   │   ├── split-right.ts
│       │   │   └── split-right.css
│       │   └── mobile-stack/       # 移动端：垂直堆叠 + 手势支持
│       │       ├── mobile-stack.ts
│       │       └── mobile-stack.css
│       └── index.ts                # 统一导出
├── scenes/
│   ├── spring-oscillator/          # 弹簧振子
│   │   ├── scene.meta.ts
│   │   ├── scene.sim.ts
│   │   ├── scene.view.ts
│   │   ├── scene.entry.ts
│   │   ├── controls-v4.ts
│   │   └── page.ts                 # 使用 bootScenePage()
│   └── ...
└── styles/
    ├── layout-tokens.css           # 布局共享 CSS 变量
    └── teaching-shell.css          # 全局教学壳层样式
```

> **注意**：`split-right/index.ts` 在文档 v0.1 中被列出，但实际并未创建。`split-right.ts` 和 `split-right.css` 直接位于该目录下。

## 4. 现有代码保留策略

### 4.1 废弃清单（已删除）

以下文件在扩展性升级中已删除，文档保留记录供追溯：

| 文件                                          | 删除原因              | 替代方案                             |
| --------------------------------------------- | --------------------- | ------------------------------------ |
| `src/app/teaching-demo-shell.ts`              | 旧版 Shell API 已废弃 | `bootScenePage()` + `SceneAdapter`   |
| `src/scenes/spring-oscillator/page-legacy.ts` | 旧布局模板不再维护    | 参考 `projectile/page.ts`            |
| `src/scenes/spring-oscillator-legacy.html`    | 多余入口              | 移动端由 `mobile-stack` 布局自动处理 |

### 4.2 当前路由

```
页面路由:
- /spring-oscillator.html  → 使用布局母版系统 (bootScenePage)
```

所有场景统一使用 `bootScenePage()` 入口，不再区分 legacy/modern/demo。

## 5. 实施步骤

### Phase 1: 基础设施 (审阅点 1)

1. 创建接口定义 (`types.ts`)
2. 创建布局注册表 (`registry.ts`)
3. 创建共享 CSS 变量 (`layout-tokens.css`)

### Phase 2: SplitRightLayout 母版 (审阅点 2)

1. 创建基类 (`base-layout.ts`)
2. 实现 SplitRightLayout
3. 实现桌面端布局
4. 实现移动端响应式

### Phase 3: 场景容器 (审阅点 3)

1. 实现 SceneContainer
2. 实现**事务性**布局切换逻辑
3. 实现状态持久化与恢复校验
4. 实现场景-布局状态桥接（`subscribe` → `syncSceneStateToLayout`）

### Phase 4: 弹簧振子适配 (审阅点 4)

1. 创建新的场景页面
2. 实现 Scene 接口
3. 通过标准契约（`getReadoutItems` / `getTransportState` / `subscribe`）对接容器
4. 测试布局切换

### Phase 5: 鲁棒性优化 (审阅点 5)

1. 消除浮动控制条定时器泄漏
2. 修复 `setScene` 异步竞态
3. 解除 `getLayoutSlots` 硬编码类名耦合
4. 增加动画中断保护
5. 主题作用域隔离（避免污染 `document.documentElement`）
6. 增加读数面板拖拽边界与键盘支持

### Phase 6: 扩展性升级 (审阅点 6)

1. 提取 `auto-register.ts`，布局注册与场景启动解耦
2. 引入 `LayoutSelector` 策略插件化选择机制
3. 扩展 `LayoutMetadata`（`constraints` / `priority` / `autoSelectable`）
4. Vite 配置自动扫描 `src/pages/*.html`
5. 创建 `layout-primitives.css` 共享样式原语

## 6. 关键设计约束

### 6.1 场景与布局零耦合

- **禁止**：场景代码中出现 `as SplitRightLayout` 或调用 `layout.setFloatingControls()`
- **正确做法**：场景实现 `getTransportState()` / `getReadoutItems()` / `subscribe()`，由 `SceneContainerImpl` 自动桥接

### 6.2 布局切换事务性

`SceneContainerImpl.switchLayout()` 采用“先准备、后提交”模式：

1. 卸载旧布局
2. 创建并挂载新布局
3. 挂载场景到新的布局
4. 执行进入动画
5. **全部成功后**，才将 `this._currentLayout` 更新为新布局

### 6.3 主题作用域隔离

`BaseLayout.setTheme()` 仅设置 `this.container.setAttribute('data-theme', theme)`，不再污染 `document.documentElement`。这确保同一页面上的多个容器实例可以拥有独立的主题。

### 6.4 ResizeObserver 统一管理

`BaseLayout` 不再自行创建 `ResizeObserver`，改由 `SceneContainerImpl` 统一监听容器尺寸变化，再调用 `layout.handleResize()` 分发。避免多个 Observer 同时触发造成性能浪费。

### 6.5 布局选择策略插件化

`SceneContainerImpl` 不再硬编码 `detectMobile() ? mobile-stack : split-right`，而是通过 `LayoutSelector` 执行注册的策略链：

```
用户偏好 → 场景偏好（检查约束）→ 自动匹配（过滤 + 优先级排序）→ 兜底
```

新布局类别（如 tablet-landscape、presentation）无需修改 `SceneContainerImpl`，只需：

1. 注册布局时声明 `constraints` 和 `priority`
2. 或注册自定义选择策略

### 6.6 布局注册解耦

布局注册集中在 `auto-register.ts`，`bootScenePage()` 不再重复注册。新增布局只需修改 1 个文件。

## 7. 验收标准

- [x] SplitRightLayout 桌面端正常工作
- [x] SplitRightLayout 移动端响应式正常
- [x] 弹簧振子场景可在新旧布局间切换
- [x] 旧弹簧振子页面仍可访问
- [x] 主题切换同步到所有区域
- [x] 布局切换有平滑过渡动画（支持中断）
- [x] 点击 Canvas 小球启停能同步更新浮动按钮和读数面板
- [x] 场景代码不依赖具体布局类型
- [x] 新增布局只需修改 `auto-register.ts`（1 处）
- [x] 布局选择策略可插件化扩展
- [x] Vite 自动扫描页面入口，无需手动维护

---

**审阅意见栏**:

> v0.2 优化完成：增强了注册表输入校验、容器事务切换、动画中断保护、主题作用域隔离、内存泄漏修复、键盘无障碍支持。

# 布局母版系统设计文档

## 审阅记录

| 版本 | 日期 | 审阅人 | 状态 |
|-----|------|-------|------|
| v0.1 | 2026-04-02 | AI Assistant | 草案 |

## 1. 设计目标

- 建立 5-6 种预设布局母版，场景按需选择
- 母版优化惠及所有使用该母版的场景（类似 PPT 母版）
- 场景可主动请求切换布局，用户可手动覆盖
- 所有母版共享统一主题系统
- 保留现有弹簧振子作为模板，新系统不破坏旧代码

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
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Scene (场景)                                             │
│  - 声明 preferredLayout                                  │
│  - 渲染内容到 Slots                                       │
│  - 可请求布局切换                                         │
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
  
  // 布局切换动画
  enter(transition?: LayoutTransition): Promise<void>;
  exit(transition?: LayoutTransition): Promise<void>;
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
}

// 场景容器
interface SceneContainer {
  readonly currentLayout: LayoutMaster;
  readonly currentScene: Scene;
  
  // 布局切换
  switchLayout(layoutId: string, options?: SwitchOptions): Promise<void>;
  setUserPreferredLayout(layoutId: string): void;
  
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
│       ├── registry.ts             # 布局注册表
│       ├── container.ts            # 场景容器实现
│       ├── masters/                # 母版实现
│       │   ├── base-layout.ts      # 基类
│       │   ├── split-right/        # 左右分栏布局
│       │   │   ├── index.ts
│       │   │   ├── split-right.ts
│       │   │   └── split-right.css
│       │   └── stacked/            # 垂直堆叠布局 (未来)
│       └── index.ts                # 统一导出
├── scenes/
│   ├── spring-oscillator/          # 现有弹簧振子 (保留)
│   │   ├── page.ts                 # 旧页面 (隐藏)
│   │   └── page-new.ts             # 新页面 (使用布局系统)
│   └── ...
└── styles/
    └── layout-tokens.css           # 布局共享 CSS 变量
```

## 4. 现有代码保留策略

### 4.1 保留清单

| 文件 | 处理方式 | 原因 |
|-----|---------|------|
| `src/app/teaching-demo-shell.ts` | 保留，标记为 legacy | 现有布局系统，其他场景仍在使用 |
| `src/scenes/spring-oscillator/page.ts` | 保留，重命名为 `page-legacy.ts` | 作为模板参考 |
| `src/styles/teaching-shell.css` | 保留 | 现有样式 |

### 4.2 新旧共存

```
页面路由:
- /spring-oscillator.html        → 使用新布局系统
- /spring-oscillator-legacy.html → 使用旧布局系统 (保留)
```

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
2. 实现布局切换逻辑
3. 实现状态持久化

### Phase 4: 弹簧振子适配 (审阅点 4)
1. 创建新的场景页面
2. 实现 Scene 接口
3. 测试布局切换

### Phase 5: 审阅与优化
1. 代码审查
2. 性能测试
3. 文档完善

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 旧场景被破坏 | 低 | 高 | 完整保留旧文件，新系统独立目录 |
| 布局切换卡顿 | 中 | 中 | 实现过渡动画，状态预加载 |
| 移动端适配问题 | 中 | 高 | 分阶段测试，先桌面后移动 |
| 主题不一致 | 低 | 中 | 统一 CSS 变量系统 |

## 7. 验收标准

- [ ] SplitRightLayout 桌面端正常工作
- [ ] SplitRightLayout 移动端响应式正常
- [ ] 弹簧振子场景可在新旧布局间切换
- [ ] 旧弹簧振子页面仍可访问
- [ ] 主题切换同步到所有区域
- [ ] 布局切换有平滑过渡动画

---

**审阅意见栏**:

> 待审阅人填写

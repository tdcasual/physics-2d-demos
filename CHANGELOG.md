# Changelog

## 2026-04 — 布局系统扩展性升级

### 架构升级

- **布局注册解耦**：提取 `src/app/layouts/auto-register.ts`，新增布局只需修改 1 处
- **策略插件化**：引入 `LayoutSelector` + `default-strategies.ts`，布局选择逻辑从硬编码 if-else 变为可插拔策略链
- **元数据扩展**：`LayoutMetadata` 新增 `constraints`（视口约束）、`priority`（优先级）、`autoSelectable`
- **Vite 自动扫描**：`vite.config.ts` 自动扫描 `src/pages/*.html`，无需手动注册页面入口

### 文件变更

- 新增：`auto-register.ts`、`selector.ts`、`default-strategies.ts`、`layout-primitives.css`
- 修改：`registry.ts`（扩展接口）、`container.ts`（替换选择逻辑）、`scene-bootstrapper.ts`（删除注册逻辑）
- 所有 7 个场景的 `page.ts` **零修改**

---

## 2026-04 — 工程健壮性强化

### Bug 修复

- 修复 spring-oscillator 双 `init()` 调用（移除 `page.ts` 中的冗余调用）
- 修复 emf-analogy 无条件 RAF 循环（改为 `start()`/`stop()` 控制）
- 修复 projectile `getTransportState` 硬编码 `isPlaying: false`
- 修复 vt-integral metricBox 宽度参数未正确传递
- 修复 chase-meet `setParams()` 双渲染问题

### 类型安全

- 消除 `container.ts`、`mobile-stack.ts`、`split-right.ts`、`control-layout.ts` 中的 `as any`
- 标准化所有场景的 `subscribe()` 和 `getTransportState()` 实现

---

## 2026-03 — 布局母版系统 v1.0

### 核心实现

- `SplitRightLayout`：桌面端左右分栏 + 可拖拽 resizer + 浮动读数面板
- `MobileStackLayout`：移动端垂直堆叠 + 手势识别 + 性能监控
- `SceneContainerImpl`：布局切换事务性保护 + 状态持久化 + ResizeObserver 统一管理
- `TransportBridge`：场景状态 → 布局同步（读数 + 运输控制 + 浮动按钮）
- `BaseLayout`：共享生命周期、进入/退出动画（中断保护）、主题隔离

### 场景迁移

- 所有 7 个场景迁移到 `bootScenePage()` 统一入口
- 标准化 `controls-v4.ts` 控制面板

---

## 2026-03 — Modern 架构统一

### 基础设施

- 统一 TypeScript + Vite + 测试门禁
- 引入 Vitest（单元/契约）+ Playwright（E2E + 视觉回归）
- ESLint strict + Prettier 格式化
- GitHub Actions CI：install → generate → lint → typecheck → test → e2e → build

### 7 个场景全部接入 modern 渲染器

- projectile、chase-meet、field-lines、emf-analogy、electrification、vt-integral、spring-oscillator

---

## 2026-03 — 2D 教学演示标准建立

- 统一页面结构：左侧控制 + 数据读数，右侧动画演示
- 统一模式切换：`normal` / `presentation`
- 统一控制协议：播放/暂停/重置/单步/速度调节
- 高 DPI 画布自动适配
- 主题系统：light / dark + 系统偏好跟随

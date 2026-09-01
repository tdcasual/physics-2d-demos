# Changelog

> ⚠️ 本文件自 2026-05 起停止逐条维护，日常变更以 git log 为准；里程碑式的审计/修复批次仍会在此记录。

## 2026-09-01 — 弱代理场景工作流加固

### 反馈回路

- 新增 `pnpm verify:scene <id>`：场景任务一站式验证（结构→lint→类型→契约/单测→构建→bundle 预算），失败即停并打印修复指引
- 契约测试（scene-contract / scene-standard / scene-params-contract / instrument-manifest）断言失败消息全部处方化：问题 → 去哪个文件 → 怎么改 → 参考谁
- `docs/new-scene-agent-contract.md` 重写为 6 步执行卡

### 自证明与食谱

- 新增 `pnpm check:scaffold`：真实生成探针场景并验证结构/lint/类型/单测全绿后自动清理，守护脚手架模板不脱节（已纳入 quality:core/full 与 CI）；首跑即抓到模板 canvas 可选性类型 bug 并修复
- 新增 `docs/controls-cookbook.md`：12 种控件字段的可粘贴食谱
- 新增 `docs/physics-testing-guide.md`：五种独立期望值测试模式 + 镜像测试反面教材

### 防钻与兜底

- `.github/CODEOWNERS`：契约测试、视觉基线、门禁脚本、eslint 层规则划归仓库所有者 review
- CI 新增 scaffold 自检步骤；失败时 Job Summary 输出 `.github/ci-failure-triage.md` 分诊表

## 2026-09-01 — 审计跟进修复

### 正确性

- 脚手架 `page.ts` 模板 `onChange` 补 `writeParam`，新场景不再丢失 URL 写回
- interference-formula 条纹离屏缓存按 DPR 创建，避免 HiDPI 模糊
- standalone 内联失败改为非零退出；module script 全部检测；未解析 chunk 不再 `external: true`
- scene-smoke 对已声明/已实现的 getState、getSnapshot、transport 改为硬断言，消除空转通过

### 场景与仪器

- double-slit：`const base` 上移避开 TDZ；setParams 恢复「主画布 → 仪器」顺序
- micrometer 预设补写 `?preset=`；micrometer / vernier-caliper view `dispose` 改 `stage.release()`
- ganshe 控制句柄补 `setValue`/`setActive`，URL 管线可回写面板
- vernier-caliper 仪器构造路径复用 precision 吸附
- ganshe `PARAM_DOMAINS` 导出，消除测试手抄域表

### 工程

- ESLint 放行 `../types.ts`；新增层规则探针测试
- standalone：favicon 内联为 data URI，补 themeNoFlash 防闪烁
- URL 管线消除重复 `readSceneParams`；view-base 测试改为独立预期值

详见 `docs/plans/2026-09-01-audit-followup-fixes.md`。

## 2026-04 — 布局系统扩展性升级

### 架构升级

- **布局注册解耦**：提取 `src/app/layouts/auto-register.ts`，新增布局只需修改 1 处
- **策略插件化**：引入 `LayoutSelector` + `default-strategies.ts`，布局选择逻辑从硬编码 if-else 变为可插拔策略链
- **元数据扩展**：`LayoutMetadata` 新增 `constraints`（视口约束）、`priority`（优先级）、`autoSelectable`
- **Vite 自动扫描**：`vite.config.ts` 自动扫描 `src/pages/*.html`，无需手动注册页面入口

  > 注：场景页自 2026-08 起由 `vite-plugin-scene-pages` 从 `scene.meta.ts` 虚拟生成，上述「自动扫描 `src/pages/*.html`」表述已失效。

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

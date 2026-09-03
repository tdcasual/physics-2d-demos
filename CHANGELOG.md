# Changelog

> ⚠️ 本文件自 2026-05 起停止逐条维护，日常变更以 git log 为准；里程碑式的审计/修复批次仍会在此记录。

## 2026-09-02 — 仪器库：旧游标卡尺仪器移除 + 移动端布局

- 移除 `vernier-caliper` 仪器（由 vernier-caliper-guide 取代）；其 Canvas 绘制代码逐字迁入 `scenes/vernier-caliper/caliper-render.ts`，场景页渲染不变
- 移除 `spiral-micrometer` 仪器；其 Canvas 绘制代码逐字迁入 `scenes/micrometer/micrometer-render.ts`，场景页渲染不变。仪器库余 3 个组件（micrometer-eyepiece / interference-vernier-caliper / vernier-caliper-guide，均为 DOM/SVG 渲染面）
- 仪器库页面响应式重设计：移动端（width < 768px，与全局断点一致）为横向分类条 + 预览 + 底部「参数调节/组件信息」tab 页；ResizeObserver 驱动预览区尺寸动态重算（横竖屏切换、窗口缩放）
- 修复参数编辑器与视口拖拽不同步导致的失焦回灌；新增移动端 Playwright 测试（横向分类条/tab 切换/canvas 尺寸跟踪）
- 游标卡尺使用演示三轮审计修复：滑框体不再遮挡主尺刻度带（上缘降至主尺下缘，游标刻线与主尺刻线尖端相隔 2px，练习模式可正常判对齐）；demo 播放中手动拖爪自动退出演示；拖拽仅响应左键

## 2026-09-02 — 新组件：游标卡尺使用演示（vernier-caliper-guide）

- 首个 `renderTech: 'svg'` 仪器：完整解剖（内/外测量爪、深度尺、紧固螺钉、主尺、游标尺），SVG + `var(--*)` 主题直通，游标尺可拖拽
- 三种测量方式演示（外径/内径/深度）+ 使用步骤自动演示 + 隐藏答案的读数练习
- 读数引擎修复「floor + 逐格搜索」的进位边界缺陷（99.97mm 在 0.1 档被误读为 99.0 而非 100.0），改为「按精度量化再分解」；量化误差 ≤ 半个分度值由不变量测试锁定
- 仪器库页支持 SVG 仪器的视口内交互：`instrument-param` 冒泡事件统一回写 sim
- 订正 STANDARDS.md 的 step dt 单位注释（毫秒 → 秒，与生态实际一致）

### 审计修复（同日复审后）

- 被测物改为固定尺寸（targetSize），卡爪开度按物理约束钳位：外径爪 ≥ 外径、内径爪/深度尺 ≤ 被测尺寸；修复大开度下被测物放大遮断主尺刻度的问题
- 游标滑框宽度随分度自适应（50 分度游标跨 49mm，固定 150px 滑框曾溢出）；刻度像素比调整为 1mm = 4px
- 练习模式（隐藏读数）不再绘制对齐高亮线——原 0.35 透明度的高亮会直接泄露对齐格
- 拖拽命中区域补 y 向校验，点击读数面板等重叠区域不再误触发拖拽
- 紧固螺钉标注移入滑框体内随动，消除与静态「主尺」标注的碰撞；50 分度游标按惯例每 10 格标数
- STANDARDS.md 补 `instrument-param` 事件契约（事件名/detail 形状/冒泡/宿主回写职责）
- 仪器库参数编辑器与视口内拖拽双向同步：修复编辑器 number 输入失焦时用旧值回灌、把拖拽结果打回的问题
- 读数准确性经浏览器扫场验证：13 组（精度×方式×位置，含 99.97 进位边界与高量程 149.96）与独立物理搜索法逐位一致，对齐高亮线与主尺刻线几何重合

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

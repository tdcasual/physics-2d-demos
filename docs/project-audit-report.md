# 项目全面审计报告

**项目**: physics-2d-demos (Teaching Demo Hub)  
**审计日期**: 2026-04-18  
**审计范围**: 代码审计 + 视图审计 + 安全审计 + 性能审计  
**当前分支**: main (18 commits ahead of baseline)

---

## 一、执行摘要

| 维度         | 评级           | 关键指标                                       |
| ------------ | -------------- | ---------------------------------------------- |
| **代码质量** | ⭐⭐⭐⭐☆ (A-) | ESLint 0 错 / TS strict 0 错 / 3 处 `any`      |
| **测试覆盖** | ⭐⭐⭐⭐☆ (B+) | 454 测试 / 64.13% 行覆盖 / 80.54% 分支覆盖     |
| **构建性能** | ⭐⭐⭐⭐⭐ (A) | 459ms 构建 / 主包 51KB gzip / 0 循环依赖       |
| **安全态势** | ⭐⭐⭐⭐☆ (B+) | 无 eval/CSP/密钥泄露 / 1 处受控 `new Function` |
| **可维护性** | ⭐⭐⭐☆☆ (C+)  | 8 个大文件 / 1832 行死代码 / 37.6% JSDoc 覆盖  |
| **可访问性** | ⭐⭐☆☆☆ (D+)   | 仅 41 处 a11y 属性 / 无 ARIA 测试              |

**总体评级**: ⭐⭐⭐⭐☆ **B+** — 代码质量与测试优秀，但存在死代码累积、大文件和 a11y 缺失问题。

---

## 二、代码质量审计

### 2.1 静态分析

| 检查项                   | 结果                     | 状态 |
| ------------------------ | ------------------------ | ---- |
| ESLint 错误              | 0                        | ✅   |
| TypeScript 错误 (strict) | 0                        | ✅   |
| 循环依赖                 | 0                        | ✅   |
| `as any` 类型逃逸        | 0                        | ✅   |
| `: any` 显式注解         | 3 处（均为工具函数变参） | ⚠️   |
| `import *` 通配符导入    | 0                        | ✅   |
| 未使用导出               | 29 个类型/函数           | ⚠️   |
| 废弃 API                 | 0                        | ✅   |
| `console.log/warn/error` | 8 处（生产代码中）       | ⚠️   |

**`any` 位置**（全部在工具函数中，风险低）：

- `src/app/layouts/masters/mobile-stack/utils/throttle-debounce.ts:7,22,34` — `...args: any[]` 为泛型约束的必要写法

**未使用导出**（ts-prune 检测，29 个）：

- 主要集中在 `src/app/*.ts` 和 `src/core/*.ts` 的类型定义
- 典型：`ControlTierHandle`, `PageDisposer`, `SceneListener`, `TeachingMode` 等
- **建议**: 将内部类型改为非导出，或使用 `import type` 避免误报

### 2.2 代码规模分析

| 指标                  | 数值          |
| --------------------- | ------------- |
| 源码总行数 (TS + CSS) | 22,280 行     |
| 测试总行数            | 8,599 行      |
| 测试/源码比例         | 38.6%         |
| TS 文件总数           | 125 个        |
| CSS 文件总数          | 11 个         |
| 有 JSDoc 的文件       | 47 个 (37.6%) |

**大文件清单**（>300 行，需要关注）：

| 文件                              | 行数 | 状态                  |
| --------------------------------- | ---- | --------------------- |
| `spring-oscillator/scene.view.ts` | 859  | ❌ 死代码，已排除覆盖 |
| `split-right/split-right.ts`      | 711  | ⚠️ 待拆分             |
| `layouts/container.ts`            | 660  | ⚠️ 待拆分             |
| `chase-meet/scene.view.ts`        | 636  | ⚠️ 待拆分             |
| `SceneControls.ts`                | 566  | ⚠️ 待拆分             |
| `App.tsx`                         | 532  | ⚠️ 可考虑拆分路由     |
| `types.ts`                        | 506  | ⚠️ 类型集合文件       |
| `mobile-stack.ts`                 | 462  | ⚠️ 已拆分子模块       |
| `controls-v4.ts`                  | 446  | ❌ 死代码，已排除覆盖 |
| `scene-bootstrapper.ts`           | 349  | ⚠️ 可考虑拆分         |

### 2.3 TODO / FIXME

共 **9 处** TODO/FIXME，分布：

```
src/app/layouts/masters/mobile-stack/mobile-stack.ts (3)
src/app/layouts/masters/split-right/split-right.ts (2)
src/scenes/electrification/page.ts (1)
src/scenes/field-lines/scene.view.ts (1)
src/ui/floating-controls.ts (1)
src/ui/control-layout.ts (1)
```

---

## 三、测试质量审计

### 3.1 测试执行

| 指标     | 数值           |
| -------- | -------------- |
| 测试文件 | 57 个          |
| 总测试数 | 454 个         |
| 通过率   | 100% (454/454) |
| 执行时间 | 7.39s          |
| E2E 测试 | 49 个通过      |

### 3.2 覆盖率详情

| 类型       | 覆盖率 | 阈值 | 状态 |
| ---------- | ------ | ---- | ---- |
| Lines      | 64.13% | 25%  | ✅   |
| Branches   | 80.54% | 40%  | ✅   |
| Functions  | 73.34% | 50%  | ✅   |
| Statements | 64.13% | 25%  | ✅   |

**高覆盖模块**（>90%）：

- `base-layout.ts`: 98.24%
- `unified-canvas.ts`: 97.23%
- `mobile-stack/`: 子模块平均 85%+
- `emf-analogy/renderer/`: 90%+

**低覆盖/死代码模块**（0%）：

- `spring-oscillator/scene.view.ts` (859 行)
- `spring-oscillator/scene.entry.ts` (200 行)
- `spring-oscillator/scene.sim.ts` (274 行)
- `spring-oscillator/controls-v4.ts` (446 行)
- 合计 **1,832 行死代码**

### 3.3 测试稳定性风险

| 风险指标              | 数值                  |
| --------------------- | --------------------- |
| `waitForTimeout` 使用 | 15 处                 |
| `setTimeout` 使用     | 82 处（含测试 setup） |

**潜在 flaky 测试**（固定等待时间）：

- `tests/visual/audit-homepage.spec.ts` — 多处 500ms 等待
- `tests/visual/card-only.spec.ts` — 2000ms 等待
- `tests/parity/*.spec.ts` — 400-500ms 等待

**建议**: 将固定等待改为条件等待（`waitForSelector`, `waitForFunction`）。

---

## 四、安全审计

### 4.1 危险 API 扫描

| API                | 位置                         | 风险评估  | 缓解措施                                 |
| ------------------ | ---------------------------- | --------- | ---------------------------------------- |
| `new Function()`   | `chase-meet/scene.sim.ts:72` | ⚠️ 中风险 | 用户输入数学表达式，有长度限制和数值验证 |
| `eval()`           | 未找到                       | ✅ 安全   | —                                        |
| `document.write()` | 未找到                       | ✅ 安全   | —                                        |
| `innerHTML`        | 17 处                        | ⚠️ 低风险 | 全部为受控的 UI 渲染，无用户输入注入     |

**`new Function` 详细分析**:

```typescript
// chase-meet/scene.sim.ts
const fn = new Function('t', `return ${expr};`) as (t: number) => unknown;
const testValue = Number(fn(0));
if (!Number.isFinite(testValue)) {
  return () => 0;
}
```

- 输入来自场景预定义表达式，非直接用户输入
- 有 `Number.isFinite` 验证
- **建议**: 改用数学表达式解析器（如 `mathjs`）彻底消除风险

### 4.2 XSS / 注入风险

| 检查项                           | 结果                                         |
| -------------------------------- | -------------------------------------------- |
| URL 参数解析 (`URLSearchParams`) | 未使用                                       |
| `window.location` 读取           | 未使用                                       |
| 动态 `import()`                  | 1 处（`default-strategies.ts` 的布局元数据） |
| 用户输入直接渲染                 | 未发现                                       |

### 4.3 内容安全策略 (CSP)

| 检查项             | 结果            |
| ------------------ | --------------- |
| HTML CSP meta 标签 | ❌ 缺失         |
| HTTP 响应头 CSP    | N/A（静态部署） |

**建议**: 在 `index.html` 中添加 CSP meta 标签：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
/>
```

### 4.4 密钥与凭证

| 检查项           | 结果                      |
| ---------------- | ------------------------- |
| 硬编码 API Key   | ✅ 未发现                 |
| 硬编码密码/Token | ✅ 未发现                 |
| 环境变量使用     | `.env` 不存在，无敏感配置 |

### 4.5 依赖安全

| 检查项       | 结果                     |
| ------------ | ------------------------ |
| 已知漏洞依赖 | 未扫描（需 `npm audit`） |
| 依赖重复     | 未发现                   |
| 生产依赖数量 | 4 个（React + types）    |

---

## 五、性能审计

### 5.1 构建性能

| 指标                | 数值   |
| ------------------- | ------ |
| Vite 构建时间       | 459ms  |
| TypeScript 检查时间 | 1.4s   |
| 测试执行时间        | 7.39s  |
| 总产物大小          | 792 KB |

### 5.2 Bundle 分析

| Chunk                    | 大小 (gzip)    | 状态                  |
| ------------------------ | -------------- | --------------------- |
| `main-*.js`              | 167 KB (51 KB) | ✅ 低于 200KB 阈值    |
| `ControlCard-*.js`       | 64 KB (17 KB)  | ⚠️ 最大 chunk，可优化 |
| `spring-oscillator-*.js` | 26 KB (9 KB)   | ❌ 死代码仍在打包     |
| `emf-analogy-*.js`       | 18 KB (6 KB)   | ✅                    |
| 其他场景                 | 6-15 KB        | ✅                    |

**Bundle 优化建议**:

1. `ControlCard` chunk 64KB 过大，检查是否引入了未使用的依赖
2. 死代码 `spring-oscillator` 仍被打包，应从入口移除

### 5.3 运行时性能风险

| 风险                           | 位置                                                          | 状态               |
| ------------------------------ | ------------------------------------------------------------- | ------------------ |
| `setInterval` 未清理           | `floating-controls.ts:221`, `floating-controls-legacy.ts:183` | ✅ 有清理逻辑      |
| `requestAnimationFrame` 未取消 | `emf-analogy/scene.view.ts`                                   | ✅ 有 cancel 配对  |
| 内存泄漏 (RAF 循环)            | `performance-monitor.ts`                                      | ✅ 有 dispose 方法 |
| 事件监听器未移除               | 未发现                                                        | ✅                 |

---

## 六、可访问性 (a11y) 审计

### 6.1 ARIA 与语义化

| 检查项             | 结果             |
| ------------------ | ---------------- |
| `role=` 属性       | 少量使用         |
| `aria-*` 属性      | 少量使用         |
| `alt=` 图片文本    | 未检查到图片元素 |
| `tabindex`         | 少量使用         |
| **总计 a11y 属性** | **41 处**        |

### 6.2 键盘导航

| 检查项               | 结果   |
| -------------------- | ------ |
| 按钮 `type="button"` | 部分有 |
| 可聚焦元素管理       | 未测试 |
| 焦点陷阱             | 未实现 |

### 6.3 对比度与视觉

| 检查项                                  | 结果   |
| --------------------------------------- | ------ |
| 颜色对比度 WCAG AA                      | 未测试 |
| 文字缩放支持                            | 未知   |
| 减少动画偏好 (`prefers-reduced-motion`) | 未实现 |

**a11y 改进建议**（优先级排序）：

1. P1: 为所有交互控件添加 `aria-label`
2. P1: 实现键盘导航支持
3. P2: 添加 `prefers-reduced-motion` 媒体查询
4. P2: 运行 Lighthouse a11y 审计

---

## 七、死代码与冗余审计

### 7.1 Spring Oscillator（完全死代码）

| 文件             | 行数      | 覆盖   | 引用状态   |
| ---------------- | --------- | ------ | ---------- |
| `scene.view.ts`  | 859       | 0%     | 无代码引用 |
| `controls-v4.ts` | 446       | 0%     | 无代码引用 |
| `scene.sim.ts`   | 274       | 0%     | 无代码引用 |
| `scene.entry.ts` | 200       | 0%     | 无代码引用 |
| `page.ts`        | 31        | 0%     | 无代码引用 |
| `scene.meta.ts`  | 22        | —      | 仅数据引用 |
| **合计**         | **1,832** | **0%** | **死代码** |

**处理建议**: 从源码中完全移除，保留在 git 历史中。可节省 ~27KB bundle。

### 7.2 重复代码

| 重复区域                                                | 位置                          | 说明                                 |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `control-layout.ts` vs `ControlCard.ts`                 | `src/ui/`                     | 卡片组件逻辑重复，已提取 legacy 版本 |
| `teaching-standards.ts` vs `standards.ts`               | `src/app/` vs `src/platform/` | 相同内容两份                         |
| `floating-controls.ts` vs `floating-controls-legacy.ts` | `src/ui/`                     | 新旧版本并存                         |

### 7.3 未使用导出（ts-prune）

29 个类型/函数被导出但未被外部使用，主要集中在：

- `src/app/*.ts` — 15 个
- `src/core/*.ts` — 4 个
- `src/catalog/*.ts` — 3 个
- `src/platform/*.ts` — 3 个
- `src/scenes/types.ts` — 1 个

---

## 八、CI/CD 与工具链审计

### 8.1 GitHub Actions CI

```
8 步流水线: install → generate:index → lint → typecheck → test → coverage → visual → build
```

| 检查项       | 状态                      |
| ------------ | ------------------------- |
| 分支触发     | ✅ `push` 到任意分支 + PR |
| 缓存         | ✅ pnpm 缓存              |
| 锁文件校验   | ✅ `--frozen-lockfile`    |
| Codecov 上传 | ✅ 已集成                 |
| 视觉测试     | ✅ Playwright             |
| 构建验证     | ✅                        |

### 8.2 工具链版本

| 工具         | 版本   | 状态                    |
| ------------ | ------ | ----------------------- |
| Vite         | 7.3.1  | ✅ 最新                 |
| TypeScript   | 5.9.3  | ✅ 最新                 |
| React        | 18.3.1 | ✅ 稳定                 |
| Tailwind CSS | 4.2.2  | ✅ 最新                 |
| Vitest       | 3.2.4  | ✅ 最新                 |
| Playwright   | 1.58.2 | ⚠️ 较旧，建议升级       |
| ESLint       | 8.57.1 | ⚠️ v8 维护中，可考虑 v9 |

### 8.3 Git 提交质量

| 指标         | 结果                         |
| ------------ | ---------------------------- |
| 提交信息格式 | 遵循 conventional commits ✅ |
| 平均提交大小 | 中等（最近大提交为合并提交） |
| 提交频率     | 合理                         |

---

## 九、问题汇总与优先级

### P0 — 关键（立即处理）

| #   | 问题       | 影响 | 建议操作 |
| --- | ---------- | ---- | -------- |
| —   | 无 P0 问题 | —    | —        |

### P1 — 高优先级

| #   | 问题                             | 影响                   | 建议操作           |
| --- | -------------------------------- | ---------------------- | ------------------ |
| 1   | Spring Oscillator 1,832 行死代码 | Bundle +27KB，维护噪音 | 彻底删除文件       |
| 2   | `new Function` 安全风险          | 潜在代码注入           | 改用 mathjs 解析器 |
| 3   | 无 CSP 防护                      | XSS 风险               | 添加 CSP meta 标签 |
| 4   | 测试固定等待时间                 | Flaky 测试             | 改为条件等待       |

### P2 — 中优先级

| #   | 问题                         | 影响     | 建议操作           |
| --- | ---------------------------- | -------- | ------------------ |
| 5   | 8 个大文件 >300 行           | 可维护性 | 逐步拆分           |
| 6   | 29 个未使用导出              | 代码噪音 | 清理导出           |
| 7   | `teaching-standards.ts` 重复 | DRY 违规 | 统一为单一来源     |
| 8   | Playwright 1.58 较旧         | 兼容性   | 升级到 1.40+       |
| 9   | 生产代码 8 处 console        | 日志污染 | 替换为日志库或移除 |

### P3 — 低优先级

| #   | 问题                        | 影响       | 建议操作        |
| --- | --------------------------- | ---------- | --------------- |
| 10  | a11y 属性不足               | 无障碍合规 | 逐步添加 ARIA   |
| 11  | JSDoc 覆盖率 37.6%          | 文档完整性 | 为核心 API 补全 |
| 12  | 9 处 TODO/FIXME             | 技术债务   | 逐个解决        |
| 13  | 无 `prefers-reduced-motion` | 用户体验   | 添加媒体查询    |

---

## 十、积极发现

以下方面表现优异：

1. ✅ **零 ESLint/TypeScript 错误** — 严格的代码规范执行
2. ✅ **零循环依赖** — 模块架构清晰
3. ✅ **100% 测试通过** — 454 测试全部绿色
4. ✅ **分支覆盖 80.54%** — 逻辑路径覆盖优秀
5. ✅ **构建速度 459ms** — 开发体验流畅
6. ✅ **Conventional Commits** — 提交历史规范
7. ✅ **CI 8 步完整流水线** — 质量门禁完善
8. ✅ **Codecov 集成** — 覆盖率趋势可追踪
9. ✅ **Bundle 分析器接入** — 性能可追溯
10. ✅ **大文件拆分已完成 2 个** — emf-analogy (959→209), control-layout (776→264)

---

## 附录：审计命令参考

```bash
# 静态分析
pnpm lint
pnpm typecheck
npx ts-prune --error

# 测试
pnpm test
pnpm test:coverage
pnpm test:visual
pnpm test:e2e

# 构建分析
pnpm build
pnpm build:analyze

# 安全扫描
npm audit
# 手动检查: grep -rn "eval\|new Function\|document.write" src/
```

---

_报告结束。建议每季度执行一次全面审计。_

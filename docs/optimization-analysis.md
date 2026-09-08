# 项目深度分析与优化建议

> **⚠️ 历史快照（2026-04-20）**。禁止按本文数字提 PR。文中「三个核心瓶颈」
> （Main 167KB、覆盖率 62%、监听器泄漏）是当时结论，不是现行债。
> 现行瓶颈见 [`docs/plans/2026-09-08-wave6-current-bottlenecks.md`](plans/2026-09-08-wave6-current-bottlenecks.md)
> 与 `scripts/check-bundle-budget.ts`。

**分析日期**: 2026-04-20  
**分析范围**: 构建性能、代码质量、测试策略、架构健康度  
**当前状态**: 57 测试文件 / 454 测试通过 / 0 ESLint / 0 TS 错误

---

## 一、执行摘要

项目整体健康度良好，但存在三个核心瓶颈：

1. **Main Bundle 过大** (167KB) — 包含大量可拆分代码
2. **测试覆盖不均** — 62% 行覆盖，关键模块 0% 覆盖
3. **事件监听器泄漏** — 103 处添加 vs 36 处移除

| 维度     | 评分 | 说明                          |
| -------- | ---- | ----------------------------- |
| 构建性能 | C+   | Main chunk 167KB 超标         |
| 代码质量 | B+   | 0 静态错误，但 innerHTML 过多 |
| 测试覆盖 | C    | 62% 行覆盖，0% 文件过多       |
| 内存安全 | C+   | 67 处监听器不平衡             |
| 架构健康 | B    | 0 循环依赖，但 imports 过深   |

---

## 二、构建产物分析

### 2.1 Chunk 分布

| Chunk                  | 原始   | Gzip      | 评估                    |
| ---------------------- | ------ | --------- | ----------------------- |
| `main-*.js`            | 167 KB | **51 KB** | ❌ 过大，应 <100KB      |
| `SchemaRenderer-*.js`  | 74 KB  | 19 KB     | ⚠️ 场景共享，但体积过大 |
| `teaching-shell-*.css` | 44 KB  | 8 KB      | ⚠️ CSS 体积偏大         |
| `emf-analogy-*.js`     | 18 KB  | 6 KB      | ✅ 合理                 |
| `chase-meet-*.js`      | 15 KB  | 6 KB      | ✅ 合理                 |
| `vt-integral-*.js`     | 12 KB  | 4 KB      | ✅ 合理                 |
| `field-lines-*.js`     | 9 KB   | 4 KB      | ✅ 合理                 |
| `electrification-*.js` | 8 KB   | 3 KB      | ✅ 合理                 |
| `projectile-*.js`      | 6 KB   | 3 KB      | ✅ 合理                 |

**问题诊断**：

- **Main chunk 167KB** 包含了 React、路由、布局系统、UI 组件等所有非场景代码
- **SchemaRenderer 74KB** 是所有场景共享的控件渲染器，但被每个场景 chunk 单独引用（重复打包风险）
- **teaching-shell.css 44KB** 包含大量通用样式，可能包含未使用的规则

### 2.2 Bundle 优化建议

**建议 1: Main Chunk 拆分（P0）**

```
main.js (167KB) →
  ├── vendor.js  (React, ReactDOM ~50KB)
  ├── app.js     (App.tsx, 路由 ~40KB)
  ├── layouts.js (布局系统 ~50KB)
  └── ui.js      (共享 UI 组件 ~30KB)
```

实现方式：在 `vite.config.ts` 中配置 `manualChunks`：

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        layouts: ['./src/app/layouts/index.ts'],
        ui: ['./src/ui/index.ts']
      }
    }
  }
}
```

**建议 2: SchemaRenderer 共享 Chunk（P0）**

- 当时 SchemaRenderer 被 6 个场景 page.ts 导入（2026-08 复查：已增至 15 个场景）
- 如果每个场景 chunk 都内联 SchemaRenderer，总重复量 = 74KB × 场景数
- **实际上 Vite 会自动去重**，但 main chunk 可能已经包含了它
- 验证方式：检查 `main-C9DGGBct.js` 中是否包含 SchemaRenderer 代码

**建议 3: CSS 优化（P1）**

- `teaching-shell.css` (44KB) 和 `mobile-stack.css` (758行) 可能包含大量未使用规则
- 建议引入 `purgecss` 或检查 Tailwind CSS 的 content 配置

---

## 三、测试策略分析

### 3.1 测试分布

| 类型     | 文件数 | 占比 | 评估                |
| -------- | ------ | ---- | ------------------- |
| Unit     | 54     | 65%  | ✅ 健康             |
| Visual   | 21     | 25%  | ⚠️ 过多，维护成本高 |
| E2E      | 2      | 2%   | ❌ 过少             |
| Parity   | 5      | 6%   | ✅ 合理             |
| Contract | 1      | 1%   | ✅ 合理             |

**问题诊断**：

- Visual 测试 21 个文件占 25%，但主要是截图对比，执行慢且脆弱
- E2E 仅 2 个文件，核心用户流程覆盖不足

### 3.2 覆盖率热点

| 覆盖范围  | 数值   | 状态             |
| --------- | ------ | ---------------- |
| Lines     | 62.12% | ⚠️ 低于 70% 目标 |
| Branches  | 79.61% | ✅ 良好          |
| Functions | 73.97% | ⚠️ 可提升        |

**0% 覆盖的关键模块**：

| 文件                                       | 行数 | 说明        |
| ------------------------------------------ | ---- | ----------- |
| `src/app/main.tsx`                         | 37   | React 入口  |
| `src/core/chart/line-chart.ts`             | 284  | 图表渲染    |
| `src/core/chart/chart-canvas.ts`           | 122  | 图表 Canvas |
| `src/core/chart/chart-theme.ts`            | 56   | 图表主题    |
| `src/app/sections/TimelineSection.tsx`     | 250  | 时间线 UI   |
| `src/platform/controls-schema.ts`          | ~200 | 控件 schema |
| `src/app/layouts/container-persistence.ts` | 81   | 持久化      |

**低覆盖建议（P1）**：

1. `container-persistence.ts` — 刚提取的模块，需要补测试
2. `chart-*.ts` — 3 个图表文件 0% 覆盖，但场景中使用
3. `TimelineSection.tsx` — React 组件，需要组件测试

---

## 四、内存安全分析

### 4.1 事件监听器平衡

| 指标                    | 数值                 |
| ----------------------- | -------------------- |
| `addEventListener`      | 103 处               |
| `removeEventListener`   | 36 处                |
| **差距**                | **67 处**            |
| `setInterval`           | 2 处（已清理）       |
| `requestAnimationFrame` | 8 处（大部分已清理） |

**风险评估矩阵**：

| 风险等级 | 文件                          | 原因                                                  |
| -------- | ----------------------------- | ----------------------------------------------------- |
| 🔴 高    | `floating-controls-legacy.ts` | setInterval + 大量 addEventListener，dispose 不完整   |
| 🔴 高    | `floating-controls.ts`        | setInterval + addEventListener，dispose 仅清 interval |
| 🟡 中    | `ui/components/*.ts` (6个)    | 无 dispose 方法，组件销毁时监听器残留                 |
| 🟡 中    | `split-right.ts`              | 已修复 ✅，但需验证长期稳定性                         |
| 🟢 低    | `base-layout.ts`              | signal.addEventListener 使用 `{ once: true }`         |

**优化建议（P1）**：

1. 为所有 UI 组件工厂函数返回 `dispose` 方法
2. 在 `SceneContainerImpl.dispose()` 中级联调用组件 dispose
3. 使用 `AbortController` 统一清理事件监听器

---

## 五、代码质量分析

### 5.1 DOM 创建模式

| 模式                               | 次数 | 问题                 |
| ---------------------------------- | ---- | -------------------- |
| `document.createElement('div')`    | 65   | 重复代码，无统一工具 |
| `document.createElement('span')`   | 17   | 同上                 |
| `document.createElement('button')` | 13   | 同上                 |
| `.innerHTML =`                     | 46   | XSS 风险，性能开销   |
| `.innerHTML = ''`                  | 15   | 清理 DOM 的粗暴方式  |

**建议（P2）**：创建统一的 DOM 构建工具：

```typescript
// src/ui/utils/dom-builder.ts
export function el(
  tag: string,
  attrs?: Record<string, string>,
  children?: Node[]
): HTMLElement;
export function div(className: string, children?: Node[]): HTMLDivElement;
export function button(options: {
  label: string;
  onClick: () => void;
}): HTMLButtonElement;
```

### 5.2 Import 深度

| 文件                        | Import 数 | 说明                   |
| --------------------------- | --------- | ---------------------- |
| `mobile-stack.ts`           | 12        | 已拆分子模块，但仍较多 |
| `vt-integral/page.ts`       | 10        | 场景页面模板           |
| `field-lines/page.ts`       | 10        | 场景页面模板           |
| `emf-analogy/scene.view.ts` | 9         | 场景视图               |

**建议（P2）**：提取场景 page.ts 的公共模板，减少重复导入。

---

## 六、架构健康度

### 6.1 模块依赖

- **循环依赖**: 0 ✅
- **最大依赖深度**: 约 5 层（scene → view → renderer → platform → core）
- **孤立模块**: `container-persistence.ts`（刚提取，无独立测试）

### 6.2 场景架构一致性

6 个场景的 `page.ts` 结构高度重复：

```typescript
// 每个 scene/*/page.ts 都包含：
1. import meta
2. import scene entry
3. import controls
4. export default { meta, mount() { ... } }
```

**建议（P2）**：创建场景工厂函数：

```typescript
// src/scenes/scene-factory.ts
export function createScenePage(options: {
  meta: SceneMeta;
  createScene: () => Scene;
  createControls?: (scene) => HTMLElement;
}): ScenePage;
```

---

## 七、优化路线图

### Phase 1: 性能急救（1-2 天）

| #   | 任务                                      | 预期收益              |
| --- | ----------------------------------------- | --------------------- |
| 1   | Main Bundle 拆分为 vendor + app + layouts | main 从 167KB → ~80KB |
| 2   | 验证 SchemaRenderer 是否重复打包          | 减少 0-74KB 重复      |
| 3   | CSS purge/优化                            | 44KB → ~30KB          |

### Phase 2: 质量提升（3-5 天）

| #   | 任务                           | 预期收益           |
| --- | ------------------------------ | ------------------ |
| 4   | 为 0% 覆盖文件补测试           | 覆盖率 62% → 75%   |
| 5   | 统一事件监听器清理模式         | 消除 67 处泄漏风险 |
| 6   | innerHTML → createElement 替换 | 减少 XSS 风险      |

### Phase 3: 架构优化（1-2 周）

| #   | 任务                      | 预期收益                  |
| --- | ------------------------- | ------------------------- |
| 7   | 提取场景 page.ts 公共模板 | 减少 6 个重复文件         |
| 8   | 创建 DOM 构建工具         | 减少 50% DOM 创建重复代码 |
| 9   | Visual 测试精简           | 21 → 10 个，提升 CI 速度  |
| 10  | E2E 测试扩充              | 2 → 6 个核心流程          |

---

## 八、立即行动项（Top 5）

### 🔴 P0-1: Bundle 拆分配置（2 小时）

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/react')) return 'vendor';
        if (id.includes('/layouts/')) return 'layouts';
        if (id.includes('/ui/')) return 'ui';
        if (id.includes('/scenes/') && id.includes('/page')) return 'scenes';
      }
    }
  }
}
```

### 🔴 P0-2: SchemaRenderer 重复打包检查（1 小时）

```bash
# 检查 main chunk 是否包含 SchemaRenderer 代码
grep -o "SchemaRenderer\|createSceneControls\|createSliderRow" dist/assets/main-*.js | wc -l
```

### 🟡 P1-1: container-persistence 补测试（2 小时）

```typescript
// tests/unit/container-persistence.spec.ts
describe('container-persistence', () => {
  it('should save and restore state with version', () => { ... });
  it('should reject old version data', () => { ... });
});
```

### 🟡 P1-2: 事件监听器清理审计（4 小时）

为以下文件添加 dispose：

- `floating-controls.ts`
- `floating-controls-legacy.ts`
- `ui/components/compact-control-row.ts`
- `ui/components/param-slider.ts`

### 🟡 P1-3: chart 模块补测试（3 小时）

`line-chart.ts`, `chart-canvas.ts`, `chart-theme.ts` 目前 0% 覆盖。

---

## 九、度量基准

当前基线：

```
Bundle:        main 167KB / SchemaRenderer 74KB / CSS 44KB / Total 756KB
Coverage:      Lines 62.12% / Branch 79.61% / Funcs 73.97%
Listeners:     add 103 / remove 36 / Gap 67
Tests:         454 tests / 57 files / 7.4s
Build:         425ms
Lint:          0 errors
TypeScript:    0 errors (strict)
```

Phase 1 目标：

```
Bundle:        main <100KB / Total <600KB
Coverage:      Lines 62% → 70%
Listeners:     Gap 67 → 30
Tests:         454 → 500+
Build:         <500ms
Lint/TS:       0 errors (维持)
```

---

_分析结束。建议按 Phase 顺序执行，每个 Phase 完成后重新测量基线。_

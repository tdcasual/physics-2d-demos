# 质量门禁与维护流程

本文档定义项目进入主干前必须满足的工程质量门禁。目标不是追求数字漂亮，而是让架构、体积、视觉和交互回归都能被自动化约束。

## 本地门禁

日常开发先运行快速门禁：

```bash
pnpm quality:core
```

合并或发布前运行完整门禁：

```bash
pnpm quality:full
```

`pnpm check:bundle` 依赖 `dist/`，因此必须在 `pnpm build` 之后运行。
`quality:core` 已按该顺序编排：结构检查、依赖检查、静态检查、单元测试、构建、bundle budget。
`quality:full` 已按该顺序编排：结构检查、依赖检查、静态检查、单元/覆盖率、构建、bundle budget、E2E、视觉测试。

## Bundle Budget

预算脚本：`scripts/check-bundle-budget.ts`

默认预算：

| 指标             |   上限 |
| ---------------- | -----: |
| Total JS         | 500 kB |
| Total CSS        |  80 kB |
| Single JS asset  | 180 kB |
| Single CSS asset |  60 kB |
| Vendor JS        | 170 kB |

预算采用未压缩产物大小，原因是它更容易暴露真实模块增长；gzip 体积可以作为分析指标，但不作为当前 CI 阻断条件。

调整预算的规则：

1. 先确认增长来自真实需求，而不是无意引入依赖或重复打包。
2. 在 PR 描述中写清楚增长来源、影响范围和替代方案。
3. 同步更新 `tests/unit/bundle-budget.spec.ts` 中的默认预算断言。
4. 重新运行 `pnpm build && pnpm check:bundle`。

## 视觉快照维护

视觉快照只在以下情况更新：

1. 设计或布局发生有意变更。
2. Canvas 响应式比例发生有意变更。
3. 浏览器渲染基线变更，且人工确认差异可接受。

更新流程：

```bash
pnpm test:visual
pnpm test:visual:update
pnpm test:visual
```

提交快照前必须人工查看差异，重点检查：

- 移动端是否出现横向滚动、遮挡、文字溢出。
- Canvas 是否非空、尺寸合理、主体内容没有被裁切。
- 亮色/暗色主题下控件对比度是否仍然可读。
- 读数面板、transport、侧边栏开合等交互入口是否仍在预期位置。

## CI 顺序

CI 先跑结构、类型、单测和视觉，再构建并检查 bundle budget。这样可以把“代码不合法”和“产物超预算”分开定位。

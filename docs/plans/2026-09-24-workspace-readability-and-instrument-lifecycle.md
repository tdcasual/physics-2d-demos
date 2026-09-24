# 数据工作区可读性与双缝仪器生命周期

> 状态：**已实施；Codex 代码与目标交互验收完成，全量 E2E / Grok 复审有残项**（2026-09-24）。数据表已改为内部横向滚动并收紧投影面板；短横屏图表已提高首屏绘图区。
> 范围：共享 data-workspace、ticker-tape 数据处理/图像分析、double-slit 第 6 步仪器跨布局生命周期。
> 不改 Linux 视觉基线，不提交、不推送。

## 1. 审计证据

工作区在 `dec3200` 之上还有未提交改动：三档课堂字号、图像分析分隔条、纸带非正方形图、状态文案收成「✓ / ✗ 不通过 / ↻ 需重校」、投影表格内部横向滚动，以及异步 capability/仪器失败重试与清理。

| 观察                          | 证据                                                                                                                                                                                                                                               | 结论                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1080p 没有独立字号档          | `data-workspace.css` 里 `--dw-type-title: 20px`、表/回顾 16px、按钮 16px，无 `min-width: 1600px` 媒体查询                                                                                                                                          | 投影仍偏小                                                    |
| 1280×720 正文不到 18px        | 同一组变量，Playwright 默认视口就是 1280×720                                                                                                                                                                                                       | 不满足教室近看                                                |
| 回顾区默认占图表舞台约 1/3    | 面板把 `--dw-split` 写成 `33.33%`，并在初始化时写入 `localStorage`                                                                                                                                                                                 | 短表下方是空带                                                |
| 图被收成居中正方形            | `layoutGraphSquares`：边长 = min(列宽, 可见高)，单图也不拉满                                                                                                                                                                                       | 宽画布两侧和上方留白                                          |
| 字号还会再缩到目标的 80%      | `graphTypePx` 用 `scaledSize(..., base * 0.8)`                                                                                                                                                                                                     | 小画布上刻度会掉到 16px 以下                                  |
| 窄屏表可能被裁掉              | `@media (max-width: 720px)` 把 `.data-workspace-table-wrap` 设为 `overflow-x: hidden`；fields 横滑只在该断点内                                                                                                                                     | 844×390 不进这条规则，列可能被父级裁掉                        |
| 第 6 步仪器跟着旧槽一起被拆掉 | 仪器 wrap 挂在 `canvas.parentElement`。布局切换只保留 `querySelector('canvas')`，`unmount` 的 `replaceChildren()` 把 wrap 卸下。`ensureInstrumentCanvases` 在 `instrumentWrap` 非空时直接 return，`syncInstruments` 又只在 `lastStep !== 6` 时创建 | split-right / lab-stage / mobile-stack 来回切后仪器不在新槽里 |
| 异步加载和切换会交错          | `initInstruments` 的 `finally` 无条件把 `instrumentsLoadPromise` 置空                                                                                                                                                                              | 旧请求结束可能清掉新请求的句柄                                |
| 状态色对比                    | `--danger` 未在主题里定义，浅色回落 `#b42318` 尚可；深色底上偏暗。合格色用 `--accent-color`（`#4ecdc4`），浅色底上对比不足                                                                                                                         | 校对「✓ / ✗」在浅色主题不达标                                 |
| 分隔条                        | 已有 pointer、方向键、18–72 钳制、24px 热区                                                                                                                                                                                                        | 保留，热区加大到可触摸，默认改成贴合内容                      |

纸带是目前唯一 `chartAnalysis: true` 的场景。双缝 `chartAnalysis: false`，不创建图像分析按钮。

## 2. 优先发现

1. 字号按视口分三档，1080p 相对 720p 要有看得见的一跳。
2. 回顾表默认贴住内容；分隔条仍可用鼠标、触摸和键盘在 18%–72% 之间调整。
3. 选中的图铺满绘图区宽和高。一张图占满整幅；两张在宽屏并排各占半幅并拉满高度。只有窄或矮时才单列滚动。x–t / v–t 不锁正方形。
4. 表和回顾表用明确的横向滚动容器，不用 `overflow: hidden` 切掉列。手机正文不低于 16px。
5. 第 6 步两个仪器在布局切换后仍挂在当前画布父节点上，读数和设置保留，异步加载不重复挂节点、不重复订阅读数。

## 3. 验收标准

| 视口                                            | 标题  | 表 / 回顾 / 正文 / 关键标签 / 输入 / 按钮 | 图题 / 轴 / 刻度 |
| ----------------------------------------------- | ----- | ----------------------------------------- | ---------------- |
| ≤720px 宽，或高度 <640px（含 390×844、844×390） | ≥20px | ≥16px                                     | ≥18 / 16 / 16    |
| ≥1100×640（含 1280×720）                        | ≥24px | ≥18px                                     | ≥20 / 18 / 18    |
| ≥1600×900（含 1920×1080）                       | ≥32px | ≥24px（状态符 ≥22px）                     | ≥24 / 20 / 18    |

- 1080p 回顾区高度贴近表内容（表高 + 内边距），而不是舞台的 33%。
- 分隔条热区 ≥32px，视觉线 ≤2px；方向键 / Page / Home / End、拖拽、触摸都能改比例，并钳在 18–72。
- 宽屏两图：各占满列宽和可见高度。单图：占满绘图区。窄屏两图：单列，宿主可滚动。不出现居中小方块。
- 390×844 与 844×390：fields 表可横向滚到最后一列，页面本身不出现横向溢出。
- 第 6 步在 split-right、lab-stage、mobile-stack 之间反复切换后，游标卡尺和测微目镜各一份、仍连接、读数不变、还能拖。加载未完成时切换也不丢、不复制。
- 浅色 / 深色主题下正文、合格、错误状态可读。
- 不更新 `*-linux.png` 视觉基线。

## 4. 实施步骤

1. `data-workspace.css`：三档字号变量、收紧单元格和回顾区内边距、内容贴合 / 手动分隔两态、表和回顾的横向滚动口、绘图工具条字号、焦点环、状态色改走主题令牌。
2. `themes.css`：补 `--danger` 与 `--status-ok`（浅色深字、深色浅字）。
3. `data-workspace-panel.ts`：默认 `data-split-mode=content`，只有用户拖动或按键才进入 manual 并记住 `dw-split-fit-<id>`。表容器和回顾区可聚焦以便键盘滚动。
4. `ticker-tape/scene.view.ts`：`layoutGraphPanels` 按可见绘图区铺满；一张图整幅，两张宽屏并排，窄或矮则单列滚动。画布字号直接读 `--dw-canvas-*`，不再乘到 80%。
5. `double-slit/scene.entry.ts`：每次同步都把仪器 wrap 挂回当前画布父节点；`reattach` / `resize` 走同一条路径。加载世代号避免过期回调写进新实例；`finally` 只清自己的 Promise。
6. 契约测试锁住未来 `chartAnalysis` 场景的分隔条、滚动口和字号档；纸带图布局单测；双缝生命周期单测；两条 E2E。
7. 新截图只用 `artifacts/data-workspace/screenshots/audit-20260924-*`，不覆盖已有文件。看图后再改。

## 5. 测试矩阵

| 检查                                                          | 位置                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 内容贴合默认、手动 18–72、键盘与指针                          | `tests/unit/data-workspace-generic.spec.ts`                                                    |
| 三档 CSS 变量与滚动口                                         | `tests/unit/data-workspace-readability-contract.spec.ts`                                       |
| 单图铺满、双图并排、窄屏滚动                                  | `tests/unit/ticker-tape-graph-layout.spec.ts`                                                  |
| 仪器跨父节点、重复 reattach、读数保留                         | `tests/unit/double-slit-instrument-lifecycle.spec.ts`                                          |
| 720/1080 字号、图铺满、分隔条、手机横滑                       | `tests/e2e/ticker-tape-data-workspace.spec.ts`                                                 |
| 三布局反复切换与加载竞态                                      | `tests/e2e/double-slit-data-workspace.spec.ts`                                                 |
| 截图矩阵（浅色/深色、数据步/图像分析、分隔条、第 6 步三布局） | `tests/e2e/ticker-tape-data-workspace.spec.ts`、`tests/e2e/double-slit-data-workspace.spec.ts` |

## 6. 实际验证

本轮视觉基线未改。用户明确要求提交并推送；全量 E2E 的未解决失败已记录在下方。

- `pnpm quality:core`：最新完整运行退出码 0；结构、脚手架、布局、循环依赖、审计、ESLint、Prettier、TypeScript、覆盖率、构建和 bundle 预算全部通过。构建指标约为 shared JS 133.50 kB / 150 kB、vendor 24.02 kB / 160 kB、ticker-tape 165.08 kB / 200 kB、double-slit 182.16 kB / 200 kB。
- 聚焦单测：11 个文件、157 个测试通过；包含 data-workspace 阶段协议、图表布局、lazy runtime 重试、双缝生命周期和挂载契约。
- `tsc --noEmit --pretty false`：通过；`git diff --check`：通过。
- Playwright（`playwright.e2e.config.ts`）：目标回归子集通过，覆盖双缝三次测量、ticker-tape 草稿门禁、跨布局几何稳定性。最终 2 项聚焦重跑通过；完整 `quality:full` 的 E2E 未通过，具体失败类型见“全量审计残项”。
- `pnpm check:audit`：完成；报告 2 个 moderate，均为 `pnpm-workspace.yaml` 中既有 dev 依赖链忽略项，无 high/critical。
- VM 上现有的截图证据位于 `artifacts/data-workspace/screenshots/audit-20260924-dense5-*`；未更新 Linux/Darwin 基线。本轮未生成或声称存在 dense6。
- 自动几何验收覆盖 split-right、mobile-stack、lab-stage 新增行前后动画区坐标与尺寸保持在 1px 内；窄横屏图表仍以可滚动语义验收。本轮不把未复核的截图当作视觉 PASS。
- Grok CLI 两次视图修订均在读取/思考阶段超时，没有落地代码或最终 `GROK_VIEW_PASS`；VM 当前 Grok 进程在其他项目目录，未被本轮调用，不能称为 Grok 已通过。

## 7. 残留风险

- Linux 像素基线预期会因入口按钮和投影字号变化而过期。本轮不更新 `*-linux.png`。
- 平移缩放按钮仍是 36px / 13px，受「按钮簇不得盖住仪器」的既有断言约束，不在这次放大。
- 内容贴合低于 18% 时，第一次按键或拖拽会进入手动档并钳到 18–72，表会突然变高一截。
- 旧的 `dw-split-<id>` 不再读取，避免把以前存下的 33% 带回空带。
- 用户手动把分隔条拖到较大比例时，回顾表仍会保留该比例；这属于显式用户设置，不应被默认 content-fit 逻辑覆盖。
- 844×390 在极短高度下不保证两张完整曲线同时进入首屏，验收仍以真实曲线像素、可滚动和无横向页面溢出为准。
- runtime 和双缝仪器实例化失败现在可重试/清理，但仍需在真实网络 chunk 失败环境做一次手工恢复演练。

## 8. 全量审计残项

`pnpm quality:full` 的核心检查和单测通过，但全场景 Playwright 未通过（454 项通过，并有失败）。代表性失败为：

- `All scenes transport and playback` 把初始状态固定为暂停，和 `accel-force` 的默认 `autoRun: true` 冲突。该场景实现没有在本轮改动中修改。
- `SplitRightLayout Desktop / ticker-tape loads with correct structure` 的通用画布选择器命中 1×1 辅助画布。选择器与该场景的结构需进一步核查；不能以目标工作区 E2E 通过替代这项全量验收。

其余目标功能的核心质量、阶段流程和几何回归通过；全量 Playwright 和 Grok 独立复审仍为未完成项。

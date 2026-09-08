# Wave 6 之后的现行瓶颈（一页）

> 口径以代码与 `scripts/check-bundle-budget.ts` 为准。禁止按 `docs/optimization-analysis.md` / `docs/performance-design.md` 的 2026-04 数字提 PR。

**基线**：`main` @ Wave 6 落地后。产品：18 场景 + 3 仪器。

## 本波已做

- chase-meet 页内布局切换 E2E（时钟 + 播放 + motion canvas 内容）
- visual-regression first-frame 信号（`.layout-master[data-first-frame]` + 可见 canvas 尺寸）
- 首页去掉 `mounted` 空白；hero 只预载 6 个 featured meta
- xt-graph / tortoise-hare 静态层 blit（ganshe 同构 `save`/`restore`）
- 删除死 `saveState`/`restoreState`
- 首页生产构建 alias 到 Preact/compat（完整 jsx-runtime 集合，vendor gzip ~9.6 kB）；Vitest 仍走真 React，避免 Testing Library 混运行时。vendor 预算 raw 上限本波不动
- 脚手架 view 使用 `createCanvasViewport({ sizing: { mode: 'raw' } })` + floor-rect measure

## 仍开放（不要回填 Wave 6）

| 项                                     | 说明                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| vanilla 首页                           | 去掉 React/Preact 依赖；FCP 已修，gzip 走 Preact                                            |
| ganshe 主波画布静态层                  | 观察点 xt 图已缓存；主波未做                                                                |
| vendor 预算棘轮                        | `maxVendorJsKb` 仍 160；实测 raw 下降后再单独降到 60                                        |
| `createCanvasViewBase`                 | 不存在；用现有 `view-base.ts`。剩余未迁：ganshe、projectile、spring-oscillator、vt-integral |
| 对比度 token / 运输条 DOM 合并         | 会炸双平台 72 张 PNG                                                                        |
| 第 4 布局、场景页 CSP、18-sim 刷新续播 | 非目标                                                                                      |

## 视觉权威

Linux：`scripts/visual-linux-container.sh`。Darwin：Mac 或 `update-darwin-snapshots.yml`。宿主机 `pnpm test:visual` 不是权威。

# 2026-09-01 审计跟进修复

> 来源：代码审计 4 个中级 + 11 个低级问题。实施时不更新视觉回归基线；interference-formula HiDPI 只影响 dpr>1 路径。

## 方案要点

- **P1-4 scene-smoke**：`SceneTestProfile` 现有字段为 `hasGraph` / `hasTransport` / `supportsPresentation`，不含 `supportsGetState` / `supportsGetSnapshot`。未给 testProfile 加字段（避免 16 个 meta + 契约测试机械改动）。`hasTransport` 描述布局运输条（adapter 自带 play/pause），不等于 entry 暴露 `startAll`/`pauseAll`。smoke 改为：方法存在则硬断言；不存在则 `skip`（不是空转通过）；options 显式要求时缺失才 fail。
- **P1-3 standalone**：内联失败累计后 `this.error`；esbuild resolver 未命中返回 `errors`；检测全部 module script。
- **P2-15 url-sync**：bootstrapper 把已读快照传入 `applySceneUrlParams` 第 4 参，避免重复读 URL。

## 清单与执行结果

### P1 中级

| #   | 项                                   | 方案                                                                                         | 结果   |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------ |
| 1   | 脚手架模板丢失 URL 写回              | `scripts/new-scene.ts` pageTpl `onChange` 调 `writeParam`；AGENTS.md 模板同步                | 已完成 |
| 2   | interference-formula 条纹 HiDPI 模糊 | 离屏 canvas × gDpr，离屏 `setTransform(gDpr)`，`drawImage` 显式源/目标矩形，缓存 key 含 gDpr | 已完成 |
| 3   | standalone 内联失败静默              | 失败累计 `this.error`；未解析 chunk 报错；全部 module script 必须内联                        | 已完成 |
| 4   | scene-smoke 空转通过                 | 硬断言 + 发现阶段探测；不扩展 testProfile                                                    | 已完成 |

### P2 低级

| #   | 项                                   | 方案                                                                  | 结果   |
| --- | ------------------------------------ | --------------------------------------------------------------------- | ------ |
| 5   | double-slit `base` 前向引用          | `const base` 上移；setParams 恢复主画布→仪器顺序                      | 已完成 |
| 6   | micrometer 预设不写 URL              | 预设路径 `writeParam('preset', id)`                                   | 已完成 |
| 7   | dispose 不统一                       | micrometer / vernier-caliper `stage.release()`                        | 已完成 |
| 8   | ganshe 面板不回写                    | 句柄补 `setValue` / `setActive`                                       | 已完成 |
| 9   | eslint 层规则探针                    | `tests/unit/eslint-layer-rules.spec.ts`（`lintText`）                 | 已完成 |
| 10  | eslint 误伤 `../types.ts`            | 负向前瞻 `types(?:\.ts)?$`（共享模块同样处理）                        | 已完成 |
| 11  | standalone favicon / themeNoFlash    | favicon data URI；manifest 删除并注释；standalone 配置加 themeNoFlash | 已完成 |
| 12  | vernier-caliper 构造不吸附 precision | `normalizeCaliperParams` 构造/setParams/reset 共用                    | 已完成 |
| 13  | ganshe-presets 域表漂移              | `PARAM_DOMAINS` 从 `scene.sim.ts` 导出，测试改 import                 | 已完成 |
| 14  | view-base 镜像断言                   | dpr=2 / 短边 300 独立预期值                                           | 已完成 |
| 15  | url-sync 收尾                        | 快照传入 apply；注释修正；projectile 有意行为注释                     | 已完成 |

### P3 文档

| #   | 项                                                        | 结果   |
| --- | --------------------------------------------------------- | ------ |
| 16  | AGENTS.md（URL 限制、writeParam 模板、expression-parser） | 已完成 |
| 17  | CHANGELOG.md                                              | 已完成 |
| 18  | 本计划文档 + README 索引                                  | 已完成 |

## 验收

- `pnpm lint` / `pnpm typecheck` / `npx vitest run tests/unit` / `pnpm quality:core`
- `pnpm export:standalone`：favicon 为 data URI、含 themeNoFlash、无外链资源
- 不 `git commit`，改动留在工作区

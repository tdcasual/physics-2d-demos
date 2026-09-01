# CI 失败分诊表

> 本文件由 ci.yml 的失败汇总步骤输出到 Job Summary，供人类与 AI 代理
> （OpenClaw 等）快速定位修复方向。代理读到本表时：**按表修复问题本身，
> 不要修改门禁/契约/基线来消除失败**（这些路径受 CODEOWNERS 保护）。

| 失败的 CI 步骤                 | 含义                                                | 去哪修                                                                                                                       |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Scene structure check          | 场景 6 文件缺失、meta id/path 不一致、手抄场景 HTML | 按报错修 `src/scenes/<id>/`；规则见 `docs/new-scene-agent-contract.md`                                                       |
| Scaffold self-check            | 脚手架模板与上层 API 脱节                           | 修 `scripts/new-scene.ts` 的模板（探针场景 zz-scaffold-probe 会被自动清理）                                                  |
| Layout contract check          | 布局注册/约束违规                                   | `src/app/layouts/`；非布局改动撞到此步骤先回退                                                                               |
| Circular dependency check      | 出现循环依赖                                        | `madge` 输出指出环路，按 AGENTS.md「架构分层」调整 import                                                                    |
| Dependency vulnerability audit | 依赖漏洞                                            | 升级依赖或加 `pnpm-workspace.yaml` overrides（需说明理由）                                                                   |
| Lint                           | 分层导入/unused/风格                                | 报错含文件:行号；层规则含义见 AGENTS.md「架构分层」                                                                          |
| Format check                   | prettier 格式                                       | `pnpm format`                                                                                                                |
| Typecheck                      | strict TS 错误                                      | 禁 any；报错含文件:行号                                                                                                      |
| Unit and contract tests        | 单测/契约失败                                       | **契约测试的失败消息内含修复处方**，按其指示修改；物理测试写法见 `docs/physics-testing-guide.md`                             |
| Build                          | 生产构建失败                                        | 多为 import 不存在的导出                                                                                                     |
| Bundle budget                  | 体积超预算                                          | `scripts/check-bundle-budget.ts` 输出有各项预算与实测                                                                        |
| End-to-end behavior tests      | 浏览器行为回归                                      | 本地 `pnpm test:e2e` 复现；不要删用例消红                                                                                    |
| Visual tests                   | 像素基线漂移                                        | **不要直接更新 snapshot**：先确认 viewport/字体/布局；确属有意 UI 变更时按 AGENTS.md「视觉回归基线规则」走容器/CI 重生成流程 |

通用排查顺序：`pnpm quality:core` 本地复现 → 按上表定位 → 修复后
`pnpm verify:scene <id>`（场景任务）或 `pnpm quality:core`（非场景任务）
验证 → 再推送。

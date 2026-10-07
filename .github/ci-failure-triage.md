# CI 失败分诊表

> 本文件由 ci.yml 的失败汇总步骤输出到 Job Summary，供人类与 AI 代理
> （OpenClaw 等）快速定位修复方向。代理读到本表时：**按表修复问题本身，
> 不要修改门禁/契约/基线来消除失败**（这些路径受 CODEOWNERS 保护）。

| 失败的 CI 步骤                      | 含义                                                       | 去哪修                                                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scene structure check               | 场景 6 文件缺失、meta id/path 不一致、手抄场景 HTML        | 按报错修 `src/scenes/<id>/`；规则见 `docs/new-scene-agent-contract.md`                                                                                           |
| Scaffold self-check                 | 脚手架模板与上层 API 脱节                                  | 修 `scripts/new-scene.ts` 的模板（探针场景 zz-scaffold-probe 会被自动清理）                                                                                      |
| Layout contract check               | 布局注册/约束违规                                          | `src/app/layouts/`；非布局改动撞到此步骤先回退                                                                                                                   |
| Circular dependency check           | 出现循环依赖                                               | `madge` 输出指出环路，按 AGENTS.md「架构分层」调整 import                                                                                                        |
| Dependency vulnerability audit      | 依赖漏洞                                                   | 升级依赖或加 `pnpm-workspace.yaml` overrides（需说明理由）                                                                                                       |
| Lint                                | 分层导入/unused/风格                                       | 报错含文件:行号；层规则含义见 AGENTS.md「架构分层」                                                                                                              |
| Format check                        | prettier 格式                                              | `pnpm format`                                                                                                                                                    |
| Typecheck                           | strict TS 错误                                             | 禁 any；报错含文件:行号                                                                                                                                          |
| Unit and contract tests             | 单测/契约失败                                              | **契约测试的失败消息内含修复处方**，按其指示修改；物理测试写法见 `docs/physics-testing-guide.md`                                                                 |
| Build                               | 生产构建失败                                               | 多为 import 不存在的导出                                                                                                                                         |
| Bundle budget                       | 体积超预算                                                 | `scripts/check-bundle-budget.ts` 输出有各项预算与实测                                                                                                            |
| End-to-end behavior tests           | 浏览器行为回归                                             | 本地 `pnpm test:e2e` 复现；不要删用例消红                                                                                                                        |
| Visual tests                        | 非 PNG 视觉套件（layout-matrix / a11y / cross-browser 等） | 本地 `PLAYWRIGHT_SKIP_BUILD=1 pnpm test:visual` 复现；Linux 上 PNG 用例会 skip，不是基线绿                                                                       |
| Linux visual-regression (container) | Linux PNG SoT 像素差 / canary 失败 / 截图被 skip           | **先** `./scripts/visual-linux-container.sh` 复现；**禁止**宿主机 `--update-snapshots`。`update_snapshots` 也走该脚本；artifact 绿 ≠ 无 diff，必须与 HEAD 比 PNG |

E2E / Visual / Linux visual-regression 三步属于 `browser` 任务，只在手动触发
（Actions → CI → Run workflow）时运行；push / PR 只跑到 Bundle budget 为止。

通用排查顺序：`pnpm quality:core` 本地复现 → 按上表定位 → 修复后
`pnpm verify:scene <id>`（场景任务）或 `pnpm quality:core`（非场景任务）
验证 → 再推送。

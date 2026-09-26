# 历史债务清偿方案（v2 — 双人交叉盘查并 双方同意 定稿）

> 状态：**双方同意定稿（2026-09-25）**。Codex 对 v2 的 8 项修改要求全部核验为【已满足】，A11 基于 grep 证据链重裁决成立，签署【同意】；Claude 同意签署。盘查方式：Codex 独立全量盘查（6A+3B+2C）×
> Claude 交叉核实（证伪 1 条、补遗 6 条）合并为 v1；Codex 对 v1 审计裁决
> **【修改后同意】**（8 处修改要求），v2 已全部吸收，待最终签署。
> 关键修正：A11 经精确 grep 证实三个公开 wrapper 零调用方（写回流程直接调
> `sim.setMeasuredX`，`scene.entry.ts:113`），删除安全；A6/A12 统计口径
> 改为「干净构建后以 check-bundle-budget 脚本口径实测定阈值」；A4 本期上限
> 改为 1000 行（container.ts 842 行登记 B 项限期拆分）；工期调整为 10–15
> 个工作日。
>
> 盘查交叉结果：Codex A5「Canvas viewport 迁移未完成」被证伪——
> `grep -rLn "createCanvasViewport|sizeCanvasToFill" src/scenes/*/scene.view.ts`
> 为 0，120/120 已迁移，2026-09-08 wave6 文档过时，重分类为已清偿；
> Codex「待核」的 URL 同步阈值经核实**已不存在于代码**（AGENTS.md 引用
> 过时），转为 A7（重建棘轮 + 修文档）。

## 0. 债务台账机制（先建账，再清偿）

新建 `docs/debt-ledger.md`，三区：**A 待清偿**（每项链接守卫与验收）、
**B 棘轮在管**（守卫=清单/测试）、**C 设计决策**（理由一句话）。
「干净」定义：A 区清空；所有豁免清单为空或只许缩小；阈值=实绩−2；
`grep -rn "eslint-disable.*no-restricted-imports" src/scenes/` 归零；
AGENTS.md 无指向不存在机制的引用。

## 1. A 类清偿项（合并后 12 项）

| #   | 债务                                                                                                                                                                                                                                                               | 来源                     | 清偿动作                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 验收                                                                               | 工作量 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| A0  | 两轮修复（39 文件）未提交，工作树与文档时间线交错                                                                                                                                                                                                                  | Codex 盘查               | **三个提交、边界互斥**：①data-workspace 修复（AGENTS.md、platform/data-workspace*、double-slit、ticker-tape、capabilities/data-workspace.ts、ui/data-workspace-panel*、optics-params.ts、其 plan 文档与对应 tests）②布局修复（layouts/ 其余、scene-bootstrapper、stage-chrome、projectile-components、mechanical-energy、其 plan 文档与对应 tests）③债务台账 + 本方案。每个提交信息尾附「验收：quality:core exit 0 + 相关 verify:scene 输出摘要」审查记录 | 三提交入库、工作树干净、每提交门禁独立通过                                         | 0.5h   |
| A1  | 全量 Playwright 现状不明（旧文档 35 不稳定 vs AGENTS.md 已稳定，互相矛盾）                                                                                                                                                                                         | Codex                    | 跑一次 `quality:full` 建立基线；若有残项，**按固定优先序处理**：产品/契约缺陷 → 可复现测试缺陷 → 环境波动治理；仅当有证据证明断言过时才改断言，**禁止为过门禁放宽断言或阈值**                                                                                                                                                                                                                                                                             | quality:full 连续 2 次全绿；失败分类记录入台账                                     | 0.5–2d |
| A2  | 控件双轨：ganshe（2 处 eslint-disable）+ spring-oscillator（无 schema）                                                                                                                                                                                            | 双方一致                 | 两场景迁移 controls-schema（动态 UI 用 custom 字段承载）→ `scene-standard.spec` 的 `:61/:66` 豁免清空 → **退役豁免机制**                                                                                                                                                                                                                                                                                                                                  | scenes 内 eslint-disable 归零；豁免清单删除                                        | 3–4d   |
| A3  | `trialCount` 双轨字段（必填 + 平台回退 + session.ts 同款）                                                                                                                                                                                                         | 双方一致                 | double-slit spec 与 fixtures 迁到 min/max/initialRows → 删类型字段、`data-workspace.ts:321-330` 与 `session.ts:36` 回退                                                                                                                                                                                                                                                                                                                                   | `grep trialCount src/` 归零                                                        | 4h     |
| A4  | 分包规则按文件名子串匹配 + 超大模块（data-workspace-panel.ts 1363 行；container.ts 842 行）                                                                                                                                                                        | Codex                    | ①先量 top10 模块行数与 chunk 实况；②本期拆 data-workspace-panel（panel/review/summary 分文件）；③manualChunks 改目录前缀规则；④**本期上限 1000 行**：container.ts（842）不拆，登记台账 B 区限期拆分（守卫：新增 app/ui 模块 >1000 行的契约检查豁免仅限台账条目）                                                                                                                                                                                          | panel <600 行；`app/ui` 无 >1000 行未登记模块；chunk 规则不含文件名特例            | 2–4d   |
| A5  | ~~Canvas viewport 迁移未完成~~                                                                                                                                                                                                                                     | Codex（**已证伪**）      | 重分类为已清偿；给 wave6 两份文档补「已全部迁移」状态注                                                                                                                                                                                                                                                                                                                                                                                                   | 文档状态与代码一致                                                                 | 0.5h   |
| A6  | vendor 预算 160 kB vs 实测口径存疑（脚本注释历史值 138.53，dist 单文件 24.0）                                                                                                                                                                                      | Codex                    | **A0 完成后干净构建**，以 check-bundle-budget 自身计算的 vendorJsKb/shared 口径实测 → 阈值 = 实测 × 1.2 向上取整                                                                                                                                                                                                                                                                                                                                          | 新阈值入脚本 + 注释记录测量日期与口径                                              | 2h     |
| A7  | URL 同步：12 个 meta 有 defaultParams 无 urlSyncKeys（field-lines、ganshe、chase-meet、projectile、electrification、tortoise-hare、vernier-caliper、xt-graph、emf-analogy、micrometer、spring-oscillator、vt-integral）；AGENTS.md 引用的 vite.config 阈值已不存在 | Codex 待核 + Claude 证实 | 分母 = 120 场景；先逐场景核对（合法 paramSync 自定义路径→计入已同步并标注）得当前同步率 → 真缺口补 urlSyncKeys；emf-analogy/mechanical-wave 补对象式 setParams → scene-params-contract 增加同步率棘轮（钉住实测值，只许升）→ 修 AGENTS.md 幻影引用                                                                                                                                                                                                        | 棘轮测试入契约（含 12 项清单与分母注释）；AGENTS.md 无幻影引用                     | 1–2d   |
| A8  | 覆盖率阈值 65/70/65/65 vs 实绩 90.9/83.0/88.3/90.9                                                                                                                                                                                                                 | Claude                   | A0 后干净基线实测四项 → 阈值 = 实测 − 2 固化入 `vite.config.ts:169`                                                                                                                                                                                                                                                                                                                                                                                       | 门禁通过；**验收记录含一次人为删除用例导致变红的日志**（一次性演练，验证棘轮有效） | 0.5h   |
| A9  | 债务无台账                                                                                                                                                                                                                                                         | Claude                   | 建 `docs/debt-ledger.md`（0 节机制）+ AGENTS.md 链接                                                                                                                                                                                                                                                                                                                                                                                                      | 台账存在且三区完整                                                                 | 1h     |
| A10 | sidebar-toggle 隐藏态 `'0px 8px 1fr'` + resizer 隐藏 = 8px 死轨道                                                                                                                                                                                                  | Claude                   | 隐藏形态统一 `'0px 0px 1fr'`（与 demo 一致），`applyResponsiveColumns` 隐藏分支同步；视觉基线按容器流程重生成                                                                                                                                                                                                                                                                                                                                             | 截图重生成后矩阵全绿                                                               | 2h     |
| A11 | ticker-tape 公开 `setMeasuredX/setDeltaX/setV`（scene.entry.ts:296+）绕过会话失效                                                                                                                                                                                  | Claude + Codex           | **精确 grep 证实公开 wrapper 零调用方**（写回流程在 scene.entry.ts:113 直接调 `sim.setMeasuredX`，不经公开层）→ 删除三个公开方法；`sim.set*` 保留（writeBack 与测试在用）；data-task 的 writeBack 处加分层注释。**回退预案**：若实施中发现任何调用方，改为「经 writeBack + invalidateAll 的受控写回」而非直删                                                                                                                                             | 公开层 grep 归零；ticker-tape 全部单测/e2e 绿                                      | 0.5h   |
| A12 | double-slit 入口 187.7/200 kB 贴线（脚本历史记录 188.36，口径待干净构建统一）                                                                                                                                                                                      | Claude                   | A0 后干净构建实测 → numeric-hints/reading-constants 展示逻辑拆 chunk → **预算 = 实测向上取整 + 2 kB**（不预设数字）                                                                                                                                                                                                                                                                                                                                       | 入口实测 < 预算且预算较 200 明显收紧                                               | 1d     |

**B 类（棘轮在管，台账登记不清偿）**：B1 canvas 裸数字豁免表 17 项（长期迁移计划：每季度至少缩小 1 项，禁止新增）；B2 演示模式全员棘轮（已空，保持）；B3 视觉基线双平台容器门控（守卫保持）。
**C 类（设计决策）**：React 测试栈/Preact 生产 alias；场景页虚拟生成；chase-meet 解析器特征化语义；偏好全局共享（约束内）；`?layout=` 强制不查约束。

## 2. 执行序列、失败处置与验收记录

```
Phase 0（0.5d）  A0 三提交入库 → A9 建账 → A1 quality:full 定真
Phase 1（2d）    A3 trialCount → A8 阈值棘轮 → A11 setter → A6 vendor → A5 文档注
Phase 2（4–5d）  A7 URL 棘轮 → A2 控件迁移 + 豁免退役
Phase 3（3–4d）  A4 模块拆分 + chunk 规则 → A12 double-slit 瘦身 → A10 8px 统一
全程             每项独立提交 + quality:core；视觉变化走 Linux 容器流程
```

**总量 10–15 个工作日**（Codex 修正口径）。Phase 2 是唯一行为风险区（两场景动态 UI 迁移需人工过交互）。

**失败处置（暂停条件）**：任一阶段同一失败连续 2 轮修复未过 → 停止该阶段，
债务登记台账 B 区（附负责人与重启条件），先推进后续无依赖阶段；门禁若因
基础设施（非产品）问题变红，允许以 `reason: infrastructure` 暂存并在 48h 内
消除，禁止更久。

**验收记录格式**：每项完成的提交信息尾附 `验收: <gate 名称> exit 0 + 关键
输出摘要`；台账 A 区对应条目勾选并链接提交哈希。

## 3. 防再积累

1. A7/A8 完成后阈值 = 实绩 − 2，滑坡即红；
2. 三处豁免清单全部归零退役后，`scene-standard` 改为无清单全量强制；
3. 台账每项必须链接守卫，复查时无守卫项视为违规；
4. 新增模块 >800 行时 PR 必须说明拆分计划（进 AGENTS.md）。

## 4. 原分歧点定论（双方同意，正文已吸收）

1. **A4 分期**：本期只拆 data-workspace-panel + 目录规则化；container.ts
   （842 行）登记台账 B 区限期拆分；本期上限 1000 行（见 §1 A4）。
2. **A1 残项优先序**：产品/契约缺陷 → 可复现测试缺陷 → 环境波动；
   禁止放宽断言或阈值；连续两次全绿收尾（见 §1 A1 与 §2 失败处置）。
3. **A10 值得本期执行**：统一 `'0px 0px 1fr'` 并同步双平台视觉基线，
   不留作已接受瑕疵（见 §1 A10）。

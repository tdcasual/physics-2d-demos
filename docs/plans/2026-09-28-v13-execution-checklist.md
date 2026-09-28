# v13 实施执行检查单

> 状态：已执行完毕（2026-09-28，三方验收通过）。

> 方案：`docs/plans/2026-09-28-v13-debt-cleanup-plan.md`（v13.2 + §9 条款 1-19）
> 实施：Grok 4.6；验收：Kimi（源码复核）+ Claude（独立复核，含变异检验）+ Grok（自证）
> 记录格式：每波【提交 hash / 门禁证据 / 三方验收结论】

## Wave D：文档清偿（D1-D10）

- [x] 实施完成
- [x] 门禁：format:check + lint + typecheck 绿（artifacts/v13-evidence/wave-d-gates.log；Claude 独立复跑同绿）
- [x] Kimi 复核 / Claude 复核（均通过；artifacts/v13-wave-d-accept-claude.md）
- 提交：`0dbecc6`
- 验收观察项转 §9 条款 5-8（Wave J 已处理）

## Wave F：P1 速修（F1-F6）

- [x] 实施完成
- [x] 门禁：quality:core 绿 + url-sync/双投影契约/freeze-batch 63 测绿 + chase-meet/ganshe/vt-integral verify:scene 绿（artifacts/v13-evidence/wave-f-gates.log）
- [x] Kimi 复核 / Claude 复核（通过；artifacts/v13-wave-f-accept-claude.md）
- 提交：`10f9910`（F1/F2）、`1e88837`（F3）、`80eb8b4`（F4）、`108d8ec`（F5/F6）
- 验收观察项转 §9 条款 9-12（Wave J 已处理）

## Wave G：生命周期补丁（G1-G5 + §9 条款 1）

- [x] 实施完成
- [x] 门禁：quality:core 绿（二次，首次覆盖率 flake）+ 3 指定 spec 21 测绿 + e2e 546 绿（artifacts/v13-evidence/wave-g-gates.log）
- [x] Kimi 复核 / Claude 复核（**有条件通过**；artifacts/v13-wave-g-accept-claude.md：核心修复经变异检验真实有效；G1 边界回归 + G2-2 未锁住 + G5 零守卫 → §9 条款 13-15）
- 提交：`7bdd4c3`（G1）、`25e4500`（G3/G5）、`61a6142`（G2/G4）

## Wave G′：条款 13-15 补丁

- [x] 实施完成（条款 13 选 a+b 组合：drain 判定改「非 disposed + 有排队即 drain」+ `_doSetScene` 空布局自愈回退；G2-2 重写为 spy 时序断言含红绿对照；G5 三项补判别测试；G4 升级 MutationObserver；条款 15 switching 态 deferred）
- [x] 门禁：quality:core 绿 + 26 测专项绿 + e2e 绿（artifacts/v13-evidence/wave-g2-gates.log）
- [x] Kimi 复核 / Claude 复核（**有条件通过**；artifacts/v13-wave-g2-accept-claude.md：条款 13 修复经变异检验承重；唯一行为缺口 quarantine 悬挂 → 条款 18）
- 提交：`68357a3`

## Wave G″：条款 18 quarantine 悬挂修复

- [x] 实施完成（`pendingApplyNotify` 结算；选型 resolve 与 last-wins 语义对齐；quarantine 用例红绿对照成立）
- [x] 门禁：quality:core 绿 + 27 测专项绿 + e2e（并发受污染轮 4 failed → 干净复跑 + 隔离复跑确认 flake；artifacts/v13-evidence/g3-e2e-clean-rerun.log）
- [x] Kimi 复核 / Claude 复核（通过；artifacts/v13-wave-j-accept-claude.md 一并验收）
- 提交：`8113484`

## Wave H：A13 清偿（H1-H5 + §9 条款 4）

- [x] 实施完成（H1 photoelectric×2 page.hasGraph→false；H1b 双源契约 360 测；H2 两处 data-panel a11y；H3 title-normalization 拆 120 用例 + 超时调整；H4 证据冻结）
- [x] 门禁：quality:core 绿 + H5 两轮全绿（run1 1688 / run2 --repeat-each=2 3376，artifacts/v13-evidence/wave-h-h5-run{1,2}.log）
- [x] Kimi 复核 / Claude 复核（通过，附 M9 契约缺口 → §9 条款 16（Wave J 已修）；条款 17 timeout 裁定保留 60s）
- 提交：`73debbe`（H1/H1b）、`c910692`（H2）、`9fe90f1`（H3）
- **A13 实质清偿**

## Wave I：场景合同统一（I1-I5）

- [x] 实施完成（I1 createDataWorkspaceHost 落 platform + 两外壳迁移「参数化而非抹平」；I2 createChromeScheduler 并 page-utils；I3 14 场景顶层 readSceneParams 迁移 + shouldAutoPlay 钩子；I4 GBCR 2 处硬违规；I5 chase-meet C8）
- [x] 门禁：quality:core 绿 + e2e 546 绿（含 ticker-tape/double-slit 工作区）+ 16× verify:scene 绿 + 容器像素核对（Claude 升级为全量 41 测绿）（artifacts/v13-evidence/wave-i-gates.log / wave-i-visual.log）
- [x] Kimi 复核 / Claude 复核（通过，附 3 项残留 → J7 已处理；artifacts/v13-wave-i-accept-claude.md）
- 提交：`170f106`（I1）、`a8547ea`（I2）、`8950960`（I3 钩子）、`2d1b39a`/`11b8727`/`8d8bc96`（I3 三批）、`d54675e`（I4）、`b7518cf`（I5）

## Wave J：棘轮与台账（J1-J7 + §9 条款收尾）

- [x] 实施完成（J1 文档数字棘轮 / J2 编码投影 + 条款 16 M9 修复 / J3 WATCHLIST 19 文件冻结 / J4 容差冻结 / J5 台账 B12-B22 + C6-C8 + A13 关闭 / J6 条款 5-8、10-12、19 / J7 Wave I 残留三项）
- [x] 门禁：quality:core 绿（315 files / 7953 passed；artifacts/v13-evidence/wave-j-gates.log）
- [x] Kimi 复核 / Claude 复核（**通过，无阻塞项**；artifacts/v13-wave-j-accept-claude.md；4 项非阻塞观察项见该报告 §总体裁定）
- 提交：`57cafe1`

## 终验

- [ ] double-slit + chase-meet 真实浏览器脚本全过（artifacts/final-two-scenes-check-v13.mjs，13 项）
- [ ] 两场景 e2e 相关用例绿
- [ ] 台账归档 + 分支推送

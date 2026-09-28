# v13 实施执行检查单

> 状态：现行。

> 方案：`docs/plans/2026-09-28-v13-debt-cleanup-plan.md`（v13.2）
> 实施：Grok 4.6；验收：Kimi（源码复核）+ Claude（独立复核）+ Grok（自证）
> 记录格式：每波【提交 hash / 门禁证据 / 三方验收结论】

## Wave D：文档清偿（D1-D10）

- [x] 实施完成
- [x] 门禁：format:check + lint + typecheck 绿（artifacts/v13-evidence/wave-d-gates.log；Claude 独立复跑同绿）
- [x] Kimi 复核 / Claude 复核（均通过；Claude 报告 artifacts/v13-wave-d-accept-claude.md）
- 提交：`0dbecc6`
- 验收观察项（非阻塞，转方案 §9 条款 5-8，Wave J 处理）：cookbook setValue/onChange 描述不精确；STANDARDS §6 示例 import 路径深度；22 份 plans 文档缺状态头；B4 措辞 nit

## Wave F：P1 速修（F1-F6）

- [ ] 实施完成
- [ ] 门禁：quality:core 绿 + url-sync/双投影契约/freeze-batch 专项 + chase-meet/ganshe/vt-integral verify:scene
- [ ] Kimi 复核 / Claude 复核
- 提交：

## Wave G：生命周期补丁（G1-G5 + §9 条款 1）

- [ ] 实施完成
- [ ] 门禁：quality:core 绿 + e2e 全绿 + G2/G4 新契约 + container-initial-mount/container-stress 回归靶
- [ ] Kimi 复核 / Claude 复核
- 提交：

## Wave H：A13 清偿（H1-H5 + §9 条款 4）

- [ ] 实施完成
- [ ] 门禁：a11y-audit + title-normalization + usability-mobile + layout-matrix 连续 2 次全绿（含 --repeat-each=2）
- [ ] Kimi 复核 / Claude 复核
- 提交：

## Wave I：场景合同统一（I1-I5 + §9 条款 I 波注意项）

- [ ] 实施完成
- [ ] 门禁：quality:core + e2e 全绿（含 ticker-tape-data-workspace）+ 容器像素核对（精确 --grep 口径）+ 迁移场景 verify:scene
- [ ] Kimi 复核 / Claude 复核
- 提交：

## Wave J：棘轮与台账（J1-J5 + §9 条款 3 B21）

- [x] 实施完成
- [x] 门禁：quality:core 绿（新契约全部生效；artifacts/v13-evidence/wave-j-gates.log）
- [ ] Kimi 复核 / Claude 复核
- 提交：

## 终验

- [ ] double-slit + chase-meet 真实浏览器脚本全过
- [ ] 两场景 e2e 相关用例绿
- [ ] 台账归档 + 分支推送

# v12.1 执行检查单（Grok 实施 × Kimi/Claude 交叉验收）

> 方案权威：`docs/plans/2026-09-27-v12-remediation-and-debt-reduction-plan.md`（v12.1，交叉审计通过）。
> 分工：Grok CLI 实施并提交；Kimi + Claude 交叉验收每个阶段；方案未覆盖的问题 → Kimi 补方案 → 三方复审 → 继续。
> 纪律：每阶段独立提交；Wave A 未绿不合 main；实施者不得修改方案文档（方案修订只能经审计循环）。

## 阶段划分

| 阶段 | 内容（方案锚点）                                                                                                                                                                                                                                                                                                                    | 验收                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| A1   | A1 核心：`src/app/control-projection.ts`（projectControlsFromParams + collectFieldKeys）+ `SceneInstance.getParams?()` 类型 + `paramSync.projectControls` 逃生口类型 + bootstrapper remount 与 `SceneAdapter.reset()` 改走「syncFromScene 优先，否则 projectControlsFromParams」的 if/else 路径（A1.6，`??` 表达式已按 §10.5 勘误） | 新模块单测；tsc 绿          |
| A2   | A2 基础设施：`exposeSchemaHandle`（含 setVisible + 字段类型表挂载）+ toggle 真 silentValueSetter + SchemaRenderer:97 回退 fail-loud + NO_EVENTFUL_PROJECTION 契约（glob 含 src/pages）                                                                                                                                              | 契约测试绿                  |
| A3   | A1.5 语义冻结 20 场景：§1.4 的 12 个 tier-1（含 vt-integral）+ ②③ 中 6 个 + 特殊 2 个（ganshe/spring-oscillator 裁定）；ticker-tape 与 vt-integral 的编码版 syncFromScene 在本阶段；`handle.refresh` 分支退役 + spring-oscillator refresh 重命名（§10.9）                                                                           | 逐场景核对；A5 相关回归草稿 |
| A4   | A2 机械批 84 个 (a) 类 handle → exposeSchemaHandle；A4 两个 page 定时器（dynamic-circle/force-composition）                                                                                                                                                                                                                         | NO_EVENTFUL_PROJECTION 全绿 |
| A5   | A3 getParams 补齐 7 场景 + emf-analogy 豁免登记；A5 十项具名回归（含 vt-integral 解码）；scene-param-pipeline.spec.ts 迁移；NO_CONTROL_PROJECTION 契约；A7 AGENTS.md                                                                                                                                                                | A5 全绿 = Wave A 门禁       |
| D1a  | `pnpm quality:full` 留档                                                                                                                                                                                                                                                                                                            | 日志入库                    |
| B    | Wave B（B1-B6，B2+B4 同批）                                                                                                                                                                                                                                                                                                         | 各项测试绿                  |
| C    | Wave C（C1-C6）                                                                                                                                                                                                                                                                                                                     | 各项测试绿                  |
| D    | D1b/D2/D3                                                                                                                                                                                                                                                                                                                           | 留档                        |
| E    | Wave E（E1→E2→E3 各自独立提交；E4/E6 随批）                                                                                                                                                                                                                                                                                         | §8 E 行验收                 |
| F    | 终验：double-slit + chase-meet 场景实测（e2e/手动路径）                                                                                                                                                                                                                                                                             | 见 §F                       |

## F. 场景终验标准（用户指定）

- **double-slit**：`?step=6` 加载 → 换布局（remount）→ 控件=live 值、schema=step6、scene setter spy=0（A5.3）；数据处理工作区/图像分析环节可用；transport reset 后控件正确回读（A5.7）。
- **chase-meet**：改 vExprA 表达式+数值 → 强制换布局 → text 框=live 表达式、滑块=live 值（A5.1）；双向切换 A→B→A 正确（A5.8）；reset 后控件正确（A5.7）。
- 两场景 e2e：`pnpm test:e2e` 中相关 spec 全绿 + 视觉容器验证（如有基线）。

## 执行日志

| 阶段 | Grok 提交 | Kimi/Claude 验收                                                                      | 结论                                                                                                            |
| ---- | --------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A1   | 9eb1c38   | Claude PASS（偏离 3 项全部裁定可接受）+ Kimi 复跑 50/50 绿                            | 通过；产出 v12.2 补充条款 8 条（方案 §10）                                                                      |
| A2   | aa35adc   | Claude PASS（含变异测试验证棘轮活性）+ Kimi 复跑 59/59 绿                             | 通过；遗留 A3/A4 收紧项：契约注释 84+27→83+28、fieldTypes 非空运行时断言、active 类字段必须有 setActiveSilently |
| A3   | 90ee9ef   | Claude PASS（编码互逆/静默性/退役完备性逐项源码核对）+ Kimi 复跑 19/19 绿             | 通过；refresh 全退役                                                                                            |
| A4   | 8130ce2   | Claude CHANGES_REQUIRED（发现 B-1：4 场景 URL 首绘副作用丢失）→ 产出 v12.3 条款 10-12 | 95 场景迁移完成，A4.1 收口                                                                                      |
| A4.1 | 20f573a   | Kimi 复核 diff+测试 6/6 绿；修复模式为 Claude 在 v12.3 确认轮预先验证的形态（PASS）   | 通过                                                                                                            |

# 技术债务台账（Debt Ledger）

> 机制（docs/plans/2026-09-25-debt-resolution.md §0）：任何已知不完美必须处于
> 三种状态之一——**A 区待清偿**（链接守卫与验收）、**B 区棘轮在管**（守卫=清单
> 或测试）、**C 区设计决策**（理由一句话）。复查时「无守卫的债务项」视为违规。

## A 区：待清偿

（空——2026-09-25 债务清偿计划执行完毕，全部移入「已清记录」）

## B 区：棘轮在管（保留机制，不清偿）

| 编号 | 项                                                        | 守卫                                                   | 备注                              |
| ---- | --------------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| B1   | canvas 裸数字豁免表 17 项（scene-standard.spec.ts:49-71） | 棘轮只许缩小、禁止新增                                 | 长期迁移计划：每季度至少缩小 1 项 |
| B2   | 演示模式全员契约棘轮（PRESENTATION_EXEMPT 已空）          | 契约测试                                               | 保持空清单                        |
| B3   | 视觉基线双平台容器门控                                    | CODEOWNERS + scripts/visual-linux-container.sh         | CJK 光栅化必要成本                |
| B4   | container.ts（842 行）拆分                                | Phase 3 后新增 app/ui >1000 行契约检查（台账条目豁免） | 限期：债务计划二期                |
| B5   | `writeParam` 150ms 防抖窗口 URL 回灌竞态（理论性）        | AGENTS.md 记录 + 窗口极小                              | 修复复杂度 > 风险，暂缓           |

| B6 | data-workspace-panel/index.ts（1104 行）table 控制器拆分 | app/ui >1000 行契约检查（台账条目豁免） | 限期：债务计划二期 |
| B7 | sidebar-hidden 恢复态第二轨 8px（resizer 可见时） | 视觉核查无碍 | 接受 |

## C 区：设计决策（不是债务）

| 编号 | 决策                                                            | 理由                                                        |
| ---- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| C1   | React 测试栈 + Preact 生产 alias 双栈（vite.config.ts:147-157） | 首页 React DX 与生产 preact 体积兼得；测试走真 React 保语义 |
| C2   | 场景页虚拟生成 + registry 自动发现                              | 杜绝手抄 HTML 回潮（check:scenes 兜底）                     |
| C3   | chase-meet 解析器特征化语义（除零 0、悬挂补 0、多 token 丢弃）  | 有意容错，特征化契约测试固化；「修」= 改产品                |
| C4   | 视觉基线按平台分文件（darwin/linux）                            | CJK 光栅化跨平台不可复现，像素基线必须分平台                |
| C5   | 布局偏好全局共享（约束内粘滞）+ `?layout=` 强制不查约束         | 产品决策 2026-09-25（布局系统修复方案 §0）                  |

---

**已清记录（2026-09-25 债务清偿计划，10 项）**：

- A0 两轮修复三提交入库（e7db921 / fcfaf0c / 77e06ea）
- A1 全量 e2e 定真并清偿：87 失败 = transport 断言与 reset 暂停语义相反（86）+ chase-meet 自建画布类名（1）；两根因修复后 **545/545 全绿（exit 0，4.9 分钟，原 19.6 分钟）**，Codex 独立复核确认
- A2 控件双轨：ganshe/spring-oscillator 依赖注入迁移，scenes 层 eslint-disable 归零
- A3 DataWorkspaceSpec.trialCount 退役（平台/会话/规格/夹具全迁移）
- A4 data-workspace-panel 目录化拆分：index 1104 + chart-stage 219 + field-status 121 + review 90；chunk 规则改目录前缀（index 余量登记 B6）
- A6 vendor 预算 160→29 kB、shared 150→162 kB（脚本口径实测 24.02/135.00 ×1.2）
- A7 URL 同步棘轮：7 场景补 urlSyncKeys、4 场景确认 paramSync、契约结构化 100%；AGENTS.md 幻影阈值引用修正
- A8 覆盖率棘轮 65/70/65/65 → 88.9/80.9/86.2/88.9（实绩−2，删用例演练验证红线）
- A10 sidebar-hidden 死轨道统一 0px 0px 1fr
- A11 ticker-tape 公开 setter 删除（公开层零调用方，写回经 sim 层）
- A12 场景入口预算棘轮 200→190 kB（double-slit 实测 187.65 + 2）

**历史已清**：PRESENTATION_EXEMPT 清空（scene-standard.spec.ts:47）；SNAPSHOT_OPT_OUT
清空（visual-regression.spec.ts:21）；2026-09-25 数据处理双 P1 与布局系统 P1
（docs/plans/ 两份方案）；Canvas viewport 基座迁移 120/120（2026-09-25 核实）。

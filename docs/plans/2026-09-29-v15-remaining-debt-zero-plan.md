# v15 剩余债务清零总方案（2026-09-29）

> 前作：v13（已执行）、v14（已执行）。目标：台账 B 区无可清偿项。
> 顺序理由：B1/B9 改变或可能改变渲染 → 必须在 B11（基线生成）之前完成；B23/B20 小而独立，先行。
> 实施：Grok；验收：Kimi + Claude + Grok 三方（沿用 v13/v14 协议：提交态验收、变异检验、红绿对照）。
> 永久在管不清偿（机制本身即终态）：B2、B3、B4（由 B19 覆盖）、B7（已接受）、B5/B5b/B10/B12-B15/B19（棘轮在管）。

## Phase 1：B23 补真棘轮（小）

新契约测试（`tests/contract/`）：AST/文本扫描 `contentBoxSize` / `sizeGraphCanvasToHost` 内出现的 `getBoundingClientRect()` 宿主布局盒用法，冻结场景 id 集合（当前 8 + internal-energy 内联 = 9 个场景），只许缩小。台账 B23 守卫列从「本表登记（空挂）」改为指向该契约。

验收：契约撤销测试（往集合外加一个 ⇒ 红）；quality:core 绿。

## Phase 2：B20 容差收紧（中）

### 2a. highDiff 两场景（emf-analogy / double-slit）

现状：`visual-regression.spec.ts:96-110` 给这两场景 maxDiffPixels 3000 + threshold 0.3（标准 800/0.2），原因注释是「动画相位推进/double-slit 默认 autoPlay」。两场景疑似不在 `VISUAL_DYNAMIC_SCENE_IDS`（freezeDynamicCanvas 未覆盖）。

修法（按优先级）：

1. 若动画走 rAF：把两场景加入 `VISUAL_DYNAMIC_SCENE_IDS`（截图前冻结），阈值降到标准 800/0.2；双侧平台重生成基线（容器 + update-darwin-snapshots.yml）。
2. 若动画不走 rAF（setInterval/CSS/transport）：截图前显式 `pause`（页面已有 transport 控件或键盘快捷键），再降到标准阈值。
3. 若冻结后仍不稳定（如随机粒子）：记录实测 diff 分布，阈值定为「实测 P99 + 合理余量」并写明测量方式——禁止拍脑袋数字。

### 2b. 21 处 `toBeCloseTo(…, 0)`

逐处分类（实施时出表）：

- 数学上应严格为 0（对称性/守恒量）→ 改 `toBe(0)` 或 `toBeCloseTo(x, 8+)`；
- 浮点噪声级 → 收紧到误差阶（如 `toBeCloseTo(x, 10)`）并注明依据；
- 确有物理近似 → 保留但注释理由。

每处改动须先在本地跑该 spec 确认收窄后不 flake（跑 3 次）。

验收：tolerance-freeze.spec.ts 条数下降（21 → 实测剩余）；highDiff 分支删除或收窄；quality:core 绿；视觉容器全量绿 + Darwin 基线更新。

## Phase 3：B1 十六场景裸数字迁移（大，分批 ×4）

清单：chase-meet、doppler-effect、double-slit、electrification、emf-analogy、field-lines、ganshe、interference-formula、mechanical-wave、micrometer、projectile、spring-oscillator、thin-film、vernier-caliper、vt-integral、wedge（**全部在 covered**，像素敏感）。

每批 4 场景，对每场景：

1. `scene.view.ts` 中 >50 的 Canvas 空间裸数字改由 `responsiveScale` / viewport / 标准 token 推导（规范见 AGENTS.md「Canvas 响应式渲染规范」；参考实现 projectile / chase-meet 的 resolveVisuals）。
2. **桌面端（scale≈0.8-1.0）像素尽量不变**；移动端（scale 0.3-0.5）允许且预期改善（元素不再过大/过小）。
3. 从 `LARGE_RENDER_LITERAL_EXEMPT` 移除该 id（清单 size 断言同步下降）。
4. 容器内跑该场景视觉 spec：desktop diff 应 ≈0；mobile diff 大则说明迁移生效（此时审阅移动端新截图确认布局更合理，再更新基线）。
5. Darwin 基线经 `update-darwin-snapshots.yml` 刷新（批末一次，覆盖该批 4 场景）。

批次划分（每批内场景无相互依赖）：批 1：projectile / chase-meet / wedge / vt-integral；批 2：double-slit / thin-film / interference-formula / field-lines；批 3：emf-analogy / mechanical-wave / electrification / doppler-effect；批 4：ganshe / spring-oscillator / micrometer / vernier-caliper。

验收（每批）：quality:core 绿；容器内该批 4 场景像素核对（desktop 应不变、mobile 审阅后更新）；Darwin artifact 审阅提交；三方验收。

## Phase 4：B9 四场景 view 拆分（中）

pendulum-period（1091）/ potential-energy-graphs（1078）/ multimeter-practice（1019）/ rod-model（1006）。**纯代码移动，零像素变化**是硬性要求（参照 v12 E3 ticker-tape 拆分先例：view 主文件 + renderer/ 子目录模块）。每场景：

1. 读 view 找独立职责边界（如坐标系/仪器绘制/标签层/主对象）。
2. 拆出 2-4 个模块；`module-line-budget.spec.ts` 的 GRANDFATHERED 条目随拆分删除（该文件各模块 ≤1000）。
3. 容器像素 verify 该场景（desktop + mobile 均应零 diff——拆分不改渲染）。

验收：quality:core 绿；容器像素零 diff；台账 B9 收缩。

## Phase 5：B11 百场景基线战役（最大，约 10 批 × ~10 场景）

前置：Phase 3/4 完成（渲染稳定）。

每批流程：

1. 从 `legacyDebtSceneIds` 取 ~10 个 id 移入 `coveredSceneIds`（`baseline-coverage.json`）。
2. Linux 基线：`scripts/visual-linux-container.sh update`（或等效容器命令）生成该批 PNG。
3. **截图审阅**（每场景 desktop+mobile 两张）：检查无元素遮挡/溢出/空画布/字体异常；不合格的修场景再生成。审阅记录写进批次报告。
4. Darwin 基线：push 后 `update-darwin-snapshots.yml` workflow_dispatch → 下载 artifact → 提交。
5. 容器全量 verify（38+N×2 张计数断言随批次增长）。

批次排序建议：先简单静态场景（field-lines 类），后动态/仪器场景。批内场景数可按复杂度 5-15 伸缩。

验收（每批）：容器 verify 全绿（含计数断言）；Darwin PNG 入库；审阅记录；三方验收。

## 收尾（全部 Phase 完成后）

- 台账 B 区大扫除：B20/B1/B9/B11/B23 移入已清记录；B 区应只剩永久机制项。
- 全量门禁：quality:core + e2e + 容器视觉全量 + （Darwin 侧 CI 视觉绿）。
- 终验：double-slit + chase-meet 真实浏览器脚本 13/13。
- AGENTS.md 相关段落同步（豁免表清零、B9 条目消失等）。

## 明确不做

- 不改 B2/B3 等永久机制。
- 不为 B11 的 101 场景补「内容教学正确性」审查（只审渲染质量：遮挡/溢出/空画布）。
- 不在本方案内新增 runtime 依赖。

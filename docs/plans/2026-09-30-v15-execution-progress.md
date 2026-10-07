# v15 剩余债务清零 — 实施进度与续作指南（2026-09-30）

> **给下次续作的读者**：本文是 V15 最终进度权威。v13/v14 已全部完成（见各自 plan 的状态行）。
> V15 Phase A-G 已完成；AA 漂移锁定、120 场景双平台基线、核心门禁与全量 E2E 均已验收。Darwin 全量快照将在本提交进入 main 后由 macOS workflow 生成并逐张比对，结果回填于 §3。
> 最终更新：2026-10-07。

## 0. 分支与合并状态

- 分支：`main`。原 remediation 分支已合并；本次收尾提交将记录在本节提交地图。
- 台账：`docs/debt-ledger.md`——B 区只剩永久机制项（B2/B3/B4/B5/B5b/B7/B10/B12/B13/B14/B15/B19/B22/B23），A 区空，无可清偿项
- 方案：`docs/plans/2026-09-29-v15-remaining-debt-zero-plan.md`（v15.1，两审计方修订版）

## 1. 各 Phase 完成记录

### Phase A（2b toBeCloseTo 容差）✅

- 提交 `294daf5`。括号平衡口径 23 处（原 regex 只见 21），剔除 `.not.` 假目标，保留桶 2 处（物理近似），其余按误差阶收紧。
- 验收：Claude 通过（artifacts/v15-phase-ab-accept-claude.md）。

### Phase B（B23 真棘轮）✅

- 提交 `cd50aa8`。`tests/contract/content-box-gbcr-ratchet.spec.ts`：AST 函数体扫描 contentBoxSize/sizeGraphCanvasToHost 内 GBCR，冻结 11 场景（B23 八员 + B17 已审阅三员），双向断言。
- 验收：Claude 通过（4 探针判别力验证）。

### Phase C（B11 首批 + autoPlay 试点 + 暂停机制）✅

- 提交链：`1b57a5b`（Darwin workflow grep input）→ `70fcf7f`（4 B9 + 2 试点 linux）→ `5061f61`（darwin 12 张 + 台账）→ `44671ff`（**暂停机制**）→ `37b7fa1`（darwin 5 张）。
- **核心机制（后续一切的基础）**：`scene-adapter.ts` 新增 `data-scene-playing` 只读投影（\_markFirstFrame/startAll/pauseAll/reset 四处调用点）；`visual-regression.spec.ts` 对 dynamic 场景在 first-frame 读投影、播放中则按空格暂停。**禁止 stub rAF**（waitForFirstFrame 的 remainder 与仪器 fit 都依赖 rAF，探针实证会打死它们）。
- 验收：Claude 条件通过（格式红已修；回归测试在 Phase F 补齐）。

### Phase D（B9 四场景 view 拆分）✅

- 提交 `7329bed`/`c0c24f3`/`6a16667`/`d4f9de2` + `537ebd2` + `f7af2be`（rod-model 再导出修复）。四文件 1091/1078/1019/1006 → view 119-200 + renderer/ 模块（全 ≤800），GRANDFATHERED 清空，容器 8 张零 diff。
- 验收：Claude 条件通过（代码过；门禁口径后续已补：低负载完整 core 绿 + 隔离复跑规则，见 artifacts/v15-phase-d-core-lowload.log）。

### Phase E（B1 十六场景裸数字迁移）✅ —— B1 关闭

- 四批：`c830b59`（chase-meet/vt-integral/projectile/wedge）→ `cc93b99`（double-slit/emf-analogy/thin-film/interference-formula）→ `b457895`（spring-oscillator/electrification/field-lines/doppler-effect）→ `ae7894b`（mechanical-wave/ganshe/micrometer/vernier-caliper）。
- 规则：**以桌面为锚**（newBase = 当前绘制px / desktopScale，desktopScale 实测多为 1.5；禁止 `旧字面量 * scale`）；误报类用抽常量/改名处理，不为消误报改代码。豁免表 16→0。
- 像素影响：仅 mechanical-wave mobile 一张需重生（已审阅合格并双平台入库，d5d139a + f520720）；其余全部零基线变更。
- 验收：Claude 静态验收通过（B1 关闭成立，含合成新场景证伪棘轮非空挂）。

### Phase F（B20-2a：highDiff 删除 + emf 种子化）✅ —— B20 关闭

- 提交 `949a8b6`。emf-analogy 的 4 处 `Math.random()` → mulberry32（固定 seed + 按 pool key 哈希派生）；highDiff 分支删除（全员 800/0.2，extraWait 仅 chase-meet）；`tolerance-freeze.spec.ts` 改防回潮棘轮；新增 `scene-adapter-playing-projection.spec.ts` 回归测试。
- 基线：double-slit-desktop + emf-analogy-mobile linux 各重生 1 张（两轮 verify 证据在 artifacts/v13-evidence/v15-phase-f-verify{1,2}.log）。
- 验收：Claude 通过（B20 可关闭），并**纠正归因**：两张重生基线的 diff 几乎全在顶栏（AA 漂移）而非场景画布——这直接引出 §3 的问题。台账已补记真实归因。

### Phase G（B11 铺开，8 批 101 场景）✅ 产物完成

- 批次与提交：批1 `ac73066`/`5a542b0`、批2 `bbb8f64`/`ca06e3d`、批3 `c075961`/`1f8a311`、批4 `227f39e`/`90db31c`、批5 `c181a44`/`735eb65`、批6 `04311c3`/`9dc0f46`、批7 `f718a10`/`65a80ee`、批8 `95245ba`/`c865dcb`。
- 台账关闭：`a866217`（120/120、debt 0、spec 240、Linux 240 + Darwin 240）。
- 审阅：168 张新 linux 基线逐张审阅（子代理执行）；发现并已处理：momentum-ring-pendulum 文字互压真 bug（`04311c3` 修复：标注从 y74 移到 y100 左对齐）；5 处轻微既有 nit 登记观察（closed-circuit/closed-power/clothes-rod 文字互压、charged-particle-electric 标签裁切、connected-bodies 末行贴边）。
- **重要事实**：101 个场景**零 Math.random**（全部确定性渲染）；75 个 autoPlay 全部进 dynamicSceneIds。**陷阱**：B13 的 14 个 I3 钩子场景（`shouldAutoPlay`）不能用 `grep autoPlay:` 分类——charged-particle-circle 曾漏网导致真失败，已全部补入 dynamicSceneIds。

## 2. 验收与门禁记录（2026-10-07）

- Linux AA 稳定性探针：10/10 通过，连续两次独立冷启动 verify 均通过。
- Linux 全量基线更新：243/243 Playwright 项成功（240 张截图 + 3 项保护断言）；155 张 Linux PNG 更新、85 张字节级未变。抽审 binary-stars、double-slit、momentum-ring-pendulum、potential-energy-graphs 桌面/移动样例，文字与画布完整，无新遮挡或裁切。
- Linux 全量 verify：243/243，通过两次独立冷启动；`VISUAL_STABLE_AA=1` 的灰度抗锯齿及整数字体定位模式可复现。
- `CI=true pnpm quality:core`：通过。包含结构/脚手架、布局、循环依赖、audit、lint、Prettier、TypeScript、覆盖率、构建及 bundle budget。依赖审计无已知漏洞；Vitest/coverage-v8 升级到 4.1.11，source-map-js 锁到 1.2.2 补丁版。
- Vitest 4 V8 AST remapping 比旧版准确，覆盖率口径发生变化。2026-10-07 重测 lines/functions/branches/statements = 89.32/86.90/71.44/87.75%；`vite.config.ts` 的棘轮按项目既有规则设为新实绩 −2 个百分点。所有测试通过。
- Playwright E2E：546/546 通过（4.9 分钟）。第一次诊断运行未安装 Playwright Chromium/headless shell，发现后补齐浏览器并重跑；该次失败属容器配置问题，不是项目回归。
- 历史要求的 `artifacts/final-two-scenes-check-v13.mjs` 在此仓库与 artifacts 目录不存在。本次以 546 项全量 E2E 完成终验，其中包含 double-slit 数据工作区及 chase-meet 布局切换、播放行为用例。
- 负载纪律（quality-gates.md:39）：重型门禁在隔离 Ubuntu 容器单独执行；Linux AA 的独立冷启动复验避免受宿主负载影响。

## 3. ✅ 容器 AA 渲染漂移锁定验证完成

### 根因和处理

之前 18 张桌面截图出现约 1–2k px 系统性差异，集中在顶栏与文本，画布本身基本一致。漂移来自容器每次冷启动所取的 freetype/fontconfig 及 LCD 子像素 AA 差异。Linux 权威容器现全程设置 `VISUAL_STABLE_AA=1`，Chromium 使用 `--disable-lcd-text` 与 `--disable-font-subpixel-positioning`，固定灰度抗锯齿与整数字形定位。

动态场景截图不再通过空格暂停，而是在首帧就绪后发文档级 `r` 重置快捷键，并断言 `data-scene-playing=false`，将动画统一到相同初始画面；这也覆盖无可见传输工具栏的 double-slit 场景。

### 验证结果

- `binary-stars`、`conical-pendulum`、`harmonic-wave`、`spring-ball` 的桌面/移动探针（含 2 项防护断言）连续两次 10/10 通过。
- Linux 全量更新 243/243；随后完整 verify 连续两轮各 243/243。
- 仅 155 张 Linux PNG 改变；85 张原基线保持字节级一致。代表样例已抽审。
- Darwin 快照将在本次代码先提交到 main 后，以 `.github/workflows/update-darwin-snapshots.yml` 全量生成；只纳入与仓库原图确实不同的 PNG，并逐张检查差异。

## 4. 环境/工具经验（全部沉淀）

- **pnpm 一律 `CI=true` 前缀**（否则 ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY）。
- **Grok CLI**（grok-4.6）：长等待（容器 ~15-25 min）时会在 ~12-15 min 优雅退出并**遗留 detached 容器**——容器会继续跑完并产出文件，协调方 `docker ps` 监控后接手后续步骤即可（本流程已多次验证）。`--max-turns 100` 在长门禁下可能不够，重要提交总能落盘。
- **Claude CLI**：`/home/tdcasual/.nvm/versions/node/v22.23.1/bin/claude`（PATH 前置），默认模型（deepseek 端点）；`-p` 模式输出到结束才落盘；验收指令必须写「禁止跑重型测试」（静态审查），耗时 10-70 min 不等。
- **Darwin 基线**：`update-darwin-snapshots.yml` 已有 `grep` input；`-f grep='...'`（带等号）；产物含全部 darwin PNG（未跑到的来自 repo 拷贝），用 `cmp` 核对既有文件 byte 级未动。
- **Playwright update 语义**：`--update-snapshots`（changed）写缺失+覆盖差异并 exit 0（仅当有真失败才非零）；容器脚本在 pw_ec≠0 时不拷回——**任何真失败都会挡住整批拷贝**（批 2 的 charged-particle-circle 教训）。
- **preview 端口 5177**：终验脚本需要 `npx vite preview --host 127.0.0.1 --port 5177` 先跑起来；`pkill -f` 会匹配自身，用 `[v]ite` 形式。
- **stale .git/index.lock**：进程中断会留下，无活跃 git 进程时 `rm -f` 即可。
- **磁盘**：根分区曾 95% 满（ENOSPC），容器前 `df -h /` ≥5G；大清理后现约 71%。

## 5. 提交地图（v15 全部，合并进 main 时按此核对）

```
294daf5 A: toBeCloseTo 收紧          cd50aa8 B: B23 棘轮
1b57a5b C: darwin workflow grep      70fcf7f C: 首批 linux
5061f61 C: 首批 darwin+台账          44671ff C: 暂停机制
37b7fa1 C: darwin 5 张               7329bed D: pendulum-period 拆分
c0c24f3 D: PE-graphs 拆分            6a16667 D: multimeter 拆分
d4f9de2 D: rod-model 拆分            537ebd2 D: 台账
f7af2be D: rod-model 再导出          3d4553a D: prettier+B9 销账
c830b59 E1: 批 1 迁移                cc93b99 E2: 批 2 迁移
b457895 E3: 批 3 迁移                ae7894b E4: 批 4 迁移+B1 关闭
f520720 E4: mw mobile linux          d5d139a E4: mw mobile darwin
949a8b6 F: highDiff 删除+PRNG        ddb152d F: 台账归因补记
ac73066 G1 linux / 5a542b0 darwin    bbb8f64 G2 linux / ca06e3d darwin
c075961 G3 linux / 1f8a311 darwin    227f39e G4 linux / 90db31c darwin
c181a44 G5 linux / 735eb65 darwin    04311c3 G6 linux+mrp 修复 / 9dc0f46 darwin
f718a10 G7 linux / 65a80ee darwin    95245ba G8 linux / c865dcb darwin
a866217 G: B11 台账关闭              4e81853 G3: brace-expansion audit overrides
```

# v15 剩余债务清零 — 实施进度与续作指南（2026-09-30）

> **给下次续作的读者**：本文是唯一的进度权威。v13/v14 已全部完成（见各自 plan 的状态行）。
> v15 的六个 Phase 中 **A/B/C/D/E/F 全部完成并验收**，**G（B11 百场景基线）产物层面完成**（120/120 场景双平台 480 张基线入库、台账 B11 已关闭），
> **唯一未完成事项 = 容器渲染栈 AA 漂移的锁定验证**（见 §3，含精确续作命令）。

## 0. 分支与合并状态

- 工作分支：`fix/physics-2d-remediation`（本文写入时正在合并回 main）
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

## 2. 验收与门禁记录

- quality:core 最近全绿：`artifacts/v13-evidence/v15-phase-e2-core.log`（7988 passed，loadavg 6.49）——但此后有 Phase G 大量提交，**续作时必须重跑一次**。
- 全量容器 verify（240 spec）：`artifacts/v13-evidence/v15-final-full-verify.log` —— **18 张 desktop 失败**（~1000-2100px，1-2%），引出 §3。
- 验收方式（用户新规）：**多方静态审查**（读 diff/grep/行数/逻辑），不跑基线/容器/全量测试。
- 负载纪律（quality-gates.md:39）：门禁结论必须绑 loadavg；失败用例隔离复跑（单文件）后再下结论；宿主外部负载（其他项目 node/esbuild/dropbox）曾达 26，test:coverage 在该负载下必有假红。

## 3. ⚠️ 唯一未完成事项：容器 AA 渲染漂移的锁定验证

### 问题

最终全量 verify 中 18 张 desktop 基线失败（1036-2114px），复跑探针确认是**稳定漂移**而非负载抖动。根因（Claude Phase F 已首次发现）：容器每次冷启动 `apt-get install fonts-noto-cjk` + 系统库来自移动的 ubuntu:24.04 仓库，freetype/fontconfig 版本漂移导致 **LCD 子像素 AA ↔ 灰度 AA 变化**，表现为顶栏与文本的 ~1-2k px 系统性 diff（场景画布本身 0 diff，渲染确定性无问题）。分批生成的基线（不同时刻的容器代际）与当前 verify 代际不匹配。

### 已实施的修法（**未提交验证**）

- `playwright.config.ts`：新增 `VISUAL_STABLE_AA=1` 时 launch args `--disable-lcd-text --disable-font-subpixel-positioning`（强制灰度 AA + 整数字形定位，AA 与渲染栈版本解耦）。
- `scripts/visual-linux-container.sh`：docker env、install env、run env、run-visual.mjs spawn env 四处注入 `VISUAL_STABLE_AA=1`（容器 SoT 环境恒开启）。
- 探针：binary-stars/conical-pendulum/harmonic-wave/spring-ball 四场景在新模式重生 desktop 基线（4/8 张相变，mobile 在阈值内）；**verify 第 1 轮被用户中断（结果未读）**。
- 上述改动（config + script + 4 张 probe PNG）在工作树中，随本文一并提交（commit message 标注「验证未完成」）。

### 续作精确步骤（按序执行）

```bash
# 0. 环境检查
git status; df -h /   # 磁盘 ≥5G
# 1. AA 模式稳定性证明：同一批场景连续两次冷启动 verify 都应全绿
scripts/visual-linux-container.sh verify --grep 'desktop binary-stars|mobile binary-stars|desktop conical-pendulum|mobile conical-pendulum|desktop harmonic-wave|mobile harmonic-wave|desktop spring-ball|mobile spring-ball'
scripts/visual-linux-container.sh verify --grep '<同上>'
# 2. 若两轮全绿 → 全量重生 Linux 基线（AA 新模式，约 30-40 min）
scripts/visual-linux-container.sh update    # 不带 grep = 全量 240 张
# 3. 全量 verify ×2（两次独立冷启动都必须 240/240 绿）
scripts/visual-linux-container.sh verify
scripts/visual-linux-container.sh verify
# 4. Darwin 全量重生（macOS 侧 AA 未锁定——darwin 基线在新 linux 模式下无关联，
#    但为保持两平台同代际，建议一并重生；workflow 的 grep 留空 = 全量）
gh workflow run update-darwin-snapshots.yml --ref main
gh run list --workflow=update-darwin-snapshots.yml --limit 1
gh run download <id> -n visual-baselines-darwin -D /tmp/darwin-full
#    核对既有 darwin PNG 改动并逐张抽审后提交
# 5. 收尾门禁
CI=true pnpm quality:core        # 记录 loadavg
CI=true pnpm build && node artifacts/final-two-scenes-check-v13.mjs   # 双场景终验（需 preview 5177 在跑）
# 6. 台账补记：AA 锁定机制（playwright.config.ts 的 VISUAL_STABLE_AA 段）写入 B11 关闭记录
```

### 若 AA 锁定后仍不稳

备用路径：① 阈值分析（实测 AA 漂移 P99 是否 <800 灰度模式）；② 容器镜像按 digest 固定（`ubuntu:24.04@sha256:...`）+ apt 包用 snapshot.ubuntu.com 冻结——这是更重的方案，先试 AA 锁定。

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

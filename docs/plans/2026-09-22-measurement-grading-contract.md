# 测量判分契约落地：ticker-tape 容差修订与格式闸统一（v2）

> 状态：**已实施（2026-09-22）**。2026-09-22 数据处理审计的修复方案。
> v1 经独立子代理审计；v2 经 Grok CLI（grok-4.7-build）对方案交叉审计后修订；实现完成后
> grok 再次对实现 diff 交叉审计（结论「修改后批准」），其发现已修复：
> 倍率启发加近零真值守卫（`|expected| ≤ tolerance` 时跳过 unit 提示）、
> 倍率窗口分字段（长度量 `[10,100]`、SI 换算量 `[100]`）、`withinEpsilon` 非有限容差拒绝、
> ESLint 补 `Number.parseInt`/任意操作数一元加号/`x - 0` 强转、n 单位链与 v 鉴别器等契约断言。
>
> 审计背景：ticker-tape 的 x 判分无格式闸（整数可过全题）、hint 宣示「估读到 0.01 cm」与 ±0.05 容差脱钩；
> 全站解析宽松度双口径；容差硬编码散落。现状 4 个核心 spec 73 用例全绿，属「行为稳定但规则有洞」。
>
> 实施结果：全量单测 5472+ 通过（274 文件）、两个场景 data-workspace e2e 22/22 通过、
> `quality:core` 除 double-slit 入口预算（188.35/180 kB，**main 既有问题**，与本改动无关）外全部通过；
> 无新 runtime 依赖，ticker-tape 入口体积不变。

## 0. 已确认的产品决策

| 决策           | 结论                                                  | 依据                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| x 判分容差     | **±0.03 cm**（原 ±0.05 收紧）                         | 产品确认 2026-09-22；真值经 `roundCm`（`scene.sim.ts:240-242`，`Math.round(v*100)/100`）量化在 0.01 cm 网格，0.03 = 3 个刻度，兼顾读尺视觉余量与精度宣示                                           |
| 科学计数法     | 所有测量输入**默认拒绝**（`1e-2`、`3.02e0` 均拒）     | double-slit 的 `checkPositionRawFormat` 已有先例（`data-workspace.ts:546`）                                                                                                                        |
| 读数字段小数位 | **仅 x、Δx 恰好两位小数**；v 与派生汇总字段只做语法闸 | x/Δx 真值与差值天然在 0.01 网格；v 的真实公式含 `/100`（`data-task.ts:305`），结果可有 3-4 位小数（Δx=3.02 → v=0.151），强制两位会拒绝精确计算值（v1「天然两位」的说法有误，已在 grok 审计中修正） |
| 派生字段小数位 | aDiff、aFit、D、Δx、平均Δx、λ 不定小数位，只做语法闸  | 除法/拟合结果不穷尽；现有容差已吸收舍入差                                                                                                                                                          |
| n（间隔数）    | 整数字面量（`checkNumericFormat` 的 `integer: true`） | 拒 `"3.0"`、`"3e0"`；正则上收平台层，场景零正则                                                                                                                                                    |
| 有效数字       | 本期不做                                              | 无消费者；属新增教学约定，待课程侧决策                                                                                                                                                             |
| 十进制库       | 不引入                                                | runtime 依赖仅 3 个（`package.json:71-75`）；0.01 网格域用整数刻度比较即可                                                                                                                         |
| 灰度/兼容层    | 不做                                                  | 纯静态站推送即上线；e2e + 单测兜底                                                                                                                                                                 |

## 1. 字段契约总表（单一事实源，实施时落为代码常量）

### ticker-tape（`src/scenes/ticker-tape/data-task.ts`）

| 字段       | 格式闸                                      | 期望值来源（以代码为准）                                                        | 数值容差                                   | 失败层                   |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------ |
| x          | 恰好 2 位小数；禁科学计数法；允许 `cm` 后缀 | `state.tapeXCm[i]`（纸带真值，0.01 网格）                                       | **±0.03 cm** = 3 刻度，整数刻度比较        | format → unit → range    |
| Δx（i≥1）  | 恰好 2 位小数；禁科学计数法                 | 学生已校对的 `x[i]−x[i−1]`（2 位小数差仍 2 位）                                 | ±0.02 cm = 2 刻度，整数刻度比较            | 同上                     |
| v（1≤i≤5） | 仅语法；禁科学计数法；**不定小数位**        | `(x[i+1]−x[i−1]) / 100 / (2T)`，`data-task.ts:305`；T=0.1 s 时结果可 3-4 位小数 | ±0.01 m/s，**绝对 epsilon 比较（非刻度）** | format → unit → range    |
| aDiff      | 仅语法；禁科学计数法                        | `computeSuccessiveAMs2(学生 x)`                                                 | max(0.05, \|a\|×2%)，epsilon               | format → unit → range    |
| aFit       | 仅语法；禁科学计数法                        | 学生 v 的拟合斜率（须先描点拟合）                                               | max(0.05, \|a\|×5%)，epsilon               | format → unit → relation |

说明：

- v/aDiff/aFit 保留 `magnitudeFeedback` 的倍率启发（扩为 ratios `[10, 100]`）以保住 unit 层提示，仅内部比较算术改为 epsilon/tick 形式；x/Δx 的比较走 `withinTickTolerance(value, expected, ticks, 100)`（两侧均证实在 0.01 网格，刻度差与绝对容差精确等价）。v 走刻度比较会把期望先舍入到分位再 ±1 刻度（有效窗口 ±0.015 > ±0.01），故必须用绝对比较。
- 格式闸先于倍率启发（既定原则：格式错误不被数值接近覆盖）。倍率提示只对**格式合法**输入出现——真值 3.02 填 `"30.2"` 得 format 层（位数不对），填 `"30.20"` 才得 unit 层。测试值一律 `toFixed(2)` 构造。
- 场景层不新增 epsilon；平台既有 epsilon（`exactDiscreteEqual` 5e-7、`estimatedRangeContains` 1e-9、`readingsAgree` 1e-12）**保持不动**，在 `tolerance.ts` 头部集中注释。

### double-slit（`src/scenes/double-slit/data-task.ts`）

| 字段                | 格式闸                                    | 变化                                                                                                           |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| x₁/x₂               | 仪器决定恰好 2/3 位小数                   | 行为不变，改调泛化后的 `checkNumericFormat`                                                                    |
| n                   | 整数字面量（平台 `integer: true`），1..30 | **新增**：`"3.0"`、`"3e0"` 由 format 层拒（现状接受）；trim 后匹配、允许前导零（现状 `"05"` 可过，保持并注释） |
| D / Δx / 平均Δx / λ | 仅语法 + 默认禁科学计数法                 | λ=`"6.5e2"` 由过变拒；容差全部不变（`checkWavelengthNm` 的误差传播不动）                                       |

## 2. 改动清单

### 2.1 平台层 `src/platform/data-workspace.ts` + `tolerance.ts`

1. **`checkNumericFormat(raw, opts)`**（新，约 40 行）：
   ```ts
   type NumericFormatOptions = {
     decimalPlaces?: number; // 精确小数位（如 2）；integer: true 时须为整数字面量
     integer?: boolean; // /^[+-]?\d+$/（trim 后；允许前导零）
     allowScientific?: boolean; // 默认 false
     allowUnitSuffix?: boolean; // 默认 true
     emptyMessage?: string; // 缺省「请输入有效数值」
     suffixMessage?: string; // 位数/格式错误文案（如「游标卡尺读数须恰好两位小数」）
   };
   // 返回 FieldFeedback | null（null = 通过），layer 恒为 'format'
   ```
   **行为保持清单**（`checkPositionRawFormat` 薄委托后必须逐条不变，全部进测试矩阵，缺一即薄委托有回归）：
   - 空串/纯空白 → 「请输入有效数值」（`:543-544`），不是仪器文案；
   - 全角逗号 `，` → `.` 先替换（`:542`）；
   - 整数部分 `(0|[1-9]\d*)`：拒前导零（`'01.02'` 拒）、要求必有小数点（`'14'`、`'14.'`、`'.02'` 拒）、允许正负号（`'+14.02'`/`'-0.005'` 过）；
   - `/[eE]/` 任意位置即拒（含单位字母中的 e，`:546`）；
   - 后缀字符类 `[A-Za-zμµ]+`：只查「像字母」，**不**校验必须是 mm（`:554` 注释 "Optional literal mm" 与实现不符，以实现为准并修正注释）；
   - 位数按小数点切字符串计数，**整数部分规则原样保留**（不得只切小数段）。
2. **`parseStudentNumber(raw, expectedUnit, opts?)`**：默认**拒绝**科学计数法（regex 去掉 `e[+-]?\d+` 分支），`opts.allowScientific: true` 为逃生口。生产调用点仅 ticker-tape `:212` 与 double-slit `:326`；x₁/x₂ 先经位置闸拦截 e 记数，默认翻转对其无行为影响；D/Δx/平均Δx/λ/n 的 e 记数输入由过变拒（本方案明示的行为变化）。已核实无单测钉死旧默认。全角逗号转换保持，补注释与钉行为测试。
3. **`tolerance.ts`**：新增 `withinTickTolerance(value, expected, toleranceTicks, ticksPerUnit)`（整数刻度比较，用于 0.01 网格上的 x/Δx）与 `withinEpsilon(value, expected, tolerance)`（`|v−e| ≤ tolerance + 1e-9`，语义与现 `magnitudeFeedback` 一致，用于 v 与相对容差）。`looksLikeWrongUnit` 等 double-slit 在用逻辑不动。

### 2.2 ticker-tape `src/scenes/ticker-tape/data-task.ts`

1. 文件顶部**容差常量块**（判分分支禁止容差字面量）：
   ```ts
   const X_DECIMALS = 2;
   const X_TOLERANCE_CM = 0.03; // 3 个 0.01 cm 刻度
   const DELTA_X_TOLERANCE_CM = 0.02;
   const V_TOLERANCE_MS = 0.01;
   const A_TOLERANCE = { abs: 0.05, relDiff: 0.02, relFit: 0.05 } as const;
   const UNIT_RATIOS = [10, 100] as const; // mm↔cm↔m 倍率混淆提示
   ```
2. `evaluateTickerTapeField`：x/Δx 数值判分前插 `checkNumericFormat({ decimalPlaces: 2 })` 闸（失败回 format 层并写表）；v/aDiff/aFit 插语法闸（禁科学计数法，不定位数）；`magnitudeFeedback` 内部比较改 `withinTickTolerance`（x/Δx）/`withinEpsilon`（v/a），倍率启发扩为 `[10, 100]`（补上现状漏检的 mm↔cm ×10：格式合法的 `"30.20"` 现在得 unit 层）。
3. **hint 与失败文案均由常量拼装**：hint = `x 单位 cm（毫米尺估读到 0.01 cm，填两位小数；与纸带读数相差不超过 ${X_TOLERANCE_CM.toFixed(2)} cm 判通过）；v 单位 m/s。`；失败模板 `允许误差 ±${tolerance.toFixed(2)} ${unit}` 继续引用常量（两条字符串都受契约测试约束）。
4. 失效链说明：`writeCheckedField` 无条件调用 `invalidateDownstream`（`data-workspace.ts:732-739`），x 写表（含格式失败）即把下游 Δx/v/a 置 stale——补一条测试钉住「x 改坏后下游不再保持绿色」。

### 2.3 double-slit `src/scenes/double-slit/data-task.ts`

1. n 前置 `checkNumericFormat({ integer: true })` 闸（format 层「n 应为正整数」）；量程 1..N_MAX 不变。**场景文件零正则**，与 2.4 的 lint 规则不再矛盾。
2. `slitDistanceMm` 收口到 sim 常量，**必须带 m→mm 换算**（两常量数值差 1000 倍：`scene.sim.ts:42` 为 `0.01e-3` 米/单位，`data-task.ts:163-165` 为 `0.01` mm/单位）：
   ```ts
   export function slitDistanceMm(slitDistance: number): number {
     return slitDistance * PHYSICAL_D_SCALE * 1000; // m → mm
   }
   ```
   并加等价性断言测试：对若干输入 `slitDistanceMm(x) === x * 0.01`，防止换算丢失把 d/Δx/λ 整链缩小 1000 倍。
3. `reading-constants.ts` 不动（已是声明式契约实例）。

### 2.4 门禁

1. ESLint `no-restricted-syntax` override，**仅限定 `src/scenes/*/data-task.ts`**：禁 `parseFloat`、`Number()`、`parseInt`、`+raw`、`raw-0` 等数值强转作用于输入，禁 `new RegExp` 与正则字面量。**不碰** view 层 `parseFloat(canvas.dataset.responsiveScale)` 范式（AGENTS.md 强制）。
2. 已知绕过面（记录并在评审时人工把关，不强行机器化）：邻文件（`wavelength.ts` 等）、`src/instruments/**`、平台文件本身；容差常量是否被引用由契约测试约束（见下），不靠 lint。
3. 新增 `tests/unit/measurement-grading-contract.spec.ts`：
   - hint 文本与失败文案均包含 `X_TOLERANCE_CM` 当前值（改容差忘改文案即失败）；
   - `x` 边界与常量绑定：`(truth±0.03).toFixed(2)` 过、`(truth+0.04).toFixed(2)` 拒；
   - `T === 0.1` 与 v 期望公式钉死（v = Δx_cm/100/(2T)，防公式回退）；
   - `slitDistanceMm(x) === x * 0.01` 等价断言；
   - Δx/v/aDiff/aFit 的容差值与常量块一致（对固定夹具断言通过/拒绝边界）。

## 3. 测试与基线同步

| 文件                                            | 改动                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/data-workspace.spec.ts`             | `checkNumericFormat` 全量行为保持清单用例（空串文案/全角逗号/前导零/`e` in unit/正负号/位数矩阵）；`parseStudentNumber` 默认拒 `3.02e0` + opt-in 放行；`:928`「n 不做格式闸」改名并改断言 `n='3.0'/'3e0'` → format 拒、`'05'` 仍过                                                                               |
| `tests/unit/ticker-tape-data-workspace.spec.ts` | `:110` 边界用例改 `(truth+0.03).toFixed(2)` 过 / `(truth+0.04).toFixed(2)` 拒；`:108-109` 的 `truth*100` 改 `(truth*100).toFixed(2)` 才能落到 unit 层；新增 `"3"`、`"3.0"`、`"3.02e0"` → format 拒；`"30.20"`（×10）→ unit 层；`v="0.151"` 类 3 位小数精确值**仍通过**（回归 v1 教训）；x 改坏 → 下游 stale 断言 |
| `tests/unit/double-slit-data-workspace.spec.ts` | λ=`"6.5e2"` → format 拒；n 非整数字面量拒                                                                                                                                                                                                                                                                        |
| `tests/e2e/*`                                   | 两类同步：① 反馈/hint 文案断言（含「允许误差 ±0.05」→ ±0.03）；② **已填写的测量值**——原 `"3"`/`"3.0"` 类合法输入在格式闸后变拒绝，grep e2e 内全部 `fill` 到数据表的值并改为两位小数                                                                                                                              |
| 视觉基线                                        | 面板文案变化必破两平台像素基线：Linux `scripts/visual-linux-container.sh update`，Mac `pnpm test:visual:update` / `update-darwin-snapshots.yml`；**禁止 Linux 宿主机 `--update-snapshots`**。若工作区在截图中默认关闭则基线不受影响，仍以实际 diff 为准                                                          |

## 4. 实施顺序

1. 平台层：`checkNumericFormat`（含行为保持清单测试）+ `parseStudentNumber` 默认收紧 + tick/epsilon helper。**此步收索单默认即影响 double-slit 的 D/Δx/avg/λ 的 e 记数用例**，先跑全量单测确认影响面，预期需同步的用例集中在 `data-workspace.spec.ts` 与 `double-slit-data-workspace.spec.ts`。
2. ticker-tape：常量块 + 格式闸 + ±0.03 + hint/失败文案拼装 + 倍率启发 `[10,100]`。
3. double-slit：n 闸（平台 `integer` 选项）+ `slitDistanceMm` 换算收口 + 等价性测试。
4. 门禁与契约测试（lint override + `measurement-grading-contract.spec.ts`）。
5. e2e 文案**与填写值**同步 → 两平台视觉基线重生成。

每步验证：`pnpm verify:scene ticker-tape && pnpm verify:scene double-slit`；收尾 `pnpm quality:core`。

## 5. 验收标准（2026-09-22 核验）

- [x] ticker-tape x：`"3"`、`"3.0"`、`"3.02e0"` 均 format 层拒；`(truth±0.03).toFixed(2)` 过、`(truth+0.04).toFixed(2)` 拒；hint 与失败文案均与常量一致（契约测试钉住）。
- [x] v：`"0.151"` 类精确 3-4 位小数值通过（语法闸不定位数）；`±0.01` 绝对容差边界与现状等价（+1e-9），并以 `+0.011 拒 / +0.009 过` 鉴别器锁死「不得退化为刻度比较」。
- [x] 全部测量字段默认拒绝科学计数法；double-slit 除「n 整数字面量、全字段禁 e 记数」外**逐用例不变**（全量 5472 单测为回归基线，全绿）。
- [x] `data-task.ts` 内零正则、零 parseFloat/Number(raw)/parseInt/一元加号/`x-0` 转数、零容差字面量；lint 生效（负样本探针实测：正则字面量、Number()、parseFloat、new RegExp、一元加号、`x-0` 全部被拦）。
- [x] `slitDistanceMm` 等价性断言通过（d/Δx/λ 数值链无 1000 倍漂移）。
- [x] e2e 全绿（ticker-tape 填写值改 `toFixed(2)`，double-slit 填值本就兼容；反馈文案无既有 e2e 精确断言需同步）。
- [x] 视觉基线：工作区面板不在 `visual-regression.spec.ts` 截图范围内（double-slit 工作区 spec 只产 artifacts 截图，无像素比对），两平台基线无需重生成。
- [x] `pnpm quality:core` 除 **double-slit 入口预算**外全部通过——该超预算（188.35/180 kB）在未含本改动的 main 上逐字节复现，为既有问题，另单独立项处理；无新 runtime 依赖，ticker-tape 入口体积不变（165.33 kB）。

## 6. 明确不做（防扩散）

- 不引入 MeasurementSpec DSL、十进制库、灰度开关、新旧判定兼容层。
- 不动 `FeedbackLayer` 五层模型与 `Scene-owned physics` 分层（n±1 教学反馈、`looksLikeWrongUnit`、仪器同锁均留原处）。
- 不改有效数字判定（无消费者，待课程侧决策）。
- 不动 view 层 `responsiveScale` 解析范式；不动平台既有 epsilon 与 double-slit 仪器判定逻辑。

## 附：v1 → v2 修订记录（grok 交叉审计结论）

| grok 发现                                                                              | 严重度 | 处置                                                                                       |
| -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| v「天然两位小数」推导漏 `/100`，按总表实施会把 v 期望判错且格式闸拒绝精确值            | 高     | 已撤回；v 改语法闸 + 绝对 epsilon 容差，契约测试改钉公式与 T                               |
| `slitDistanceMm` 直引 `PHYSICAL_D_SCALE` 差 1000 倍（m vs mm）                         | 高     | 已补 `* 1000` 换算 + 等价性断言测试                                                        |
| n 的正则写在 data-task 与「data-task 禁正则」lint 自相矛盾                             | 高     | 正则上收平台 `checkNumericFormat({ integer: true })`                                       |
| 格式闸先于倍率启发 → `"30.2"`/`truth*100` 用例会落到 format 而非 unit                  | 中     | 测试值改 `toFixed(2)`；分层次序在 §1 明示                                                  |
| v 用 tick 比较窗口变宽（±0.015 > ±0.01）                                               | 中     | v 改绝对比较，仅 0.01 网格上的 x/Δx 用 tick                                                |
| aDiff/aFit 离开 `magnitudeFeedback` 丢 unit 层                                         | 中     | 保留 magnitudeFeedback，仅换内部比较算术                                                   |
| `checkNumericFormat` 未规定空串文案/全角逗号/前导零/裸 e/E/μ 后缀等现行为              | 中     | §2.1 行为保持清单逐条列出并进测试矩阵                                                      |
| e2e 只同步文案漏了已填测量值；失败文案 `±0.05` 未列入                                  | 中     | §3 e2e 行改为双同步                                                                        |
| 边界串 `` `${truth+0.03}` `` 浮点展开非两位小数，会被自己的格式闸拒绝                  | 中     | 契约与用例一律 `toFixed(2)` 构造                                                           |
| 「唯一 epsilon」与「既有 epsilon 不动」措辞冲突；例外清单两节不一致；`" 5 "` trim 行为 | 低     | 措辞统一：场景层不新增 epsilon；例外= n 字面量 + 全字段禁 e 记数；n 闸 trim 后匹配并钉测试 |

已核实 grok 标记「材料不足」的两点，均支持方案主体：真值确在 0.01 网格（`roundCm`，`scene.sim.ts:240-242`）；输入框为 `type='text'`（`data-workspace-panel.ts:328-331`），raw 字符串原样保留、尾随零不丢，「恰好两位小数」闸可实施。

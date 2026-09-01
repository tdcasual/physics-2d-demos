# 物理场景 sim 测试编写指南

> 面向编程能力较弱的代理（如 OpenClaw）：教你如何给 `src/scenes/*/scene.sim.ts` 和
> `src/instruments/*/instrument.sim.ts` 写有说服力的正确性测试。
> 所有示例均摘录自仓库真实 spec 并做了简化，出处已标注。

## 0. 什么是镜像测试，为什么它没用

镜像测试（mirror test）指：把实现里的公式原样抄进测试，再用它生成期望值。

```typescript
// 反例（虚构示例）：把实现的公式抄进测试
expect(s.receivedFrequency).toBeCloseTo(
  (f * (v + obs)) / (v - src), // 从 scene.sim.ts 里抄来的表达式
  6
);
```

问题：如果实现写错了（比如把减号写成加号），测试里的期望值来自同一份错误公式，
**两边一起错，测试照样通过**。这种测试只能抓到「重构时手滑改了代码」，
抓不到「物理本身就错了」——而后者恰恰是物理演示项目最致命的错误。

**好测试的期望值必须有独立来源**：教科书公式手算、物理不变量、另一种数值方法、
仪器读数规则、或预设的物理语义。判断标准只有一个：

> 如果实现里的公式写错了，这个测试还能过吗？能过 → 镜像测试，重写。

---

## 1. 解析解对照：教科书公式手算值

- **出处**：`tests/unit/doppler-effect.sim.spec.ts`
- **适用**：sim 实现了有闭式解的物理公式（多普勒频移、抛体射程、弹簧周期等）
- **独立期望值来源**：物理教科书公式 + 代入简单数字手算

多普勒公式 `f_recv = f_emit × (v_sound + v_obs) / (v_sound − v_src)`，选整除的参数手算：

```typescript
// 出处：doppler-effect.sim.spec.ts「received frequency formula」
// v_src = +3（朝观察者）→ f = 3 × 6 / (6 − 3) = 6 Hz（手算，非从实现抄）
const sim = createDopplerSim({ sourceSpeed: 3, emitFrequency: 3 });
expect(sim.getState().receivedFrequency).toBeCloseTo(6, 6);

// v_src = −3（远离）→ f = 3 × 6 / (6 + 3) = 2 Hz
const sim2 = createDopplerSim({ sourceSpeed: -3, emitFrequency: 3 });
expect(sim2.getState().receivedFrequency).toBeCloseTo(2, 6);
```

实现里 `computeReceivedFrequency` 带符号翻转和几何判断（scene.sim.ts 的
`dist >= 0 ? sourceSpeed : -sourceSpeed`），测试完全不理会这些细节，直接用
公式算终值。实现公式错了，手算值不会跟着错。

**写法要点**：

- 选能整除、能口算的参数（v=6, src=3 → 分母 3），期望值写成字面量 `6`，不要写表达式。
- 注释里写清推导过程（`f = 3 × 6 / (6 − 3) = 6 Hz`），方便 review 时复核。
- 每个方向/符号分支至少一组手算值：靠近、远离、观察者反向、特殊位置
  （doppler spec 还测了观察者在波源左侧时符号翻转的镜像情形，期望值 2 Hz 同样手算）。
- 保护分支也要测：v_src → 声速时分母趋零，doppler 约定返回 `f × 100`，
  spec 直接断言 `toBeCloseTo(300, 6)`——这测的是**约定**而非物理，要在注释里说明。

## 2. 不变量 / 性质测试：不管参数怎么变都必须成立的关系

- **出处**：`tests/unit/mechanical-wave.sim.spec.ts`
- **适用**：波形、守恒量、约束系统；或参数空间大、无法穷举手算的 sim
- **独立期望值来源**：物理定律本身（周期性、平移不变性、约束方程），不引用任何具体函数值

波传播的本质是波形平移：`y(x, t+dt) = y(x − v·dt, t)`。这是波动的**定义性质**，
实现用 sin 还是查表、相位写不写错，都必须满足它：

```typescript
// 出处：mechanical-wave.sim.spec.ts「travels right for dir=1 and left for dir=-1」
const [A, lambda, T] = [5, 4, 2];
const v = lambda / T; // v = λ/T，波动学基本关系
const dt = 0.3,
  x = 7.5,
  t = 0.9;
expect(waveY(x, t + dt, A, lambda, T, 1)).toBeCloseTo(
  waveY(x - v * dt, t, A, lambda, T, 1), // 右行波：dt 后 x 处 = dt 前 x−v·dt 处
  10
);
```

同文件还有周期性断言：`waveY(x, t) === waveY(x + λ, t)` 且
`waveY(x, t) === waveY(x, t + T)`——任选非特殊点（x=2.3, t=0.7）验证，
不依赖任何手算值。

约束系统用 **sweep** 代替穷举：对三个波参数各取 5 个值调用 `setParam`，
每次断言 `v = λ/T` 恒成立且因变量落在合法区间：

```typescript
// 出处：mechanical-wave.sim.spec.ts「never violates v = λ/T across a sweep」
for (const key of ['waveSpeed', 'wavelength', 'period'] as const) {
  for (const value of [0.5, 1, 3, 7.5, 10]) {
    const p = sim.setParam(key, value);
    expect(p.waveSpeed).toBeCloseTo(p.wavelength / p.period, 6); // 不变量
    // 因变量必须在定义域内
    expect(p[dep]).toBeGreaterThanOrEqual(lo);
    expect(p[dep]).toBeLessThanOrEqual(hi);
  }
}
```

**写法要点**：

- 不变量断言用的关系式（v = λ/T、a = −ω²y）必须是**比实现更基本的物理定律**，
  不是实现公式的变形。
- 取点避开特殊值（0、λ/4 之类的对称点留给解析解对照），用 2.3、0.7 这种「乱数」
  更能抓 bug。
- sweep 的取点覆盖区间两端和中间，数量够用即可（3×5=15 次断言），不要上几百次拖慢测试。

## 3. 独立数值方法交叉验证：中心差分 vs 解析导数

- **出处**：`tests/unit/mechanical-wave.sim.spec.ts`
- **适用**：sim 同时提供某函数及其导数/积分（位置与速度、波形与质点速度）
- **独立期望值来源**：数值微积分——用函数自身做差分，验证导数实现

`waveVelocity` 是 `waveY` 的时间导数。测试不抄实现里的
`−dir·Aω cos(kx − dir·ωt)`，而是用 waveY 本身做中心差分：

```typescript
// 出处：mechanical-wave.sim.spec.ts「waveVelocity is the time derivative of waveY」
const eps = 1e-6;
for (const [x, t] of [
  [2.3, 0.7],
  [8.1, 1.9]
]) {
  const numeric =
    (waveY(x, t + eps, A, lambda, T, dir) -
      waveY(x, t - eps, A, lambda, T, dir)) /
    (2 * eps); // 中心差分：导数的独立数值近似
  expect(waveVelocity(x, t, A, lambda, T, dir)).toBeCloseTo(numeric, 4);
}
```

如果 `waveVelocity` 的实现丢了负号、把 cos 写成 sin、或 ω 算错，差分不会陪它错。

**写法要点**：

- 中心差分误差是 O(eps²)，eps=1e-6 时截断误差约 1e-12，但浮点舍入约 1e-10/eps 量级，
  所以断言精度取 4 位小数是稳妥选择（见第 6 节）。
- 这个模式验证的是「两个实现互相一致」，不能替代模式 1——waveY 本身错了，
  它和它的差分会一致地错。所以要**搭配** waveY 的解析断言（如
  `waveY(λ/4, 0) = A`，spec 里 `toBeCloseTo(5, 10)`）使用。

## 4. 读数规则 / 已知样例：仪器类 sim 的读数分解

- **出处**：`tests/unit/instrument-vernier-caliper.sim.spec.ts`、
  `tests/unit/spiral-micrometer.sim.spec.ts`
- **适用**：游标卡尺、螺旋测微器等「给定位 → 分解读数」的仪器 sim
- **独立期望值来源**：仪器读数规则（教学定义），取有标准答案的样例

游标卡尺规则：读数 = 主尺整毫米 + 对齐格数 × 精度。样例「5.24 mm、0.02 精度」
按规则手推：主尺 5 mm，余量 0.24 mm，0.24 / 0.02 = 第 12 格对齐：

```typescript
// 出处：instrument-vernier-caliper.sim.spec.ts「known values」
// 0.02mm 精度，小球 5.24 → main=5, k=12, total=5.24（按读数规则手推）
const s = createVernierCaliperSim({
  precision: 0.02,
  objectType: 0
}).getState();
expect(s.mainScaleReading).toBe(5);
expect(s.vernierAlignment).toBe(12);
expect(s.totalReading).toBeCloseTo(5.24, 6);
```

螺旋测微器规则：主尺按 0.5 mm 向下取整，鼓轮读数 = (读数 − 主尺) / 0.01。
样例「默认 6.725」：主尺 6.5（半毫米线露出），鼓轮 22.5：

```typescript
// 出处：spiral-micrometer.sim.spec.ts「known values」
const s = createSpiralMicrometerSim(defaultParams).getState();
expect(s.mainScaleReading).toBe(6.5);
expect(s.drumReading).toBeCloseTo(22.5, 1);
expect(s.hasHalfMm).toBe(true);
```

**写法要点**：

- 分解式断言（`totalReading = main + k × precision`）只能查内部一致性，**必须**
  搭配绝对读数断言（`totalReading` 等于原始输入），否则分解错了也能自洽。
- 低精度舍入是经典错误点：vernier spec 测了 5.24 在 0.1 精度下读 5.2、
  0.05 精度下读 5.25——这类「换挡」样例比高精度样例更能抓 bug。
- 样例的期望值先用纸笔推一遍再写进测试，禁止「跑一遍实现，把输出抄回来」。

## 5. 边界与语义断言

### 5a. 边界模式：判定线两侧各取一点

- **出处**：`tests/unit/spiral-micrometer.sim.spec.ts`
- **适用**：带阈值的布尔/分支逻辑（半毫米线是否露出、是否到达、clamp 边界）
- **独立期望值来源**：判定条件的数学定义

半毫米线的定义是「余数 ≥ 0.5」。边界上必须两侧都测，而且**恰好在线上**算 true：

```typescript
// 出处：spiral-micrometer.sim.spec.ts「hasHalfMm」与「0.5mm floor」
// 恰好 4.5：余数 = 0.5 → 半毫米线露出（定义取 >=）
expect(createSpiralMicrometerSim({ reading: 4.5 }).getState().hasHalfMm).toBe(
  true
);

// 4.4999：余数 0.4999 < 0.5 → 不露出，主尺仍停在 4.0，鼓轮 49.99
const s = createSpiralMicrometerSim({ reading: 4.4999 }).getState();
expect(s.mainScaleReading).toBe(4.0);
expect(s.hasHalfMm).toBe(false);
expect(s.drumReading).toBeCloseTo(49.99, 1);
```

**写法要点**：边界测试抓的是 `>` vs `>=`、浮点取整方向这类一个字符的 bug。
每个阈值至少三个点：恰好等于、略低于、略高于。边界点上的分解结果
（主尺、鼓轮）也要断言，因为边界处往往是分解逻辑最容易错的地方。

### 5b. 语义断言：预设的物理含义，而非字段值罗列

- **出处**：`tests/unit/ganshe-presets.spec.ts`
- **适用**：预设（preset）配置、命名场景
- **独立期望值来源**：预设名字的物理定义

不要断言「constructive 预设的 phaseDiff 恰好等于某个 magic number」，
要断言「constructive 预设满足相长干涉的定义：Δφ = 0 且两波同频」：

```typescript
// 出处：ganshe-presets.spec.ts「preset application round-trip」
it('constructive preset is fully constructive (Δφ=0, 同频)', () => {
  expect(ganshePresets.constructive.phaseDiff).toBe(0);
  expect(ganshePresets.constructive.freq1).toBe(
    ganshePresets.constructive.freq2
  );
});

it('destructive preset is fully destructive (Δφ=180°, 同频)', () => {
  expect(ganshePresets.destructive.phaseDiff).toBe(180);
  expect(ganshePresets.destructive.freq1).toBe(ganshePresets.destructive.freq2);
});

it('beat preset uses unequal frequencies', () => {
  expect(ganshePresets.beat.freq1).not.toBe(ganshePresets.beat.freq2); // 拍 = 频差
});
```

**写法要点**：语义断言锁的是**意图**而非实现细节。freq1 具体是 1.5 还是 2.0
不重要，「两频不相等」才是拍现象的本质。这样预设调参（换个更好看的频率）
不会 break 测试，而把 beat 误改成同频一定会被抓。

---

## 6. 容差与近似

`toBeCloseTo(expected, n)` 的 n 是「小数位数」，选错会假通过或假失败：

- **纯函数闭式解**（waveY、解析公式代入）：计算链短，误差只有浮点舍入，
  用 10 位甚至更高（mechanical-wave spec 用 `toBeCloseTo(5, 10)`）。
- **手算期望值 vs 实现计算**：两边都有浮点运算，用 6 位是安全默认
  （doppler spec 全文用 6）。
- **数值方法交叉验证**：差分/积分的截断误差决定下限。中心差分 eps=1e-6 时
  取 4 位（mechanical-wave 的 waveVelocity 断言）；步进式发射这类被帧率量化的量，
  容差直接取「一帧的传播距离」（doppler 波环间距断言用 `frameTravel + 1e-6`）。
- **仪器读数**：由仪器精度决定，鼓轮读数保留 1 位小数（`toBeCloseTo(22.5, 1)`）。

**何时允许二阶差异**：当两种情形只在低阶近似下等价时，断言一阶等价而不是精确相等。
doppler spec 的一阶等价测试：低速（u/v = 0.05）下，「波源动」与「观察者动」
都趋近 `f(1 + u/v)`，但二者精确公式不同（差在 (u/v)² 项），所以：

```typescript
// 出处：doppler-effect.sim.spec.ts「matches first-order equivalence…」
const firstOrder = f * (1 + u / SOUND_SPEED); // 一阶展开
expect(bySource).toBeCloseTo(firstOrder, 1); // 只断言到 1 位小数
expect(byObserver).toBeCloseTo(firstOrder, 1);
```

注释里写明「允许二阶差异 (u/v)²」，精度也相应放宽到 1 位。原则：**近似断言的
容差必须大于被忽略的最低阶项**，并在注释里给出推导。

---

## 7. 反面教材（以下为虚构示例，说明什么样的测试会假通过）

**例 1：从实现抄公式。**
实现写成 `f = emit * (v + obs) / (v - src)`，测试里同样算 `(f*(v+obs))/(v-src)`。
实现把 `v - src` 误写成 `v + src` 后，测试同步抄错，照样通过。
→ 期望值必须是字面量手算结果（`expect(...).toBeCloseTo(6, 6)`）。

**例 2：用实现输出反推输入（往返自洽）。**
「读取 state.x，代入实现暴露的辅助函数，断言等于另一个 state 字段」——
整条链路都在实现内部，错的实现会给出一致地错的 state。
（机械波 spec 的 pointP 一致性断言单看也是这个形态，所以它和解析/差分断言
搭配使用才有意义；单独写等于没测。）

**例 3：快照式全字段比对。**
`expect(sim.getState()).toEqual({ receivedFrequency: 6.000001, ... })` 的初版
靠跑一遍实现抄回全部字段。实现改 bug 后数值变了，维护者「更新快照」时照抄新值，
测试永远绿灯，只起回归锁作用，没有正确性论证力。
→ 每个关键字段都要有独立来源的断言；快照只能当补充。

---

## 8. 提交前检查清单

1. **独立性**：每个关键期望值能否说出独立来源（公式手算 / 物理定律 / 数值方法 /
   读数规则 / 语义定义）？说不出来就是镜像测试。
2. **字面量**：手算值是否写成字面量并附推导注释，而不是从实现里抄的表达式？
3. **故障注入**：把实现里的一个符号改反（如 `−` 改 `+`），测试会变红吗？
   不变红 = 没测到东西。
4. **方向覆盖**：靠近/远离、左行/右行、正负号、特殊几何位置，各至少一例。
5. **边界两侧**：每个阈值判定的「恰好等于 / 略低 / 略高」三点都测了吗？
6. **容差合理**：精度位数是否匹配误差来源（闭式解 6-10 位、数值方法 4 位、
   帧量化量取一帧量级）？近似断言是否注明被忽略的阶？

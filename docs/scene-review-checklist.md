# svgzhenli 物理演示重点复审清单

> 目的：为后续重点审计提供逐项勾选清单。以下顺序与远程清单完全一致（1–104）。

## 范围与状态

- 来源：`/home/tdcasual/Downloads/物理演示/svgzhenli-高中物理-2D演示清单.xlsx`（审计生成时间：2026-09-12 UTC）。
- 本地项目：`/home/tdcasual/codework/physics-2d-demos`。
- 每项已完成本轮场景接入验证；本清单中的复选框用于后续重点复审，不代表复审已完成。
- 复审时优先检查：动画区像素级一致性、物理模型与数值、控件交互、响应式布局、精简文案、截图证据。

## 场景清单

|   # | svgzhenli 场景                                        | 分类 | 本地场景 ID / 文件                                                                                 | 详情与封面证据                                                                                                                                                          | 复审 |
| --: | ----------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
|   1 | 力的合成与分解                                        | 力学 | [`force-composition`](../src/scenes/force-composition/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/1e5fa5fb-0e00-40cd-b4c7-0ab9e2df8c5e) · [封面](https://img.svgzhenli.com/gallery-assets/covers/f3obs9ew871780737938418.png)   |  ✅  |
|   2 | 动态圆·三法破临界                                     | 电磁 | [`dynamic-circle`](../src/scenes/dynamic-circle/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/5aa418d4-7f15-48bf-9b40-2903a78a4a8d) · [封面](https://img.svgzhenli.com/gallery-assets/covers/3b63ldwj6881784565177525.png)  |  ✅  |
|   3 | 回旋加速器核心结构与原理                              | 电磁 | [`cyclotron`](../src/scenes/cyclotron/scene.meta.ts)                                               | [详情](https://app.svgzhenli.com/resource/455c88d7-71d7-4bb9-8a8b-a505a95a135f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/dji62m8jox91774712146984.png)  |  ✅  |
|   4 | 简谐横波传播状态模型                                  | 力学 | [`harmonic-wave`](../src/scenes/harmonic-wave/scene.meta.ts)                                       | [详情](https://app.svgzhenli.com/resource/5c95b70b-3496-4df2-8bea-a020e92bbd29) · [封面](https://img.svgzhenli.com/gallery-assets/covers/oa7f9q6ecb1774685743478.png)   |  ✅  |
|   5 | 法拉第圆盘发电机原理                                  | 电磁 | [`faraday-disc`](../src/scenes/faraday-disc/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/5cdaf4ca-9464-4554-b84a-caa9861a9bb7) · [封面](https://img.svgzhenli.com/gallery-assets/covers/h9i1ky6qviv1788264020500.png)  |  ✅  |
|   6 | 平抛实验数据还原与轨迹分析                            | 力学 | [`projectile-data-analysis`](../src/scenes/projectile-data-analysis/scene.meta.ts)                 | [详情](https://app.svgzhenli.com/resource/7886d018-8006-4277-bd1c-4342c08f27e4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/wjoea5u4c6e1787821850037.png)  |  ✅  |
|   7 | 子弹打木块力学模型                                    | 力学 | [`bullet-block`](../src/scenes/bullet-block/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/efdbc474-2e4e-4a0d-9aa1-a3ac3a9a5262) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ttwrczxsemb1774681162042.png)  |  ✅  |
|   8 | 验证力的平行四边形定则                                | 力学 | [`parallelogram-rule`](../src/scenes/parallelogram-rule/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/039f55b4-fd42-490f-9947-2e4c54601684) · [封面](https://img.svgzhenli.com/gallery-assets/covers/5ns9z0vm18w1783606039791.png)  |  ✅  |
|   9 | 双星系统运动轨道-万有引力定律与航天                   | 力学 | [`binary-stars`](../src/scenes/binary-stars/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/cf938b0c-3fba-4a89-a76f-eceaf07397f5) · [封面](https://img.svgzhenli.com/gallery-assets/covers/9q4r2plqgqo1774679828854.png)  |  ✅  |
|  10 | 双动式风箱工作原理演示                                | 力学 | [`bellows`](../src/scenes/bellows/scene.meta.ts)                                                   | [详情](https://app.svgzhenli.com/resource/c79a2708-0d3c-4073-a283-38fda18be645) · [封面](https://img.svgzhenli.com/gallery-assets/covers/xtwc0u5essg1776333366610.png)  |  ✅  |
|  11 | 匀变速直线运动 - 速度与时间关系                       | 力学 | [`uniformly-varied-motion`](../src/scenes/uniformly-varied-motion/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/a0834791-f1a8-4673-aa23-4bb5f7df5271) · [封面](https://img.svgzhenli.com/gallery-assets/covers/gw9dhetax9f1774676803350.png)  |  ✅  |
|  12 | 竖直平面内圆周运动临界状态                            | 力学 | [`vertical-circle`](../src/scenes/vertical-circle/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/d53c6251-b24c-4a6c-a6b9-9e104a3995b8) · [封面](https://img.svgzhenli.com/gallery-assets/covers/s3fq03sft9n1775626003953.png)  |  ✅  |
|  13 | 三大性质力交互课件                                    | 力学 | [`three-forces`](../src/scenes/three-forces/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/a6e3e383-482e-4ad1-a69b-f7ddaeaf8aee) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ihldajl8mpl1781095386830.png)  |  ✅  |
|  14 | 原子核比结合能与质量数关系                            | 近代 | [`binding-energy`](../src/scenes/binding-energy/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/56ab7ed1-01c6-4cfa-89d3-cae38e24c433) · [封面](https://img.svgzhenli.com/gallery-assets/covers/hlgy1dsu9wh1774799292161.png)  |  ✅  |
|  15 | 探究加速度与力质量关系实验                            | 力学 | [`accel-force`](../src/scenes/accel-force/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/fe4a9b83-9f96-4f06-9ad6-d64ebd75c515) · [封面](https://img.svgzhenli.com/gallery-assets/covers/qgo9e87x771787678068367.png)   |  ✅  |
|  16 | 单缝衍射条纹分布                                      | 光学 | [`single-slit`](../src/scenes/single-slit/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/50754223-e2c0-405d-9098-cfa3d2fedaca) · [封面](https://img.svgzhenli.com/gallery-assets/covers/7jar1z9ybu81774773489050.png)  |  ✅  |
|  17 | 磁镜与磁约束交互                                      | 电磁 | [`magnetic-mirror`](../src/scenes/magnetic-mirror/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/c540be11-ba80-4952-8a22-570504fe1d69) · [封面](https://img.svgzhenli.com/gallery-assets/covers/q2ltmtzvpg1786796521171.png)   |  ✅  |
|  18 | 匀变速直线运动位移与时间关系                          | 力学 | [`displacement-time`](../src/scenes/displacement-time/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/f8d783bf-0b36-425f-ae53-a692dba4aff9) · [封面](https://img.svgzhenli.com/gallery-assets/covers/noonxbfliw1774676556531.png)   |  ✅  |
|  19 | 木块与木板相对滑动物理模型                            | 力学 | [`block-board`](../src/scenes/block-board/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/ccd3490a-6854-4a58-942e-2dc8e81a4fd9) · [封面](https://img.svgzhenli.com/gallery-assets/covers/6pvv1payb171774685383168.png)  |  ✅  |
|  20 | 示波管的原理与波形同步                                | 电磁 | [`oscilloscope`](../src/scenes/oscilloscope/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/5a841fe8-5060-47af-a132-cf4511d2d4eb) · [封面](https://img.svgzhenli.com/gallery-assets/covers/pfv1s8rnxzg1778497322822.png)  |  ✅  |
|  21 | 打点计时器原理演示                                    | 力学 | [`ticker-timer`](../src/scenes/ticker-timer/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/0e146679-df0c-429f-b982-9e3c1c0c2367) · [封面](https://img.svgzhenli.com/gallery-assets/covers/aorki9og3yq1783606121977.png)  |  ✅  |
|  22 | 带电粒子在匀强磁场中的圆周运动                        | 电磁 | [`charged-particle-circle`](../src/scenes/charged-particle-circle/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/bcf1789c-95eb-480d-9b4e-e9eb1ee6210c) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ohou8hat4jj1774711562323.png)  |  ✅  |
|  23 | 小球落到竖直弹簧与简谐运动                            | 力学 | [`spring-ball`](../src/scenes/spring-ball/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/75ac35a6-d777-4e05-b192-5ab524c74832) · [封面](https://img.svgzhenli.com/gallery-assets/covers/532og1b4u851788370155234.png)  |  ☑   |
|  24 | 电阻测量法设计（限流接法、分压接法、电流表的内外接）  | 电磁 | [`resistor-measurement`](../src/scenes/resistor-measurement/scene.meta.ts)                         | [详情](https://app.svgzhenli.com/resource/250ca6cd-36d9-4ed5-9983-d4a2e9058251) · [封面](https://img.svgzhenli.com/gallery-assets/covers/zq29kqwn07m1781283130413.png)  |  ☑   |
|  25 | 高精度测量工具读数原理（游标卡尺&螺旋测微器）         | 力学 | [`precision-tools`](../src/scenes/precision-tools/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/db871107-556d-4e2f-936e-52ebd2767a54) · [封面](https://img.svgzhenli.com/gallery-assets/covers/08nk6xz5mriq1778077856552.png) |  ☑   |
|  26 | 测电源电动势和内阻实验                                | 电磁 | [`emf-internal-resistance`](../src/scenes/emf-internal-resistance/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/11ed455d-d6bc-4ac7-82a3-0a57b2ef969f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/h7646etm75j1787678239426.png)  |  ☑   |
|  27 | 电势电势能与E-x和φ-x图象                              | 电磁 | [`potential-energy-graphs`](../src/scenes/potential-energy-graphs/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/ff3b0997-708a-4845-8ce1-1f8a1a198337) · [封面](https://img.svgzhenli.com/gallery-assets/covers/gqj6h49siwi1787678193054.png)  |  ☐   |
|  28 | 冲量动量定理与F-t图象                                 | 力学 | [`impulse-momentum`](../src/scenes/impulse-momentum/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/55c5259d-0e1f-4ff8-b491-791c7df3c02e) · [封面](https://img.svgzhenli.com/gallery-assets/covers/tpvaff7fej91787660726259.png)  |  ☐   |
|  29 | 单匝线框穿过有界匀强磁场                              | 电磁 | [`single-loop`](../src/scenes/single-loop/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/4c98b69d-8854-45ad-9914-82c68b961368) · [封面](https://img.svgzhenli.com/gallery-assets/covers/86no26fi9ne1774713114955.png)  |  ☐   |
|  30 | 电磁感应 - 电容棒与电阻棒模型                         | 电磁 | [`rod-model`](../src/scenes/rod-model/scene.meta.ts)                                               | [详情](https://app.svgzhenli.com/resource/58836693-454f-4300-aa52-0b99316f1c26) · [封面](https://img.svgzhenli.com/gallery-assets/covers/6hlwqwk5c7i1786857749323.png)  |  ☐   |
|  31 | 匀速圆周运动与向心力模型                              | 力学 | [`centripetal-motion`](../src/scenes/centripetal-motion/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/2b810c0c-11fe-4d31-933f-770b06d1a88e) · [封面](https://img.svgzhenli.com/gallery-assets/covers/7e91dq40i21775496835830.png)   |  ☐   |
|  32 | 安培力方向与导体平衡                                  | 电磁 | [`ampere-balance`](../src/scenes/ampere-balance/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/1bfccf2e-a260-4be5-9a1d-d3dcd3e6cb00) · [封面](https://img.svgzhenli.com/gallery-assets/covers/t5xsdch4bs1787678015468.png)   |  ☐   |
|  33 | 平抛运动轨迹与速度分解                                | 力学 | [`projectile-components`](../src/scenes/projectile-components/scene.meta.ts)                       | [详情](https://app.svgzhenli.com/resource/724243b0-b597-4b30-892c-02f52445e87c) · [封面](https://img.svgzhenli.com/gallery-assets/covers/r5hjy0ygx11775457276819.png)   |  ☐   |
|  34 | 验证机械能守恒定律实验系统                            | 力学 | [`mechanical-energy`](../src/scenes/mechanical-energy/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/accd8e75-e538-4cc8-a3a4-72f659012fb7) · [封面](https://img.svgzhenli.com/gallery-assets/covers/r1qrtw5ywfb1778949039759.png)  |  ☐   |
|  35 | 变力做功与功率图象                                    | 力学 | [`variable-work`](../src/scenes/variable-work/scene.meta.ts)                                       | [详情](https://app.svgzhenli.com/resource/3e754beb-820e-46e2-aba2-e8e2f17d53b7) · [封面](https://img.svgzhenli.com/gallery-assets/covers/yssbb3t6byf1787660702811.png)  |  ☐   |
|  36 | 改变内能的两种方式：做功和热传递                      | 热学 | [`internal-energy`](../src/scenes/internal-energy/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/a6439cdd-f64d-44a8-b9d8-6d4f58084cd2) · [封面](https://img.svgzhenli.com/gallery-assets/covers/rrffimvatn1788264065323.png)   |  ☐   |
|  37 | 牛顿第二定律瞬时性与连接体                            | 力学 | [`connected-bodies`](../src/scenes/connected-bodies/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/d1966def-ff07-4040-9a92-8797d985b5c1) · [封面](https://img.svgzhenli.com/gallery-assets/covers/aukje30n3ob1787678163979.png)  |  ☐   |
|  38 | 双绝缘绳悬挂小球在电场中的往复摆动-26广东高考物理真题 | 电磁 | [`electric-pendulum`](../src/scenes/electric-pendulum/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/90e270b2-bbed-4d9c-967a-e6f4d8525f4a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/pqk9l911k5h1787049257765.png)  |  ☐   |
|  39 | 晾衣杆模型                                            | 力学 | [`clothes-rod`](../src/scenes/clothes-rod/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/12ca103e-6862-4298-9b57-8b3328f95aa3) · [封面](https://img.svgzhenli.com/gallery-assets/covers/px0kt1tunbs1788340634002.png)  |  ☐   |
|  40 | 探究平行板电容器的电容影响因素                        | 电磁 | [`parallel-capacitor`](../src/scenes/parallel-capacitor/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/3aaa316c-7743-4227-bd36-67d32f23fc79) · [封面](https://img.svgzhenli.com/gallery-assets/covers/a67zjolohq1785689625744.png)   |  ☐   |
|  41 | 带电粒子在电场中的运动                                | 电磁 | [`charged-particle-electric`](../src/scenes/charged-particle-electric/scene.meta.ts)               | [详情](https://app.svgzhenli.com/resource/62823a71-e8e3-49b0-be65-eb1ba7b2d8b0) · [封面](https://img.svgzhenli.com/gallery-assets/covers/fym63dmvmt71787678218117.png)  |  ☐   |
|  42 | 半偏法测电表内阻                                      | 电磁 | [`half-deflection`](../src/scenes/half-deflection/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/30b53342-8600-4ce7-851c-4366ce6209df) · [封面](https://img.svgzhenli.com/gallery-assets/covers/54hw2eogglf1786794457505.png)  |  ☐   |
|  43 | 闭合电路欧姆定律 - U-I 关系与功率分析                 | 电磁 | [`closed-circuit`](../src/scenes/closed-circuit/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/879b4b52-0128-435c-afb9-9c35b4e8d281) · [封面](https://img.svgzhenli.com/gallery-assets/covers/60xlqc9vnzp1774688453394.png)  |  ☐   |
|  44 | 磁会聚与磁发散模型                                    | 电磁 | [`magnetic-convergence`](../src/scenes/magnetic-convergence/scene.meta.ts)                         | [详情](https://app.svgzhenli.com/resource/33a79259-c137-4f97-984d-d6126b974772) · [封面](https://img.svgzhenli.com/gallery-assets/covers/5i2wk7uvatj1777641500863.png)  |  ☐   |
|  45 | 追及与相遇问题动态分析                                | 力学 | [`chase-meet`](../src/scenes/chase-meet/scene.meta.ts)                                             | [详情](https://app.svgzhenli.com/resource/07c13407-f26a-4a11-8c3c-decf71ca4fe3) · [封面](https://img.svgzhenli.com/gallery-assets/covers/xznpk0fygt1786034002195.png)   |  ☐   |
|  46 | 杨氏双缝干涉实验                                      | 光学 | [`double-slit`](../src/scenes/double-slit/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/8871519e-bfd4-4084-9c91-4f42a6a1a8e4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/zpvg2ml7a1o1774773394109.png)  |  ☐   |
|  47 | 水平与斜面传送带运动学模型                            | 力学 | [`conveyor-belt`](../src/scenes/conveyor-belt/scene.meta.ts)                                       | [详情](https://app.svgzhenli.com/resource/8a4a17fa-fdd4-4e3a-85bc-775945006a7a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/4txs1m6d1z91779810843867.png)  |  ☐   |
|  48 | 一维弹性碰撞物理模型                                  | 力学 | [`elastic-collision`](../src/scenes/elastic-collision/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/b51f430f-b982-4e14-a742-99e1dc8182c4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/60zpa2whlw31774685207551.png)  |  ☐   |
|  49 | 分子间作用力与势能                                    | 热学 | [`molecular-potential`](../src/scenes/molecular-potential/scene.meta.ts)                           | [详情](https://app.svgzhenli.com/resource/1e9352bd-bd46-481d-b740-bf262ec66db2) · [封面](https://img.svgzhenli.com/gallery-assets/covers/nnnwuhrvl61779811596361.png)   |  ☐   |
|  50 | 摩擦力的分析与临界问题                                | 力学 | [`friction-critical`](../src/scenes/friction-critical/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/37ff7b7c-2115-4ac4-b881-e8d6f53e58e4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/5492ntkjlw51787678095004.png)  |  ☐   |
|  51 | 弹性碰撞与能量转换                                    | 力学 | [`elastic-energy`](../src/scenes/elastic-energy/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/36422800-f39f-4bc1-91b9-2fb4b60348ac) · [封面](https://img.svgzhenli.com/gallery-assets/covers/2c2re7vmw9x1780935461603.png)  |  ☐   |
|  52 | 半圆柱体全反射光路分析                                | 光学 | [`semicylinder-tir`](../src/scenes/semicylinder-tir/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/cf649975-ce32-48fa-83a8-637804d3555c) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ovkiqxoqqd1774772391055.png)   |  ☐   |
|  53 | 人造卫星变轨运动状态                                  | 力学 | [`satellite-transfer`](../src/scenes/satellite-transfer/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/4cda79af-496d-4a81-85af-13ee50737d70) · [封面](https://img.svgzhenli.com/gallery-assets/covers/w209gviajjs1775445909779.png)  |  ☐   |
|  54 | 斜面弹簧动力学                                        | 力学 | [`incline-spring`](../src/scenes/incline-spring/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/649f4f98-36c9-42d5-8bda-6db6bfe03f6d) · [封面](https://img.svgzhenli.com/gallery-assets/covers/mm2cyz2myec1780392093679.png)  |  ☐   |
|  55 | 电路中恒定电场的建立微观机制                          | 电磁 | [`electric-field-establish`](../src/scenes/electric-field-establish/scene.meta.ts)                 | [详情](https://app.svgzhenli.com/resource/0b3511a6-e9b0-4042-8508-b951ea929df4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/dz1uvo96r61778679292579.png)   |  ☐   |
|  56 | 单轨道金属棒切割磁感线模型                            | 电磁 | [`metal-rod-track`](../src/scenes/metal-rod-track/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/5b2be4e7-a621-4114-9967-706eee9e1f97) · [封面](https://img.svgzhenli.com/gallery-assets/covers/7igfji7njtx1774712579960.png)  |  ☐   |
|  57 | 机械波的相遇与叠加                                    | 力学 | [`wave-superpose`](../src/scenes/wave-superpose/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/29024a79-7d83-48d9-87ef-847e776dd093) · [封面](https://img.svgzhenli.com/gallery-assets/covers/so2qb3ooyba1775581778918.png)  |  ☐   |
|  58 | 圆周运动不脱离轨道临界问题                            | 力学 | [`orbit-critical`](../src/scenes/orbit-critical/scene.meta.ts)                                     | [详情](https://app.svgzhenli.com/resource/dec4b96b-2980-4f8a-b88f-c1ef707024c0) · [封面](https://img.svgzhenli.com/gallery-assets/covers/5pl59zy0y2y1781527892112.png)  |  ☐   |
|  59 | 带电粒子在有界磁场中的运动                            | 电磁 | [`bounded-magnetic`](../src/scenes/bounded-magnetic/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/b0272945-d478-4b29-92d8-7ed5a03720c3) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ahwt5m92oei1775130650446.png)  |  ☐   |
|  60 | 带电粒子在电场中的偏转                                | 电磁 | [`electric-deflection`](../src/scenes/electric-deflection/scene.meta.ts)                           | [详情](https://app.svgzhenli.com/resource/247a34a7-fa2d-4c56-b1c0-403779422cbc) · [封面](https://img.svgzhenli.com/gallery-assets/covers/3ivdj7fy8g61778498662467.png)  |  ☐   |
|  61 | 闭合电路功率与最大输出功率                            | 电磁 | [`closed-power`](../src/scenes/closed-power/scene.meta.ts)                                         | [详情](https://app.svgzhenli.com/resource/d744d643-80ca-4f95-b3f7-bb47fb67b399) · [封面](https://img.svgzhenli.com/gallery-assets/covers/7rt0ahs8u0n1787677985195.png)  |  ☐   |
|  62 | 带电粒子在匀强电场中的加速                            | 电磁 | [`uniform-electric-acceleration`](../src/scenes/uniform-electric-acceleration/scene.meta.ts)       | [详情](https://app.svgzhenli.com/resource/1d8344d7-2b30-49c0-ae9f-de580e8b2755) · [封面](https://img.svgzhenli.com/gallery-assets/covers/jui5jbjbf31778498737886.png)   |  ☐   |
|  63 | 带电粒子在交变电场中的运动                            | 电磁 | [`alternating-electric-field`](../src/scenes/alternating-electric-field/scene.meta.ts)             | [详情](https://app.svgzhenli.com/resource/32d110c8-1880-41fd-9a52-7ab7336d22c2) · [封面](https://img.svgzhenli.com/gallery-assets/covers/z73t0gaw8le1779526794304.png)  |  ☐   |
|  64 | 平行玻璃砖光线侧移折射光路                            | 光学 | [`parallel-glass-refraction`](../src/scenes/parallel-glass-refraction/scene.meta.ts)               | [详情](https://app.svgzhenli.com/resource/2ae50906-7fe3-41d8-be85-f7d684e25681) · [封面](https://img.svgzhenli.com/gallery-assets/covers/w19o4xqgc81774772588034.png)   |  ☐   |
|  65 | 自动喂水器力电综合模型                                | 力学 | [`auto-water-feeder`](../src/scenes/auto-water-feeder/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/8ec59514-aaad-4e07-ba96-2e90c78911d2) · [封面](https://img.svgzhenli.com/gallery-assets/covers/gfa9g2u0b2h1778327463371.png)  |  ☐   |
|  66 | 单摆周期与测重力加速度                                | 力学 | [`pendulum-period`](../src/scenes/pendulum-period/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/323ee669-e533-478d-9c79-0df868c14776) · [封面](https://img.svgzhenli.com/gallery-assets/covers/zj9sn1kmoyd1787660685339.png)  |  ☐   |
|  67 | 练习使用多用电表                                      | 电磁 | [`multimeter-practice`](../src/scenes/multimeter-practice/scene.meta.ts)                           | [详情](https://app.svgzhenli.com/resource/24e9c321-cea5-4ed4-81ae-62df88941846) · [封面](https://img.svgzhenli.com/gallery-assets/covers/h1cmlc5wdw81786796098226.png)  |  ☐   |
|  68 | 描绘小灯泡伏安特性曲线                                | 电磁 | [`lightbulb-iv-curve`](../src/scenes/lightbulb-iv-curve/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/be50e6e5-d500-4b39-9958-31806c9a24b3) · [封面](https://img.svgzhenli.com/gallery-assets/covers/1cy31ez6nkr1774689961939.png)  |  ☐   |
|  69 | 卢瑟福α粒子散射实验                                   | 力学 | [`rutherford-alpha-scattering`](../src/scenes/rutherford-alpha-scattering/scene.meta.ts)           | [详情](https://app.svgzhenli.com/resource/e8ba2278-112a-4948-8900-31216b3f58c4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/q8x3x00n4tc1780660891290.png)  |  ☐   |
|  70 | 焦耳的实验：做功与热传递                              | 热学 | [`joule-work-heat`](../src/scenes/joule-work-heat/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/069ea302-1375-4f36-bef8-44b82960c3f8) · [封面](https://img.svgzhenli.com/gallery-assets/covers/sskbia9w8uj1779810575424.png)  |  ☐   |
|  71 | 激光测速原理演示                                      | 力学 | [`laser-speed`](../src/scenes/laser-speed/scene.meta.ts)                                           | [详情](https://app.svgzhenli.com/resource/2f9e002d-c099-42fc-b83f-7628f019d60a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/sj6gfwtgbhq1778687180263.png)  |  ☐   |
|  72 | 地球上重力、万有引力与向心力的关系                    | 力学 | [`earth-gravity`](../src/scenes/earth-gravity/scene.meta.ts)                                       | [详情](https://app.svgzhenli.com/resource/ffc12fc9-45e2-4223-afc5-092946cc60a7) · [封面](https://img.svgzhenli.com/gallery-assets/covers/4c0y89ox0q11775666962183.png)  |  ☐   |
|  73 | 电容器充放电实验                                      | 电磁 | [`capacitor-charge-discharge`](../src/scenes/capacitor-charge-discharge/scene.meta.ts)             | [详情](https://app.svgzhenli.com/resource/6d9e7ba4-4a40-4cb5-aa02-7d7346f4d6c9) · [封面](https://img.svgzhenli.com/gallery-assets/covers/721k4gg8w181784565551029.png)  |  ☐   |
|  74 | 分子势能与分子间距离关系                              | 热学 | [`molecular-potential`](../src/scenes/molecular-potential/scene.meta.ts)                           | [详情](https://app.svgzhenli.com/resource/8a38bf5e-b513-4033-b8b9-4f7f0a9efc22) · [封面](https://img.svgzhenli.com/gallery-assets/covers/uu40wai7qbl1774716233071.png)  |  ☐   |
|  75 | 单摆动能与重力势能相互转化/机械能                     | 力学 | [`pendulum-energy`](../src/scenes/pendulum-energy/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/952deba7-9916-4da8-9aa4-365ddd5dafab) · [封面](https://img.svgzhenli.com/gallery-assets/covers/rwa23fl3hr1775495859018.png)   |  ☐   |
|  76 | 线框穿过有界匀强磁场模型                              | 电磁 | [`wire-loop-field`](../src/scenes/wire-loop-field/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/86794bed-c284-4f2a-be12-880b796afc9f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/d4qevzfja3u1781281018223.png)  |  ☐   |
|  77 | 机车恒功率启动动力学分析                              | 力学 | [`locomotive-power`](../src/scenes/locomotive-power/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/6fc21717-b4f2-4225-a369-0e7925ae6143) · [封面](https://img.svgzhenli.com/gallery-assets/covers/rho6t12btbt1776962030714.png)  |  ☐   |
|  78 | 质谱仪核心结构与原理                                  | 电磁 | [`mass-spectrometer`](../src/scenes/mass-spectrometer/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/717dd666-f6da-4cb5-810e-261c198fc004) · [封面](https://img.svgzhenli.com/gallery-assets/covers/m0afdhyqofl1777801214873.png)  |  ☐   |
|  79 | 自由落体与竖直上抛分段运动                            | 力学 | [`free-fall-throw`](../src/scenes/free-fall-throw/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/095a0852-e1c8-4425-b9a6-d3c7d1ed91db) · [封面](https://img.svgzhenli.com/gallery-assets/covers/02voej810n8x1787660765293.png) |  ☐   |
|  80 | 楞次定律：来拒去留模型                                | 电磁 | [`lenz-law`](../src/scenes/lenz-law/scene.meta.ts)                                                 | [详情](https://app.svgzhenli.com/resource/40cf9628-5a62-4d63-960b-cfa4b887d60f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/11rdbz2hj4uf1774712702243.png) |  ☐   |
|  81 | 光电效应与光控开关综合实验                            | 力学 | [`photoelectric-switch`](../src/scenes/photoelectric-switch/scene.meta.ts)                         | [详情](https://app.svgzhenli.com/resource/4c24acca-7447-43f1-8f59-31788d29e135) · [封面](https://img.svgzhenli.com/gallery-assets/covers/fsk8qb5yh671776788889861.png)  |  ☐   |
|  82 | 汽车过倾斜弯道受力状态                                | 力学 | [`car-bank`](../src/scenes/car-bank/scene.meta.ts)                                                 | [详情](https://app.svgzhenli.com/resource/1eaaa101-c4b6-4e3a-aece-608ada025c79) · [封面](https://img.svgzhenli.com/gallery-assets/covers/c3p7z605tr1774679515715.png)   |  ☐   |
|  83 | 圆锥摆核心模型探究                                    | 力学 | [`conical-pendulum`](../src/scenes/conical-pendulum/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/9aa61b49-17c1-46e0-8eba-e928f3890a20) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ifd70g3brb1776223182109.png)   |  ☐   |
|  84 | 伽利略斜面理想实验                                    | 力学 | [`galileo-incline`](../src/scenes/galileo-incline/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/82b856bd-a315-4481-8a62-122bc3627e57) · [封面](https://img.svgzhenli.com/gallery-assets/covers/huf6e5x3eyr1784222215727.png)  |  ☐   |
|  85 | 带电粒子加速与偏转叠加实验                            | 电磁 | [`charged-superposition`](../src/scenes/charged-superposition/scene.meta.ts)                       | [详情](https://app.svgzhenli.com/resource/2de0fd8c-d138-41e9-ae40-cba964246172) · [封面](https://img.svgzhenli.com/gallery-assets/covers/43xlwkw5yqq1778499119681.png)  |  ☐   |
|  86 | 静电平衡与屏蔽原理                                    | 电磁 | [`electrostatic-shielding`](../src/scenes/electrostatic-shielding/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/d996fc7c-e833-4574-a96a-8843fce3000f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/na6qne3max1778680093568.png)   |  ☐   |
|  87 | 布朗运动的微观解释                                    | 热学 | [`brownian-motion`](../src/scenes/brownian-motion/scene.meta.ts)                                   | [详情](https://app.svgzhenli.com/resource/d5ce87fa-f6ca-47d8-9ebc-798e3b15588b) · [封面](https://img.svgzhenli.com/gallery-assets/covers/e7y33b92rq1779451527221.png)   |  ☐   |
|  88 | 电子感应加速器核心原理                                | 电磁 | [`induction-accelerator`](../src/scenes/induction-accelerator/scene.meta.ts)                       | [详情](https://app.svgzhenli.com/resource/41b8e3f8-e407-4049-ae21-df76ffecf028) · [封面](https://img.svgzhenli.com/gallery-assets/covers/quxtpdphqm1776439057053.png)   |  ☐   |
|  89 | 气垫导轨动量实验                                      | 力学 | [`air-track-momentum`](../src/scenes/air-track-momentum/scene.meta.ts)                             | [详情](https://app.svgzhenli.com/resource/30745a27-9981-485b-b72e-9690ae35971c) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ej9rjo7jla1780391157072.png)   |  ☐   |
|  90 | 静电感应                                              | 电磁 | [`electrostatic-induction`](../src/scenes/electrostatic-induction/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/c45b37b4-d07a-490e-a4cb-cad3fee0eb6f) · [封面](https://img.svgzhenli.com/gallery-assets/covers/qunxd4xt4r1788662203855.png)   |  ☐   |
|  91 | 连接体受力分析 (定滑轮与斜面)                         | 力学 | [`connected-bodies-incline`](../src/scenes/connected-bodies-incline/scene.meta.ts)                 | [详情](https://app.svgzhenli.com/resource/a31fd0fe-fd06-4fbb-8e62-a7b774e31d38) · [封面](https://img.svgzhenli.com/gallery-assets/covers/tcwgq06kl21774678073161.png)   |  ☐   |
|  92 | 半圆柱体全反射与折射光路分析 (标准法线版)             | 光学 | [`semicylinder-tir-standard`](../src/scenes/semicylinder-tir-standard/scene.meta.ts)               | [详情](https://app.svgzhenli.com/resource/471bc3f0-2fce-4b58-9534-5e3926f79231) · [封面](https://img.svgzhenli.com/gallery-assets/covers/k6yhjpstio1776699773441.png)   |  ☐   |
|  93 | 带电粒子在交变电场中的偏转                            | 电磁 | [`alternating-electric-deflection`](../src/scenes/alternating-electric-deflection/scene.meta.ts)   | [详情](https://app.svgzhenli.com/resource/47ce8921-8115-4880-aedf-01d6d45f34bf) · [封面](https://img.svgzhenli.com/gallery-assets/covers/yghajqd7qk1788662185545.png)   |  ☐   |
|  94 | 速度选择器 (正交电磁场)                               | 电磁 | [`velocity-selector`](../src/scenes/velocity-selector/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/67df96c2-f523-4ea1-9bd1-ff1172659c7a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/pvc99zbafer1777456690433.png)  |  ☐   |
|  95 | 验证动量守恒定律多方案比较                            | 力学 | [`momentum-conservation-comparison`](../src/scenes/momentum-conservation-comparison/scene.meta.ts) | [详情](https://app.svgzhenli.com/resource/4e5a0575-76c9-47c4-a00e-cbafb6f1662a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/djkhjniuvkr1787678132681.png)  |  ☐   |
|  96 | 观察微小形变                                          | 力学 | [`micro-deformation`](../src/scenes/micro-deformation/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/f8a65c19-e821-4dd7-9361-c15aaa9792c4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/a2c3ql6n1c1783141912756.png)   |  ☐   |
|  97 | 光电效应：光电流与电压关系                            | 近代 | [`photoelectric-iv`](../src/scenes/photoelectric-iv/scene.meta.ts)                                 | [详情](https://app.svgzhenli.com/resource/09e26971-23a5-43ad-98e9-f30d2f35c9a8) · [封面](https://img.svgzhenli.com/gallery-assets/covers/ut2h2l6xs31774774006686.png)   |  ☐   |
|  98 | 薄膜干涉 (劈尖干涉)                                   | 光学 | [`wedge-film-interference`](../src/scenes/wedge-film-interference/scene.meta.ts)                   | [详情](https://app.svgzhenli.com/resource/00c8596b-80b6-48d1-ae88-cb2be74e80d4) · [封面](https://img.svgzhenli.com/gallery-assets/covers/jnwajo0w4c1780388996842.png)   |  ☐   |
|  99 | 系统机械能守恒定律 - 经典双球联动模型                 | 力学 | [`mechanical-energy-two-ball`](../src/scenes/mechanical-energy-two-ball/scene.meta.ts)             | [详情](https://app.svgzhenli.com/resource/61276d92-e01f-48d3-801a-417deaa8b3db) · [封面](https://img.svgzhenli.com/gallery-assets/covers/r4t0677rp61777444092560.png)   |  ☐   |
| 100 | 光电效应与反向遏止电压可视化模型                      | 电磁 | [`photoelectric-cutoff`](../src/scenes/photoelectric-cutoff/scene.meta.ts)                         | [详情](https://app.svgzhenli.com/resource/193dc98a-95b2-4b2c-a075-fb237fa76af2) · [封面](https://img.svgzhenli.com/gallery-assets/covers/3ipatk3kgs31776699728624.png)  |  ☐   |
| 101 | 锌板光电效应与能量演变                                | 电磁 | [`zinc-photoelectric-energy`](../src/scenes/zinc-photoelectric-energy/scene.meta.ts)               | [详情](https://app.svgzhenli.com/resource/d35778ae-107b-4561-a351-708ce1080f88) · [封面](https://img.svgzhenli.com/gallery-assets/covers/4x1l84gd2jm1779019084981.png)  |  ☐   |
| 102 | 放射性元素衰变规律                                    | 近代 | [`radioactive-decay`](../src/scenes/radioactive-decay/scene.meta.ts)                               | [详情](https://app.svgzhenli.com/resource/64db7ce5-3b48-4e17-b010-fe600dc4003c) · [封面](https://img.svgzhenli.com/gallery-assets/covers/vxem9n1z5zf1774800154269.png)  |  ☐   |
| 103 | 动量守恒与圆环摆球模型                                | 力学 | [`momentum-ring-pendulum`](../src/scenes/momentum-ring-pendulum/scene.meta.ts)                     | [详情](https://app.svgzhenli.com/resource/812e6908-19b9-42fd-88a8-a5609c971b6a) · [封面](https://img.svgzhenli.com/gallery-assets/covers/119bs2i7hkin1780316073649.png) |  ☐   |
| 104 | 气体分子速率分布：麦克斯韦曲线                        | 热学 | [`maxwell-speed-distribution`](../src/scenes/maxwell-speed-distribution/scene.meta.ts)             | [详情](https://app.svgzhenli.com/resource/1c57ee56-a431-4d18-a72a-2703faa5fb48) · [封面](https://img.svgzhenli.com/gallery-assets/covers/v2def9kjwz1774714986169.png)   |  ☐   |

## 已完成复审

### 1. 力的合成与分解 (`force-composition`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：动画区恢复 `960×660` 原始舞台比例，网格裁切到 `620` 绘图区；仅保留 `F₁`、`F₂`、`F合`、`Fx`、`Fy`、`G`、`G₁`、`G₂`、`θ` 等符号，数值集中在读数区；修正桌面浮动读数遮挡、移动端断点、拖拽坐标映射和 URL 全量状态同步；斜面角度与物块位置随 `15°–60°` 参数同步。
- 物理核验：合力/正交分解、斜面重力分解、端点拖拽取整与边界已由单元测试覆盖；`19` 个场景专项测试通过。
- 视觉与交互验证：`767/768/800/900/1024/1440px` 响应式矩阵无横向溢出或读数遮挡；合成、三角形、范围、正交、斜面标签/动画及播放、暂停、重置、深色主题、拖拽和刷新恢复均通过 Playwright 验证；控制台无错误。
- 工程验证：`pnpm verify:scene force-composition` 全 `7/7` 步骤通过（3137 passed，134 skipped）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/1e5fa5fb-0e00-40cd-b4c7-0ab9e2df8c5e.md` · [原始详情](https://app.svgzhenli.com/resource/1e5fa5fb-0e00-40cd-b4c7-0ab9e2df8c5e) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/f3obs9ew871780737938418.png)

### 2. 动态圆·三法破临界 (`dynamic-circle`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按源场景保持 `650×660` 基准舞台、X 磁场符号与边界几何；轨迹改为 `R=mv/|qB|` 的圆弧并在出界后沿切线延伸，磁场正负改变曲率；三角形、圆形边界与临界读数同步；移除动画区公式卡和说明句，公式/状态集中到读数区。
- 视觉与交互验证：首次复核发现 768/900px 分栏下动画被读数浮层错误压缩；Grok 修复为读数下方舞台布局。复验 `767/768/900/1024×768/1024×900/1440px` 无横向溢出、无控制台错误，动画本体在 768/900px 可读；播放/暂停、旋转圆/圆形边界切换、滑块 URL 同步与刷新恢复均通过 Playwright。
- 物理与工程验证：轨道半径、曲率符号、出界切线、三角形场域与临界半径由 `22` 个场景单测覆盖；`pnpm verify:scene dynamic-circle` 全 `7/7` 步骤通过（3140 passed，134 skipped）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/5aa418d4-7f15-48bf-9b40-2903a78a4a8d.md` · [原始详情](https://app.svgzhenli.com/resource/5aa418d4-7f15-48bf-9b40-2903a78a4a8d) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/3b63ldwj6881784565177525.png)

### 3. 回旋加速器核心结构与原理 (`cyclotron`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按解码后的 SVG 源场景保持 `640×660` 动画舞台、D 型盒/缝隙、X 磁场、U~ 源、电场箭头与动态极性；轨迹改为连续交替半圆，半径按 `R√(n/Nₘₐₓ)` 增长，达到 `Eₖₘ` 后沿左右引出通道出射；移除动画区冗余说明，公式与状态集中在控制/读数区。
- 物理核验：`Eₖₘ=q²B²R²/(2m)`（教学缩放 `40q²B²/m`）、每次过缝增加 `qU`、`T/T₀=m/(qB)`、极性每半周翻转、奇偶圈对应左右引出；覆盖边界、连续性和粒子类型。
- 视觉与交互验证：首次复核发现 `768/900px` 与 `1440px` 分栏时读数浮层遮挡 D 型盒，已改为测量浮层并自适应左侧/下方舞台；复验 `767/768/900/1024×768/1024×900/1440px` 无横向溢出、无控制台错误，3.2 秒动态截图轨迹连续且清晰；播放/暂停、粒子、B/U、显示电场、URL 同步与刷新恢复通过 Playwright。
- 工程验证：`pnpm verify:scene cyclotron` 全 `7/7` 步骤通过（3140 passed，134 skipped）；场景专项 `22` 个测试通过，构建与 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/455c88d7-71d7-4bb9-8a8b-a505a95a135f.md` · 原始 HTML `/home/tdcasual/Downloads/物理演示/高中物理全量审计/html/回旋加速器核心结构与原理.html` · [原始详情](https://app.svgzhenli.com/resource/455c88d7-71d7-4bb9-8a8b-a505a95a135f) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/dji62m8jox91774712146984.png)

### 4. 简谐横波传播状态模型 (`harmonic-wave`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按解码 SVG 源保留 `960×660` 参考坐标的动画核心（项目舞台 `960×430`），波形、质点、P 点、微移虚线、坐标轴和传播指示对齐；标题仅在浮层不遮挡时显示，说明性副标题移除；公式与数据集中在控制/读数区。
- 物理核验：`y=A sin[2π(t/T ∓ x/λ)]`，`v_y=(2πA/T)cos(phase)`，`a_y=−ω²y`，`v=λ/T`；A/λ/T 范围、左右传播、P 状态与微移时间由 `19` 个 sim 单测覆盖。
- 交互与布局修复：首轮发现分栏读数遮挡/裁切、未自动播放、相位与速度符号错误、desktop/mobile transport 按钮无回调、P 拖动后滑块不回写；已分别修复舞台浮层避让、自动播放、源方程、标准 transport API、P 控件回写和标题避让。
- 视觉与交互验证：独立 Playwright 复验 `767/768/900/1024×768/1024×900/1280×720/1440×900` 均无横向/纵向溢出、无控制台错误；波形传播、质点竖直振动、P/微移虚线清晰，读数不覆盖有效动画图形；播放/暂停冻结与恢复、左右传播、A/λ/T、显示开关、P 拖动、URL 写回与刷新恢复通过。
- 工程验证：`pnpm verify:scene harmonic-wave` 全 `7/7` 步骤通过（3145 passed，133 skipped）；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/5c95b70b-3496-4df2-8bea-a020e92bbd29.md` · 原始 HTML `/home/tdcasual/Downloads/物理演示/高中物理全量审计/html/简谐横波传播状态模型.html` · [原始详情](https://app.svgzhenli.com/resource/5c95b70b-3496-4df2-8bea-a020e92bbd29) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/oa7f9q6ecb1774685743478.png)

### 5. 法拉第圆盘发电机原理 (`faraday-disc`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按封面重建白色/米色实验卡、虚线匀强磁场区（⊗/⊙）、铜盘渐变/同心环/辐条、中心 A 与边缘 B 电刷、P 点 `v/F/ω` 矢量、开关/灯泡/检流计回路和动态电流点；补回左上实验装置标题，标题尺寸纳入响应式常量；动画区与右侧数据区分离，移除冗余说明。
- 物理核验：`E = ½BωR²`、`v̄ = ½ωR`、闭路 `I = E/R外`、`P电 = IE = M安ω`，断路电流为 0；B/ω/R/R外、旋转方向、磁场方向、闭合状态及 A/B 极性同步，预设和 URL 刷新恢复可用。
- 交互与布局验证：播放/暂停冻结与恢复、重置、顺/逆时针、B 向里/向外、闭合/断开、预设与 URL 同步通过；`1280×720` 桌面和 `390×844` 移动端无横向溢出，移动端切换“数据”页后读数可见，标题/场域/圆盘/回路/读数无重叠；控制台无错误。
- 工程验证：`pnpm verify:scene faraday-disc` 全 `7/7` 步骤通过（3136 passed，133 skipped）；独立 Playwright 浏览器审计 `2/2` 通过；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。首轮响应式契约发现标题宽度裸常量，已移入 `faradayConstants` 并复验通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/5cdaf4ca-9464-4554-b84a-caa9861a9bb7.md` · [原始详情](https://app.svgzhenli.com/resource/5cdaf4ca-9464-4554-b84a-caa9861a9bb7) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/h9i1ky6qviv1788264020500.png)

### 6. 平抛实验数据还原与轨迹分析 (`projectile-data-analysis`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按 SVG 参考图重建米白实验卡、细/粗网格、O/A/B/C/D 五个频闪点、红色抛物线、绿色 Δy 箭头、坐标轴和分力分析卡；移除超出舞台的第六点，压缩分析/公式卡，标题和舞台随浮层安全区自适应，修复 y 轴标签裁切。
- 物理核验：`x=v₀t`、`y=½gt²`、`y=gx²/(2v₀²)`、`vₓ=v₀`、`vᵧ=gt`、`v=√(vₓ²+vᵧ²)`；五点对应 `0…4T`，`Δx=v₀T`、`Δ²y=gT²`，参数范围与当前读数同步，覆盖默认值和边界夹取。
- 交互与布局验证：播放/暂停冻结与恢复、重置、轨迹分析/频闪还原、速度分解开关、参数滑块和 URL 写回通过；`1280×720` 桌面及 `390×844` 移动端无横向溢出，标题、轨迹、分析卡、读数卡不重叠，控制台无错误。
- 工程验证：`pnpm verify:scene projectile-data-analysis` 全 `7/7` 步骤通过（3124 passed，133 skipped）；独立 Playwright 桌面/移动交互审计 `1/1` 通过；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/7886d018-8006-4277-bd1c-4342c08f27e4.md` · [原始详情](https://app.svgzhenli.com/resource/7886d018-8006-4277-bd1c-4342c08f27e4) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/wjoea5u4c6e1787821850037.png)

### 7. 子弹打木块力学模型 (`bullet-block`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按封面保持光滑水平实验台面、子弹/木块、深度标注和速度箭头；移除动画区冗余副标题，v-t 图保留在图表卡，动量/能量数值集中到读数与能量区；调整图表、状态卡和深度箭头位置，浮动读数展开时自动避让。
- 物理核验：嵌入阶段采用解析相对速度积分，任意步长保持 `m·v_b+M·v_M=p₀`；最终 `v_b=v_M=v共`，`d=v₀²mM/[2f(m+M)]`，`Q=f·d=ΔEₖ`；碰撞、嵌入、共速三阶段几何连续。
- 交互与布局验证：播放/暂停、重置、参数滑块与读数展开通过；`1280×720` 桌面默认/展开/共速态无标题、图表、轨道或木块遮挡，`390×844` 移动端控制/数据页分离且无横向溢出；浏览器无错误日志。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；`pnpm verify:scene bullet-block` 全 `7/7` 步骤通过（3125 passed，133 skipped），专项单测 `6/6` 通过；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/efdbc474-2e4e-4a0d-9aa1-a3ac3a9a5262.md` · [原始详情](https://app.svgzhenli.com/resource/efdbc474-2e4e-4a0d-9aa1-a3ac3a9a5262) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/ttwrczxsemb1774681162042.png)

### 8. 验证力的平行四边形定则 (`parallelogram-rule`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-15）。
- 修复：按封面重建白纸实验台、挂点 O、F₁/F₂ 矢量、虚线平行四边形、合力 F/F′、量角器与刻度尺；动画区移除步骤卡、公式卡和冗余解释，数值/误差集中在读数区，精简控制文案；舞台改为响应式 `720×660` 并对浮动读数自动避让，移除会被 transport 覆盖的非必要轴标签。
- 物理核验：余弦定理计算 `|F|=√(F₁²+F₂²+2F₁F₂cosθ)`，平行四边形对角线与矢量分量一致；比较阶段 F′ 与 F 同点同向，大小误差 0.2%、方向误差 0.5° 按作图读数精度固定；参数边界夹取，阶段/重置/步进由专项测试覆盖。
- 交互与布局验证：画分力/作图/对比阶段切换、播放/暂停、重置、F₁/F₂/夹角滑块及 URL 写回通过；`1280×720` 默认/作图/对比与展开读数无遮挡，`390×844` 移动端动画与数据页分离且无横向溢出；浏览器无错误日志。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；`pnpm verify:scene parallelogram-rule` 全 `7/7` 步骤通过（3130 passed，133 skipped），专项单测 `11/11` 通过；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/039f55b4-fd42-490f-9947-2e4c54601684.md` · [原始详情](https://app.svgzhenli.com/resource/039f55b4-fd42-490f-9947-2e4c54601684) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/5ns9z0vm18w1783606039791.png)

### 9. 双星系统运动轨道-万有引力定律与航天 (`binary-stars`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：动画区仅保留星空、双星轨道、质心 O、连线、轨迹与可选速度/引力矢量；移除原动画画布中的“规律”卡、公式卡和重复数据，控制区与读数区承载参数和结果，文案精简；舞台改为响应式深色 `640×660` 参考坐标并为 transport/浮动读数预留安全区。
- 物理核验：`r₁=L·m₂/(m₁+m₂)`、`r₂=L·m₁/(m₁+m₂)`、`m₁r₁=m₂r₂`、`ω=√(G(m₁+m₂)/L³)`、`F=Gm₁m₂/L²`；速度切向、引力指向质心，时间步进含教学时间缩放且自动运行/暂停/重置与边界夹取由 `13` 个专项测试覆盖。
- 交互与布局验证：桌面 `1280×720` 默认/读数展开状态动画本体清晰、数据面板独立且无关键图形遮挡；移动 `390×844` 控制/数据标签分离、无水平溢出；浏览器无 console warning/error，动画区无说明性文本堆叠。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；`pnpm verify:scene binary-stars` 全 `7/7` 步骤通过（3132 passed，133 skipped），专项单测 `13/13` 通过；构建、TypeScript、ESLint、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/cf938b0c-3fba-4a89-a76f-eceaf07397f5.md` · [原始详情](https://app.svgzhenli.com/resource/cf938b0c-3fba-4a89-a76f-eceaf07397f5) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/9q4r2plqgqo1774679828854.png)

### 10. 双动式风箱工作原理演示 (`bellows`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按封面重建白/米白双气室、中央活塞、公共出风口、A/B/C/D 单向阀、红/蓝压强区与气流虚线；移除 canvas 内状态/监测/核心机制卡和重复文案，数据集中到联动监测读数区，控制文案精简；修正自动往复压强/阀门按运动方向联动，读数默认折叠并收窄装置右边界、下移出口避开 transport；窄右腔压强标签改为短文案并置于活塞杆上方。
- 物理核验：向左推动→左高压/C 排气+B 进气；向右拉回→右高压/D 排气+A 进气；自动相位不再用活塞位置符号误判；步进、暂停、重置、固定动作、参数归一化由 `10` 个 sim tests 覆盖。
- 交互与布局验证：桌面默认/展开联动监测/向右拉回无遮挡；移动端 `390×844` 控制/数据标签分离、无水平溢出；console 无错误。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；专项 `15/15`、`pnpm verify:scene bellows` `7/7`（3134 passed，133 skipped）通过，tsc/eslint、构建和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/c79a2708-0d3c-4073-a283-38fda18be645.md` · [原始详情](https://app.svgzhenli.com/resource/c79a2708-0d3c-4073-a283-38fda18be645) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/xtwc0u5essg1776333366610.png)

### 11. 匀变速直线运动 - 速度与时间关系 (`uniformly-varied-motion`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：动画区只保留水平轨道、黑色小车、红色 v / 青绿色 a 矢量与 v-t 图（网格、v=0 轴、红色已走路段、虚线预测、当前点、代数面积）；移除 canvas 右侧参数/公式/监测卡和重复标题。参数与公式进入控制区/读数区，读数默认折叠，`preferredLayout:'split-right'`，`hasGraph:false` 不另造图表卡。舞台改为独立 800×640 基准并为 transport / 浮动读数留白。
- 物理核验：`v=v₀+at`、`x=v₀t+½at²`；v-t 纵轴 -40…40、横轴 0…10；面积按 v=0 轴分段，负速度为负位移，跨零后正负三角形并存；小车位移仅教学缩放。自动运行不因 v=0 停住；t=10 可停留、超时回绕；暂停/固定帧步进/重置/参数夹取由专项测试覆盖。
- 交互与布局验证：桌面 `1280×720` 默认/读数展开、负加速至零、跨零负速度、面积开关、播放暂停与重置无数据卡叠在动画区、transport/读数不遮挡；移动 `390×844` 控制/数据标签分离、无水平溢出；console 无 error/warning。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；专项 `18/18`、`pnpm verify:scene uniformly-varied-motion` `7/7` 通过；tsc/eslint、构建和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/a0834791-f1a8-4673-aa23-4bb5f7df5271.md` · [原始详情](https://app.svgzhenli.com/resource/a0834791-f1a8-4673-aa23-4bb5f7df5271) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/gw9dhetax9f1774676803350.png)

### 12. 竖直平面内圆周运动临界状态 (`vertical-circle`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 封面重构米白网格动画区，仅保留竖直圆轨道、中心支点、绳/杆约束、小球、G、Fₙ、T、v 与简短 G_r/G_t 分解；移除 canvas 参数表、公式卡、状态和数值读数。模型、滑块、状态与公式进入标准控制区/折叠读数区，`preferredLayout:'split-right'`、`hasGraph:false`，移动端控制/数据标签分离，文案精简。
- 物理核验：采用 `v²=v₀²−2gR(1+cosθ)`、`v_top=√max(0,v_bottom²−4gR)`、`T=mv²/R−mg cosθ`；θ=0° 最高点、±180° 最低点、±90° 侧点；绳临界 `v_top=√gR`、`v_bottom=√5gR`，负约束显示松弛/脱轨，杆模型允许受压；不足能量在转折角反向，暂停/重置/拖拽/夹取均覆盖。
- 交互与布局验证：Grok Build Playwright 复核 `1280×720`、`1024×768`、`900×768`、`768×768`、`390×844`，动画与 transport/浮动读数无遮挡，控制/数据分区无横纵溢出，绳低速脱轨、杆受压、读数展开、暂停冻结、深色主题、演示模式和 URL 恢复通过；我独立复核桌面/移动端同样无溢出，console 无 error/warning，动画区无数据卡/公式卡。
- 工程验证：远程 Grok Build 明确返回 `CONSENSUS: PASS`；专项 `26/26`（sim `22` + view `4`）通过；`pnpm verify:scene vertical-circle` 全 `7/7` 步骤通过（3145 passed，133 skipped）；tsc、ESLint、构建、bundle 预算和 `git diff --check` 通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/d53c6251-b24c-4a6c-a6b9-9e104a3995b8.md` · [原始详情](https://app.svgzhenli.com/resource/d53c6251-b24c-4a6c-a6b9-9e104a3995b8) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/s3fq03sft9n1775626003953.png)

### 13. 三大性质力交互课件 (`three-forces`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按封面重构米白网格动画区，重力/摩擦力模块仅保留斜面、物块、G、FN、Ff、G₁、G₂、θ 等短符号矢量；弹力模块仅保留墙、弹簧、物块、F弹、x。移除 canvas 内侧栏、公式卡、状态卡和数值表；参数、公式、状态和数值进入标准控制区/折叠数据区，`preferredLayout:'split-right'`、`hasGraph:false`，移动端控制/数据标签分离，文案精简。
- 物理核验：`G=mg`、`G₁=G sinθ`、`G₂=G cosθ`、`FN=G₂`；静摩擦 `f=G₁≤μFN`，等号显示“临界静止”，滑动时 `f=μFN` 向上且 `a=(G₁−f)/m`；弹力采用带方向的 `F弹=−kx`，数据区同时标注大小 `|F弹|=kx`，箭头始终反抗形变；暂停/重置/拖拽/参数夹取由专项测试覆盖。
- 交互与布局验证：桌面 `1280×720`、`1024×768`、`900×768`、`768×768` 与移动 `390×844` 无横纵溢出；动画区无公式/数据面板，展开数据区仍在画布外；重力/摩擦/弹力切换、μ 静止/下滑与临界逻辑、弹簧参数、播放暂停冻结、重置、深色主题、演示模式和 URL 恢复通过；浏览器 console 无 error/warning。
- 工程验证：远程 Grok Build 两轮均明确返回 `CONSENSUS: PASS`；专项单测 `28/28`（sim `23` + view `5`）通过；与 `verify:scene` 相同目标集单线程复跑 `3148 passed / 132 skipped`，tsc、ESLint、`git diff --check`、构建和 bundle 预算通过。默认并行 `verify:scene` 的第 5 步曾随机命中无关场景 5 秒超时，目标场景测试本身无失败。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/a6e3e383-482e-4ad1-a69b-f7ddaeaf8aee.md` · [原始详情](https://app.svgzhenli.com/resource/a6e3e383-482e-4ad1-a69b-f7ddaeaf8aee) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/ihldajl8mpl1781095386830.png)

### 14. 原子核比结合能与质量数关系 (`binding-energy`)

- 状态：✅ Grok Build 审计通过（2026-09-16）。
- 修复：动画区只保留 E/A–A 曲线、坐标轴/网格、选中核素点、短核素标签与可选「聚变/裂变」方向标；移除 canvas 右侧数据/公式/状态卡和键盘说明条。数值、公式与状态进入标准控制区/折叠读数区。`preferredLayout:'split-right'`、读数默认折叠。`hasGraph:false`：曲线本身即主视觉，不另造图表卡。补 U-235 数据。U-235/U-238 右锚点上下抽离，避免 768 split-right 右缘截成 `U-23…`；y 轴标题拆成「比结合能 / E/A (MeV)」两行，Fe-56 放在峰值右下，离开标题。标签在设计框内夹紧，不靠 overflow hidden 遮挡。
- 物理核验：`E = A × (E/A)`（MeV）；Fe-56 峰值 8.79 MeV；聚变增益仅 A<56，裂变增益仅 A>56，铁峰附近为零并显示稳定巅峰。A∈[1,238]，插值有限。←/→ 按质量数整数漫游（对接全局 `step(±0.016)`）。
- 交互与布局验证：Playwright 复核 `1280×720`、`1024×768`、`900×768`、`768×768`、`390×844`（`?autoRun=0&showRegions=1`，A=56 / A=238）无横纵溢出、无 console error/warning；U-235/U-238/Fe-56 与 y 轴标题完整可读、互不覆盖；动画区无数据卡；移动端控制/数据页分离；滑块、播放暂停冻结、重置、深色主题、演示模式和 `?A=56&autoRun=0` URL 恢复通过。
- 工程验证：专项 `28/28`（sim `21` + view `7`）；tsc、ESLint、`git diff --check`、构建和 bundle 预算通过（场景页 JS 137.25 kB / 180 kB）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/56ab7ed1-01c6-4cfa-89d3-cae38e24c433.md` · [原始详情](https://app.svgzhenli.com/resource/56ab7ed1-01c6-4cfa-89d3-cae38e24c433) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/hlgy1dsu9wh1774799292161.png)

### 15. 探究加速度与力质量关系实验 (`accel-force`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：重构为纸带计时器—小车—定滑轮—槽码的米白实验动画，动画区只保留装置、运动、纸带和必要的 F/阻力/高度短标；右侧/下方数据图表独立接入标准 `split-right-graph-bottom` 图表区，移除画布内参数、公式、实时数据卡和长说明。
- 物理核验：平衡摩擦力时 `a=mg/(M+m)`、绳张力 `F=Ma`；未平衡时 `a=(mg−f)/(M+m)`、`F−f=Ma`，纸带逐差 `Δs=a(Δt)²`、`g=9.8`；a–F 与 a–1/M 模式、参数夹取、暂停/复位/记录由专项测试覆盖。
- 交互与布局验证：释放/复位/记录/清空/重新实验、模式切换、平衡摩擦力和 URL 参数通过；独立 CUA 复核 `1280×720`、`1024×768`、`900×768`、`768×768` 均使图表容器和 canvas 完整落在视口内，`390×844` 的控制/图表/数据标签分离且图表完整可见，无页面溢出；动画区无图表/数据卡，控制台新会话无 error。
- 工程验证：Grok Build 完成布局根因修复与专项测试；独立复核 graph section 在桌面高度 220px、canvas 底部预留 8px，`git diff --check`、专项单测、ESLint、TypeScript 检查通过后提交。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/fe4a9b83-9f96-4f06-9ad6-d64ebd75c515.md` · [原始详情](https://app.svgzhenli.com/resource/fe4a9b83-9f96-4f06-9ad6-d64ebd75c515) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/qgo9e87x771787678068367.png)

### 16. 单缝衍射条纹分布 (`single-slit`)

- 状态：✅ Grok Build 审计通过（2026-09-16）。
- 修复：动画区只保留激光器、单缝 a、入射光、探测屏衍射图样、绿色探测器/追踪线、θ、L 与 I/I₀ 曲线；移除 canvas 右侧参数/公式/数据卡和长文案。`preferredLayout:'split-right'`，读数默认折叠，`hasGraph:false`（曲线即主视觉）。舞台改为独立 960×660 并为 transport 下移装置。顺带把 `accel-force` 图表兜底宽高 400/200 收进常量，消除 scene-standard 裸尺寸棘轮失败。
- 物理核验：Fraunhofer `I/I₀=(sinβ/β)²`，`β=π a sinθ/λ`，β=0 连续；小角 `x₁≈λL/a`、`Δx≈2λL/a`；λ↑ / a↓ / L↑ 条纹变宽；探测器 θ 与 I 与曲线联动；autoScan 边界反转、暂停冻结、复位、URL 0/1 由专项测试覆盖。
- 交互与布局验证：独立 CUA `1280×720` 标准模式→演示模式→标准模式→演示模式往返无白屏、无曲线截断；演示模式全宽读数栏与动画区不重叠，动画区无数据卡；λ 变绿且包络变宽；移动端存在「控制/数据」标签。装置在 transport 下方完整可见。
- 工程验证：专项 `21/21`（sim 16 + view 5，含 docked-bottom 几何契约）；tsc、ESLint、`git diff --check`、构建和 bundle 预算通过（场景页 JS 140.18 kB / 180 kB）。`verify:scene` 契约集 `3142 passed / 131 skipped`。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/50754223-e2c0-405d-9098-cfa3d2fedaca.md` · [原始详情](https://app.svgzhenli.com/resource/50754223-e2c0-405d-9098-cfa3d2fedaca) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/7jar1z9ybu81774773489050.png)

### 17. 磁镜与磁约束交互 (`magnetic-mirror`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：动画区只保留两端线圈、强弱磁场线、带电粒子螺旋轨迹、必要的速度/约束力矢量和短标签；移除 canvas 内公式卡、读数卡、控制面板与长说明。公式进入折叠控制区，实时数值由框架读数区承载，`preferredLayout:'split-right'`、`hasGraph:false`，文案精简。
- 物理核验：`B/B₀=1+(Rₘ−1)|x|⁴`；`μ=mv⊥²/(2B)` 与 `Eₖ=½mv²` 守恒；`B↑⇒v⊥↑、v∥↓`，`r_g∝v⊥/B`，`d=v∥·2πm/(qB)`；`sin²θ·Rₘ>1` 才在镜点反射，逃逸锥穿出端部；方向翻转仅在越界时触发，边界有限稳定。
- 交互与布局验证：独立 CUA `1280×720` 标准→演示→标准→演示往返；演示模式 docked-bottom 读数栏与动画阶段几何避让，线圈、场线、粒子、标签完整可见，无白屏、横向溢出或 console error/warning；动画区无数据/公式卡。ResizeObserver/MutationObserver 通过 rAF 合并重绘，模式切换不复用旧几何。
- 工程验证：专项 `11/11`（sim/source `9` + view 几何 `2`）；`pnpm verify:scene magnetic-mirror` `7/7` 步骤通过（`3132 passed / 131 skipped`），tsc、ESLint、生产构建、bundle 预算和 `git diff --check` 通过（场景页 JS 133.43 kB / 180 kB）。远程 Grok Build 最终返回 `CONSENSUS: PASS`。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/c540be11-ba80-4952-8a22-570504fe1d69.md` · [原始详情](https://app.svgzhenli.com/resource/c540be11-ba80-4952-8a22-570504fe1d69) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/q2ltmtzvpg1786796521171.png)

### 18. 匀变速直线运动位移与时间关系 (`displacement-time`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 封面保留水平轨道、小车、速度箭头、v-t 有符号面积分解、x-t 抛物线与贯穿上下的金色时间游标；移除 canvas 内右侧参数、读数、公式和说明卡，数据/公式集中到框架控制区与读数区，文案精简；`preferredLayout:'split-right'`、`hasGraph:false`，曲线只留在动画区主视觉。
- 物理核验：`v=v₀+at`、`x=v₀t+½at²`；v-t 面积按 v=0 分段并保持正负位移符号，跨零时正负面积相加等于位移；小车位移为教学缩放，参数夹取、时间回绕、自动播放/暂停/固定帧/重置由专项测试覆盖。
- 交互与布局验证：标准 `1280×720` 通过 transport 顶部安全区 `transportClearY=96` 避让轨道/小车/箭头；演示 process docked-bottom 仅水平 `scaleX≤1.35` 增强动画宽度（约 430px 以上），底边保留 `16px` gap 且不遮挡读数；标准↔演示往返无白屏；移动 `390×844` 切换项目自带“移动端堆叠”后动画、控制/数据 tab 无溢出；CUA console 无 error/warning。
- 工程验证：专项 `21/21`（sim `13` + view `8`）；`pnpm verify:scene displacement-time` 全 `7/7` 步骤通过（`3142 passed / 131 skipped`）；tsc、ESLint、生产构建、bundle 预算和 `git diff --check` 通过；最终只读 Grok Build 返回 `CONSENSUS: PASS`。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/f8d783bf-0b36-425f-ae53-a692dba4aff9.md` · [原始详情](https://app.svgzhenli.com/resource/f8d783bf-0b36-425f-ae53-a692dba4aff9) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/noonxbfliw1774676556531.png)

### 19. 木块与木板相对滑动物理模型 (`block-board`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 封面重建水平无摩擦地面、蓝色木板、红色木块、速度/摩擦力箭头、刻度轴和共速标记；动画 canvas 只保留装置与必要短标签，v-t 曲线移入独立“数据图表”区，参数/公式/实时数值移入控制与读数区，文案精简；桌面采用 `split-right-graph-bottom`，演示模式与移动端保持动画、图表、控制、数据分区。
- 物理核验：滑动阶段 `a₁=-μg`、`a₂=μmg/M`；`t_c=v₀/[μg(1+m/M)]`、`v_c=mv₀/(M+m)`、`Δx=½v₀t_c`；共速后两物体保持 `v_c`，图表视窗可截断至 `3.2 s` 但不改真实 `t_c`。默认 `m=M=2、v₀=6、μ=.2` 得 `t_c=1.50 s、v_c=3.00 m/s、Δx=4.50 m`；边界 `m=.5、M=10、v₀=12、μ=.05` 得 `t_c=22.86 s、v_c=.57 m/s`。
- 交互与布局验证：URL 参数在首帧直接进入 sim（极端 URL 读数为 `t_c=22.86 s`，`autoRun=0` 保持 `t=0`）；共速标记在设计框外不绘制，长程播放时装置采用有界视觉投影并保持木块在木板可视范围，真实状态/读数不变。标准 `1280×720`、演示模式和移动 `390×844` 均通过，移动端无横向溢出；动画区无图表/数据卡，图表和数据独立呈现；浏览器无 error/warning。
- 工程验证：专项单测 `25/25`（sim `16` + view `9`）；`pnpm verify:scene block-board` 全 `7/7` 步骤通过（`3147 passed / 130 skipped`）；tsc、ESLint、生产构建、布局契约和 bundle 预算通过。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/ccd3490a-6854-4a58-942e-2dc8e81a4fd9.md` · [原始详情](https://app.svgzhenli.com/resource/ccd3490a-6854-4a58-942e-2dc8e81a4fd9) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/6pvv1payb171774685383168.png)

### 20. 示波管的原理与波形同步 (`oscilloscope`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 参考重建电子枪、Y/Y′ 与 X/X′ 偏转板、荧光屏和示波屏；动画 canvas 只保留装置、电子束和必要短标签，Uy/Ux 波形进入独立图表区，公式/参数进入控制区，实时数值进入数据区；文案精简，采用项目布局系统并保留移动端堆叠。
- 物理核验：电子束屏上位置由 Uy 与 Ux 偏转决定；扫描关闭时为竖直轨迹；扫描开启时 Ux 为锯齿扫描；波形稳定条件为 fᵧ/fₓ 为正整数，非整数显示移动；URL 参数、自动播放/暂停、边界夹取和重置由专项测试覆盖。
- 交互与布局验证：动画区无图表/数据/说明卡；移动端 `390×844` 的图表、控制、数据 tab 独立且无横向溢出；桌面 split-right / graph-bottom 与实验台的浮动数据面板均通过几何避让，不遮挡电子枪、偏转板、荧光屏和示波屏；演示模式、暗色主题和无扫描状态通过，浏览器 console 无 error/warning。
- 工程验证：专项单测 `27/27`（sim `17` + view `10`）；`pnpm verify:scene oscilloscope` 全 `7/7` 步骤通过（`3150 passed / 129 skipped`）；tsc、ESLint、生产构建、布局契约和 bundle 预算通过（场景页 JS 141.32 kB / 180 kB）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/5a841fe8-5060-47af-a132-cf4511d2d4eb.md` · [原始详情](https://app.svgzhenli.com/resource/5a841fe8-5060-47af-a132-cf4511d2d4eb) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/pfv1s8rnxzg1778497322822.png)

### 21. 打点计时器原理演示 (`ticker-timer`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 参考重建电磁打点计时器、线圈、摆臂/转轮、纸带、刻度尺与打点标记；动画 canvas 仅保留装置、纸带/打点、刻度与必要短标签，控制/公式/实时数据分别归入框架对应区域；文案精简，采用 `split-right` 与移动端堆叠布局。
- 物理核验：固定周期 `T=0.020 s`；`x=v₀t+½at²`、`v=v₀+at`（非负夹取）；中点法求瞬时速度，`Δs/T²` 测加速度；匀速、匀加速、匀减速预设与 61 点上限一致；未接通电源时禁止释放纸带并在数据区显示简短错误。
- 交互与布局验证：URL 数值/布尔参数规范化，首帧即采用 URL 初始参数，重置恢复该基线并同步控件；`autoRun=0` 保持暂停；动画区无图表、数据卡或说明段落。浏览器 `1280×720` 浅色/深色、演示模式和移动端堆叠均无溢出/遮挡；数据区实测 61 点、`3.50 m/s`、`2.50 m/s²`，console 无 error/warning。
- 工程验证：专项单测 `10/10`（sim/audit `6` + view `4`）；`pnpm verify:scene ticker-timer` 全 `7/7` 步骤通过（`3133 passed / 129 skipped`）；tsc、ESLint、生产构建、布局契约、bundle 预算与 `git diff --check` 通过（场景页 JS `132.86 kB / 180 kB`）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/0e146679-df0c-429f-b982-9e3c1c0c2367.md` · [原始详情](https://app.svgzhenli.com/resource/0e146679-df0c-429f-b982-9e3c1c0c2367) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/aorki9og3yq1783606121977.png)

### 22. 带电粒子在匀强磁场中的圆周运动 (`charged-particle-circle`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 参考重构匀强磁场 ×/·、虚线圆轨道、粒子、R 半径线、速度 v 与洛伦兹力 F 向量及短尾迹；动画 canvas 仅保留演示要素，移除左手定则说明卡、参数/公式/读数/状态文案；公式进入折叠关系区，R/T/|F| 与极简结论进入标准数据区，`split-right`、`hasGraph:false`、移动端堆叠保持项目布局。
- 物理核验：`R=mv/(|q|B)`、`T=2πm/(|q|B)` 且与 v 无关、`|F|=|q|vB`；角速度 `|q|B/m`，q 与磁场方向共同决定旋向；q=0、非法数值安全归一化，自动播放/暂停不误推进。
- 交互与布局验证：URL 初值支持数值、0/1 与 true/false 布尔值、into/out 或 0/1 方向值，第一帧即生效；速度调节使轨道半径变化，磁场方向切换改变 ×/· 与旋向，重置恢复 URL 基线并同步控件。浅色/深色、演示模式和移动端堆叠均无横向溢出；数据 tab 独立，无动画区内容泄漏；浏览器 console 无 error/warning。
- 工程验证：专项单测 `15/15`（sim `11` + view `4`）；`pnpm verify:scene charged-particle-circle` 全 `7/7` 步骤通过（`3138 passed / 129 skipped`）；tsc、ESLint、生产构建、布局契约、bundle 预算和 `git diff --check` 通过（场景页 JS `132.87 kB / 180 kB`）。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/bcf1789c-95eb-480d-9b4e-e9eb1ee6210c.md` · [原始详情](https://app.svgzhenli.com/resource/bcf1789c-95eb-480d-9b4e-e9eb1ee6210c) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/ohou8hat4jj1774711562323.png) · Grok Build 最终意见：`AGREED: charged-particle-circle is ready to commit.`

### 23. 小球落到竖直弹簧与简谐运动 (`spring-ball`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 参考重构竖直弹簧、质点、坐标轴和原长/平衡/最低点参考线；动画区只保留演示要素和必要的 v/a 矢量，x–t 曲线独立放入图表区，实时物理量放入数据区，关系式放入折叠控制区，文案精简；采用 `split-right-graph-bottom`、`hasGraph:true` 和响应式缩放。
- 物理核验：m=1 kg、k=40 N/m、g=10 m/s²，向下为正；`x₀=mg/k=0.25 m`；自由落体 `x=-h+½gt²`，接触后围绕 x₀ 简谐运动；最低点 `x底=x₀+√(x₀²+(v接触/ω)²)`。h=0 时 `x底=0.50 m、a=-g`；h=0.50 m 时 `x底≈0.81 m、a≈−22.36 m/s²`；单次模式停在最低点，连续模式按周期回绕，参数有限值夹取。
- 交互与布局验证：深色/浅色与演示模式通过；h=2x₀ 预设、自动播放/慢动作、播放暂停、重置、图表/控制/数据 tab 和 URL 初值通过。浏览器复核确认动画区无图表/数据卡，图表完整显示 h=0.50 m 的负位移自由落体段，数据读数与物理推导一致，无重叠或溢出。
- 工程验证：专项 sim/view `9/9`；`pnpm verify:scene spring-ball` 全 `7/7` 步骤通过（`3132 passed / 129 skipped`），tsc、ESLint、生产构建、布局契约、bundle 预算通过（场景页 JS `135.13 kB / 180 kB`）。最终只读 Grok Build 返回 `AGREED: spring-ball is ready to commit.`
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/75ac35a6-d777-4e05-b192-5ab524c74832.md` · [原始详情](https://app.svgzhenli.com/resource/75ac35a6-d777-4e05-b192-5ab524c74832) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/532og1b4u851788370155234.png)

### 24. 电阻测量法设计（限流、分压与电表接法） (`resistor-measurement`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-16）。
- 修复：按 SVGZhenli 参考重构电源、滑动变阻器、Rx、电流表/电压表、导线和动态电流；动画 canvas 只保留电路装置与必要短标签，移除画布内数据卡、公式卡、结论卡和误差比较图；读数进入标准数据区，公式进入折叠控制区，`hasGraph:false`，采用 `split-right` 与响应式缩放。
- 物理核验：外接电压表分流，`R测=Rx∥RV<Rx`；内接电流表分压，`R测=Rx+RA>Rx`；分压滑片 p=0 输出近零、p=1 接近 E，限流接法串联控流；Rx、RA、RV、E 与滑片有限值夹取，电压/电流/测量电阻/误差读数一致。
- 交互与布局验证：URL 0/1 和数字参数首帧生效，重置恢复进入页面基线并同步控件；内外接与分压/限流切换改变接线及读数，分压 p=0 显示 0.00 V/0.000 A，p=1 显示 6.00 V；浅色/深色、演示模式、暂停/播放、控制/数据 tab 均通过，动画区无数据/公式泄漏且无溢出重叠。
- 工程验证：专项 sim/view `11/11`；`pnpm verify:scene resistor-measurement` 全 `7/7` 步骤通过（`3134 passed / 129 skipped`），tsc、ESLint、生产构建、布局契约、bundle 预算与 `git diff --check` 通过（场景页 JS `135.65 kB / 180 kB`）。最终只读 Grok Build 返回 `AGREED: resistor-measurement is ready to commit.`
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/250ca6cd-36d9-4ed5-9983-d4a2e9058251.md` · [原始详情](https://app.svgzhenli.com/resource/250ca6cd-36d9-4ed5-9983-d4a2e9058251) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/zq29kqwn07m1781283130413.png)

### 25. 高精度测量工具读数原理（游标卡尺&螺旋测微器） (`precision-tools`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-17）。
- 修复：按 SVGZhenli 封面重构游标卡尺主尺/游标与螺旋测微器固定刻度/微分筒，主画布铺满器械和放大对齐区；动画区只保留器械、刻度、对齐基准线和短标签，移除 canvas 内读数、公式、解析和说明卡；数值与解析进入标准数据 tab，控件文案精简，采用响应式 `split-right`、`hasGraph:false`、演示模式。
- 物理核验：游标 10/20/50 分度分别为 0.10/0.05/0.02 mm（游标总长 9/19/49 mm）；螺旋测微器螺距 0.5 mm、50 格，分度值 0.01 mm，读数为主尺加微分筒格数；端点、非法值、四模式切换和刻度/对齐格有限归一化。
- 交互与布局验证：直接 URL 的 `mode=micrometer`、`caliper10` 及 `0/1/2/3` 均正确初始化；`autoRun=0` 首帧暂停，播放/暂停有效；`showGuides` 只控制基准线，`showReading` 只控制数据区解析；修改后重置恢复 URL 基线并同步模式、滑块和开关；浅色/深色、演示模式、移动窄视口均无动画区数据泄漏、遮挡或横向溢出。
- 工程验证：专项单测 `6/6 sim + 5/5 view`；`pnpm verify:scene precision-tools` 全 `7/7` 步骤通过（`3134 passed / 129 skipped`），tsc、ESLint、生产构建、布局契约、bundle 预算与 `git diff --check` 通过（场景页 JS `134.92 kB / 180 kB`）。远程 Grok Build 最终返回 `AGREED: precision-tools is ready to commit.`
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/db871107-556d-4e2f-936e-52ebd2767a54.md` · [原始详情](https://app.svgzhenli.com/resource/db871107-556d-4e2f-936e-52ebd2767a54) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/08nk6xz5mriq1778077856552.png)

### 26. 测电源电动势和内阻实验 (`emf-internal-resistance`)

- 状态：✅ Codex / Grok Build 交叉审计通过（2026-09-17）。
- 修复：动画区仅保留电源、开关、电流表、滑动变阻器、电压表与接线；电压表从开关前的电源端并联，回路线与表体分开、不再相交；U-I 图置于独立图表区并补齐数值刻度，读数在数据区，公式折叠，文案精简。
- 物理核验：理想表开路 `U=E, I=0`；有限内阻电压表 `Rv=100 Ω` 时开路 `U=E·Rv/(r+Rv), I_A=0`；闭合时理想模型 `I=E/(r+R), U=IR`，有限表模型包含 `R∥Rv` 分流并显示电流表支路电流；U-I 线截距为 `E`、短路电流为 `E/r`。测试覆盖 `E=3 V, r=1 Ω` 及有限表拟合。
- 交互与布局验证：桌面浏览器确认动画画布干净、图表刻度与坐标一致；改动开关/电压表分流后工具栏重置会同步恢复控件与 URL，重载后状态保持；理想/有限电压表开路读数分别为 `3.00 V` / `2.97 V`，电流均为 `0 A`。
- 工程验证：专项 sim/view `22/22`；`pnpm verify:scene emf-internal-resistance` 全 `7/7` 步骤通过（`3145 passed / 129 skipped`），场景结构 `120` 项、布局契约 `4` 项、ESLint、全量 TypeScript、生产构建、bundle 预算与 `git diff --check` 均通过。Grok Build 最终返回 `AGREE — ready to commit`。
- 证据：远程报告 `/home/tdcasual/Downloads/物理演示/高中物理全量审计/report/items/11ed455d-d6bc-4ac7-82a3-0a57b2ef969f.md` · [原始详情](https://app.svgzhenli.com/resource/11ed455d-d6bc-4ac7-82a3-0a57b2ef969f) · [原始封面](https://img.svgzhenli.com/gallery-assets/covers/h7646etm75j1787678239426.png)

## 复审记录模板

每完成一项，在上表勾选并在对应提交或审计记录中补充：

- 截图：桌面端 / 移动端 / 关键状态。
- 结论：通过 / 需修复；若需修复，记录问题、提交和复验结果。
- 物理核验：关键公式、边界条件、单位和数值范围。
- 视觉核验：动画区位置、比例、颜色、线宽、文字遮挡与溢出。

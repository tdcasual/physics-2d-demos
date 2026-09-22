# 高中物理课程分类映射

本表是场景目录的分类审计基线，按人教版高中物理知识体系组织。每个场景元数据都显式声明一个一级领域（`curriculumDomain`）和一个二级章节（`curriculumChapter`）；本表中的 `domain/chapter` 是其审计清单。一级领域用于首页主筛选，二级章节用于细分筛选、检索和统计。

## 分类定义

| domain             | 中文       | chapter                     | 中文               |
| ------------------ | ---------- | --------------------------- | ------------------ |
| `mechanics`        | 力学       | `kinematics`                | 运动学             |
| `mechanics`        | 力学       | `forces`                    | 力与运动           |
| `mechanics`        | 力学       | `energy`                    | 功与能量           |
| `mechanics`        | 力学       | `momentum`                  | 动量               |
| `mechanics`        | 力学       | `gravity`                   | 万有引力与航天     |
| `mechanics`        | 力学       | `oscillation-waves`         | 机械振动与机械波   |
| `electromagnetism` | 电磁学     | `electric-field`            | 电场               |
| `electromagnetism` | 电磁学     | `circuit`                   | 电路及其应用       |
| `electromagnetism` | 电磁学     | `magnetic-field`            | 磁场与带电粒子     |
| `electromagnetism` | 电磁学     | `electromagnetic-induction` | 电磁感应与交变电流 |
| `optics`           | 光学       | `geometrical-optics`        | 几何光学           |
| `optics`           | 光学       | `physical-optics`           | 波动光学           |
| `thermal`          | 热学       | `kinetic-theory`            | 分子动理论         |
| `thermal`          | 热学       | `thermodynamics`            | 热力学             |
| `modern`           | 近代物理   | `modern-physics`            | 近代物理           |
| `experimental`     | 实验与方法 | `measurement`               | 实验测量           |
| `experimental`     | 实验与方法 | `data-analysis`             | 数据处理与数学方法 |

## 场景逐项映射

| id                                 | domain           | chapter                   | 判定依据/备注                           |
| ---------------------------------- | ---------------- | ------------------------- | --------------------------------------- |
| `accel-force`                      | mechanics        | forces                    | 牛顿第二定律实验                        |
| `air-track-momentum`               | mechanics        | momentum                  | 气垫导轨动量实验                        |
| `alternating-electric-deflection`  | electromagnetism | electric-field            | 交变电场中的带电粒子                    |
| `alternating-electric-field`       | electromagnetism | electric-field            | 交变电场中的带电粒子                    |
| `ampere-balance`                   | electromagnetism | magnetic-field            | 安培力与导体平衡                        |
| `auto-water-feeder`                | experimental     | data-analysis             | 力电综合传感器模型，目标是测量/控制闭环 |
| `bellows`                          | thermal          | thermodynamics            | 大气压强应用，归入气体宏观性质          |
| `binary-stars`                     | mechanics        | gravity                   | 双星系统与万有引力                      |
| `binding-energy`                   | modern           | modern-physics            | 原子核结合能                            |
| `block-board`                      | mechanics        | forces                    | 板块相对运动、摩擦与受力                |
| `bounded-magnetic`                 | electromagnetism | magnetic-field            | 有界磁场中的带电粒子                    |
| `brownian-motion`                  | thermal          | kinetic-theory            | 布朗运动的微观解释                      |
| `bullet-block`                     | mechanics        | momentum                  | 子弹打木块动量守恒                      |
| `capacitor-charge-discharge`       | electromagnetism | circuit                   | 电容器充放电电路                        |
| `car-bank`                         | mechanics        | forces                    | 弯道向心力与受力                        |
| `centripetal-motion`               | mechanics        | forces                    | 向心力与圆周运动                        |
| `charged-particle-circle`          | electromagnetism | magnetic-field            | 匀强磁场圆周运动                        |
| `charged-particle-electric`        | electromagnetism | electric-field            | 电场中带电粒子运动                      |
| `charged-superposition`            | electromagnetism | electric-field            | 电场加速与偏转叠加                      |
| `chase-meet`                       | mechanics        | kinematics                | 追及相遇运动关系                        |
| `closed-circuit`                   | electromagnetism | circuit                   | 闭合电路欧姆定律                        |
| `closed-power`                     | electromagnetism | circuit                   | 闭合电路功率                            |
| `clothes-rod`                      | mechanics        | forces                    | 共点力平衡                              |
| `conical-pendulum`                 | mechanics        | forces                    | 圆锥摆向心力                            |
| `connected-bodies-incline`         | mechanics        | forces                    | 连接体、斜面与摩擦                      |
| `connected-bodies`                 | mechanics        | forces                    | 连接体与牛顿第二定律瞬时性              |
| `conveyor-belt`                    | mechanics        | kinematics                | 传送带相对运动                          |
| `cyclotron`                        | electromagnetism | magnetic-field            | 回旋加速器                              |
| `displacement-time`                | mechanics        | kinematics                | 匀变速位移—时间关系                     |
| `doppler-effect`                   | mechanics        | oscillation-waves         | 机械波多普勒效应                        |
| `double-slit`                      | optics           | physical-optics           | 双缝干涉                                |
| `dynamic-circle`                   | electromagnetism | magnetic-field            | 有界磁场临界问题                        |
| `earth-gravity`                    | mechanics        | gravity                   | 重力、万有引力与向心力                  |
| `elastic-collision`                | mechanics        | momentum                  | 一维弹性碰撞                            |
| `elastic-energy`                   | mechanics        | momentum                  | 弹性碰撞中的动量与能量                  |
| `electric-deflection`              | electromagnetism | electric-field            | 匀强电场偏转                            |
| `electric-field-establish`         | electromagnetism | circuit                   | 恒定电流的微观建立                      |
| `electric-pendulum`                | electromagnetism | electric-field            | 电场力与圆周运动                        |
| `electrification`                  | electromagnetism | electric-field            | 静电起电                                |
| `electrostatic-induction`          | electromagnetism | electric-field            | 静电感应与平衡                          |
| `electrostatic-shielding`          | electromagnetism | electric-field            | 静电屏蔽与高斯定理                      |
| `emf-analogy`                      | electromagnetism | electromagnetic-induction | 电磁感应水路类比                        |
| `emf-internal-resistance`          | electromagnetism | circuit                   | 电源电动势与内阻测量                    |
| `faraday-disc`                     | electromagnetism | electromagnetic-induction | 法拉第圆盘发电机                        |
| `field-lines`                      | electromagnetism | electric-field            | 电场线与电场分布                        |
| `force-composition`                | mechanics        | forces                    | 力的合成与分解                          |
| `free-fall-throw`                  | mechanics        | kinematics                | 自由落体与竖直上抛                      |
| `friction-critical`                | mechanics        | forces                    | 摩擦力临界状态                          |
| `galileo-incline`                  | mechanics        | forces                    | 伽利略斜面理想实验                      |
| `ganshe`                           | mechanics        | oscillation-waves         | 波的干涉                                |
| `half-deflection`                  | electromagnetism | circuit                   | 半偏法测电表内阻                        |
| `harmonic-wave`                    | mechanics        | oscillation-waves         | 简谐横波                                |
| `impulse-momentum`                 | mechanics        | momentum                  | 冲量—动量定理                           |
| `incline-spring`                   | mechanics        | energy                    | 斜面弹簧中的能量转换                    |
| `induction-accelerator`            | electromagnetism | electromagnetic-induction | 感生电场与电子感应加速器                |
| `interference-formula`             | optics           | physical-optics           | 双缝干涉公式                            |
| `internal-energy`                  | thermal          | thermodynamics            | 改变内能的两种方式                      |
| `joule-work-heat`                  | thermal          | thermodynamics            | 做功与热传递                            |
| `laser-speed`                      | experimental     | data-analysis             | 激光测速与位移—时间数据                 |
| `lenz-law`                         | electromagnetism | electromagnetic-induction | 楞次定律                                |
| `lightbulb-iv-curve`               | electromagnetism | circuit                   | 小灯泡伏安特性                          |
| `locomotive-power`                 | mechanics        | energy                    | 功率与牵引力                            |
| `magnetic-convergence`             | electromagnetism | magnetic-field            | 磁会聚/发散                             |
| `magnetic-mirror`                  | electromagnetism | magnetic-field            | 非均匀磁场磁约束                        |
| `mass-spectrometer`                | electromagnetism | magnetic-field            | 复合场中的带电粒子                      |
| `maxwell-speed-distribution`       | thermal          | kinetic-theory            | 气体分子速率分布                        |
| `mechanical-energy-two-ball`       | mechanics        | energy                    | 系统机械能守恒                          |
| `mechanical-energy`                | mechanics        | energy                    | 机械能守恒实验                          |
| `mechanical-wave`                  | mechanics        | oscillation-waves         | 机械波                                  |
| `metal-rod-track`                  | electromagnetism | electromagnetic-induction | 导体棒切割磁感线与安培力                |
| `micro-deformation`                | mechanics        | forces                    | 弹力与微小形变                          |
| `micrometer`                       | experimental     | measurement               | 螺旋测微仪                              |
| `molecular-potential`              | thermal          | kinetic-theory            | 分子势能与分子间距离                    |
| `momentum-conservation-comparison` | mechanics        | momentum                  | 动量守恒实验方案比较                    |
| `momentum-ring-pendulum`           | mechanics        | momentum                  | 动量与机械能双守恒                      |
| `multimeter-practice`              | experimental     | measurement               | 多用电表读数与测量                      |
| `orbit-critical`                   | mechanics        | forces                    | 圆周运动不脱离轨道临界                  |
| `oscilloscope`                     | experimental     | measurement               | 示波管与波形测量                        |
| `parallel-capacitor`               | electromagnetism | electric-field            | 平行板电容器                            |
| `parallel-glass-refraction`        | optics           | geometrical-optics        | 平行玻璃砖折射与侧移                    |
| `parallelogram-rule`               | mechanics        | forces                    | 力的平行四边形定则                      |
| `pendulum-energy`                  | mechanics        | energy                    | 单摆机械能转化                          |
| `pendulum-period`                  | mechanics        | oscillation-waves         | 单摆周期与测重力加速度                  |
| `photoelectric-cutoff`             | modern           | modern-physics            | 光电效应遏止电压                        |
| `photoelectric-iv`                 | modern           | modern-physics            | 光电效应 I—U 关系                       |
| `photoelectric-switch`             | modern           | modern-physics            | 光电效应与光控开关                      |
| `potential-energy-graphs`          | electromagnetism | electric-field            | 电势、电势能与场图像                    |
| `precision-tools`                  | experimental     | measurement               | 游标卡尺与螺旋测微器                    |
| `projectile-components`            | mechanics        | kinematics                | 平抛运动分解                            |
| `projectile-data-analysis`         | experimental     | data-analysis             | 平抛实验数据还原                        |
| `projectile`                       | mechanics        | kinematics                | 抛体运动                                |
| `radioactive-decay`                | modern           | modern-physics            | 放射性衰变与半衰期                      |
| `resistor-measurement`             | experimental     | measurement               | 伏安法测电阻接线设计                    |
| `rod-model`                        | electromagnetism | electromagnetic-induction | 导体棒切割磁感线动力学                  |
| `rutherford-alpha-scattering`      | modern           | modern-physics            | 原子核式结构                            |
| `satellite-transfer`               | mechanics        | gravity                   | 人造卫星变轨                            |
| `semicylinder-tir-standard`        | optics           | geometrical-optics        | 折射定律与全反射                        |
| `semicylinder-tir`                 | optics           | geometrical-optics        | 全反射                                  |
| `single-loop`                      | electromagnetism | electromagnetic-induction | 线框进出磁场的感应动力学                |
| `single-slit`                      | optics           | physical-optics           | 单缝衍射                                |
| `spring-ball`                      | mechanics        | oscillation-waves         | 竖直弹簧与简谐运动                      |
| `spring-oscillator`                | mechanics        | oscillation-waves         | 弹簧振子                                |
| `thin-film`                        | optics           | physical-optics           | 薄膜干涉                                |
| `three-forces`                     | mechanics        | forces                    | 重力、摩擦力与弹力                      |
| `ticker-tape`                      | experimental     | data-analysis             | 纸带数据分析                            |
| `ticker-timer`                     | experimental     | measurement               | 打点计时器原理                          |
| `tortoise-hare`                    | mechanics        | kinematics                | 运动图像                                |
| `uniform-electric-acceleration`    | electromagnetism | electric-field            | 匀强电场加速                            |
| `uniformly-varied-motion`          | mechanics        | kinematics                | 匀变速速度—时间关系                     |
| `variable-work`                    | mechanics        | energy                    | 变力做功与功率                          |
| `velocity-selector`                | electromagnetism | magnetic-field            | 正交电磁场速度选择器                    |
| `vernier-caliper`                  | experimental     | measurement               | 游标卡尺                                |
| `vertical-circle`                  | mechanics        | forces                    | 竖直圆周运动临界                        |
| `vt-integral`                      | experimental     | data-analysis             | 微元法与积分思想                        |
| `wave-superpose`                   | mechanics        | oscillation-waves         | 机械波叠加                              |
| `wedge-film-interference`          | optics           | physical-optics           | 劈尖薄膜干涉                            |
| `wedge`                            | optics           | physical-optics           | 劈尖干涉                                |
| `wire-loop-field`                  | electromagnetism | electromagnetic-induction | 线框切割磁感线                          |
| `xt-graph`                         | mechanics        | kinematics                | 位置—时间图像                           |
| `zinc-photoelectric-energy`        | modern           | modern-physics            | 光电效应能量守恒                        |

## 边界判定

- `photoelectric-*` 和 `photoelectric-switch` 统一归近代物理，避免因“电路/继电器”外壳被误归电磁学。
- `half-deflection`、`resistor-measurement`、`multimeter-practice` 的知识对象是电路，但教学目标是实验测量；本表将其归入实验与方法，便于按实验任务检索。
- `ticker-*`、`projectile-data-analysis`、`laser-speed` 的重点是实验数据采集/处理，归实验与方法；普通运动规律演示仍归力学运动学。
- `ganshe` 虽然历史 `subject` 为力学，但内容是波的干涉；机械波仍属于力学域，光的干涉才归光学波动光学。
- `bellows` 的直接现象是大气压强，按高中课程的气体宏观性质归热学热力学，而非力学。
- `auto-water-feeder` 是跨学科传感器综合模型，按可检索的主任务“测量/控制”归实验与方法数据处理。

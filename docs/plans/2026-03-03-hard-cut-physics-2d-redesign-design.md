# Hard Cut 重构设计：Physics 2D 动画平台

## 1. 背景与目标
当前仓库处于“新架构 + legacy 兼容层”并行状态：现代场景只有 `projectile`，其余场景仍依赖 iframe + `postMessage` 协议承载 legacy HTML。该状态短期可运行，但中长期会持续放大维护成本。你已明确本次改造不考虑兼容，因此设计目标不是“平滑迁移”，而是“一次性清债”。

本设计的终态目标：
1. 干净：删除所有 legacy 双轨路径与协议桥接代码。
2. 健壮：统一生命周期、参数守卫、错误处理与资源回收约束。
3. 解耦：明确分层边界，杜绝 UI/页面逻辑向物理模型反向渗透。
4. 易扩展：新增物理场景遵循固定模板，开发流程标准化。

成功标准：
1. 代码树中不再存在 `legacy-2d` 宿主页、iframe 适配器、legacy 控制器。
2. 新增场景只需复制模板并修改 `model/view`，无需修改 shell/runtime。
3. CI 门禁覆盖数值正确性、契约正确性、视觉稳定性，不再依赖脆弱全页快照。
4. 导航索引仅来源于单一注册表，无隐式同步链路。

## 2. 历史包袱与技术债诊断
### 2.1 债务分布
当前技术债集中在以下位置：
1. `animations/*.html`：5 个 legacy 场景约 5400+ 行，技术栈混杂（Tailwind CDN、React UMD + Babel、Three.js CDN）。
2. `src/app/legacy-*`：兼容层控制与协议分发逻辑约 900+ 行，字符串命令驱动，类型与演进安全弱。
3. `src/app/legacy-2d-page.ts` + `legacy-2d-adapter.ts`：运行时双轨中枢，导致任何壳层功能都要在 modern 与 legacy 两套路径重复维护。
4. 视觉回归策略：以 fullPage 截图为主，易受字体、窗口尺寸、布局高度波动影响，噪声大于信号。

### 2.2 兼容性代价（为什么必须硬切）
如果继续维护兼容层，每个新增场景都要额外承担：
1. 协议耦合成本：实现 `legacy:control` / `legacy:control-ext` 命令矩阵。
2. UI 对齐成本：主题、演示模式、读数回传在每个 legacy 场景重复实现。
3. 测试复杂度：行为问题与截图噪声交织，定位效率低。
4. 架构停滞：团队被迫在“维持双轨”与“推进新架构”之间拉扯。

该代价与“最大程度清债”目标冲突，因此本方案不保留兼容层。

## 3. 方案选型与推荐
### 方案 A（推荐）：Hard Cut 单轨重构
核心动作：删除 legacy 路径，全部场景重写为现代场景模块。

优点：
1. 债务清除最彻底，结构最干净。
2. 后续扩展心智模型统一，研发效率最高。
3. 测试体系可一次性重建为稳定门禁。

缺点：
1. 一次性改动大，需要短期集中投入。
2. 旧页面链接会失效（已接受该代价）。

### 方案 B：反腐层加厚
核心动作：保留 legacy，但引入强类型 command bus 与 adapter 插件化。

优点：
1. 改动风险相对可控。
2. 旧资源可继续利用。

缺点：
1. 债务不是清除而是封装，长期仍需维护双轨。
2. 与“不考虑兼容”目标不一致。

### 方案 C：双轨并行过渡
核心动作：新场景走 modern，旧场景慢迁移。

优点：
1. 短期交付节奏平稳。

缺点：
1. 组织与技术成本长期最高。
2. 架构复杂度持续上升。

结论：采用方案 A。

## 4. 目标架构（终态）
建议目录：

```text
src/
  kernel/                 # 纯计算：积分、随机、守卫、单位
  runtime/                # 生命周期、时钟、调度
  renderers/
    canvas2d/             # 共用 2D 渲染基元
  shell/                  # 教学页面壳层（无业务）
  scenes/
    <scene-id>/
      meta.ts
      model.ts
      view.ts
      controller.ts
      spec.ts
  catalog/                # 场景注册表（唯一事实源）
scripts/
  new-scene.ts            # 场景脚手架
```

分层规则：
1. `kernel` 禁止依赖 `runtime/shell/scenes`。
2. `model.ts` 禁止依赖 DOM 或页面对象。
3. `view.ts` 只消费快照，不修改 model。
4. `shell` 不 import 任一具体场景实现。
5. `catalog` 仅包含静态元数据，不依赖 app/shell。

## 5. 统一场景契约与数据流
### 5.1 SceneModule 契约
每个场景必须实现：
1. `meta`：标题、学科、关键词、默认参数、读数字段。
2. `createModel(params)`：物理状态与 `step(dt)`。
3. `createView(stage, mode, theme)`：渲染层。
4. `createController(bindings)`：输入参数与交互。
5. `dispose()`：资源回收。

### 5.2 参数三层模型
1. `raw params`：用户输入。
2. `validated params`：范围与单位校正。
3. `resolved params`：补默认值与派生值。

`setParams(partial)` 始终返回 `resolved params`；UI 展示 resolved 值，避免显示与仿真状态偏离。

### 5.3 标准数据流

```text
UI input -> validate/resolve params -> model.step(dt)
-> immutable snapshot -> view.render(snapshot)
-> readout emitter -> shell panel
```

关键要求：snapshot 为只读语义，杜绝 view 修改 model 的隐式耦合。

## 6. 稳定性与错误处理设计
运行时防线：
1. 参数守卫：拒绝 NaN/Infinity/越界值，回退最近合法值并提示状态。
2. 时间步防线：固定步长 + `maxSubSteps`，帧延迟时丢弃尾部积压。
3. 生命周期防线：`dispose` 幂等，确保监听器/动画帧/资源可重复清理。
4. 渲染防线：画布创建失败显示可见错误 UI，不允许白屏静默失败。
5. 统一错误上报：记录 `sceneId`、生命周期阶段、参数快照。

## 7. 测试与质量门禁重建
### 7.1 测试结构
1. Unit：`kernel/runtime/model` 数值和守卫逻辑。
2. Contract：场景契约完整性（init/reset/step/render/dispose + 幂等）。
3. Visual：稳定区域截图 + 关键行为断言，减少 fullPage 漂移。

### 7.2 CI 门禁
固定顺序：
1. `pnpm generate:index`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm test:visual`
5. `pnpm build`

### 7.3 视觉测试改造原则
1. 优先截图固定容器（stage/control panel），避免整页高度波动。
2. 保留少量基线图，增加语义断言（按钮数量、关键文本、状态值变化）。
3. 锁定 viewport、locale、timezone、字体加载策略。

## 8. Hard Cut 删除清单
以下内容直接删除，不做兼容保留：
1. `animations/**`
2. `src/app/legacy-*.ts`
3. `src/pages/legacy-2d.html`
4. legacy 协议测试与快照
5. 构建中复制 legacy 动画到 dist 的插件逻辑

## 9. 分阶段执行计划
### 阶段 1：新骨架落地（1-2 天）
1. 重组目录与模块边界。
2. 迁移 `projectile` 到新 SceneModule 契约。
3. 完成 runtime/shell 的第一轮稳定化测试。

### 阶段 2：硬删除（1 天）
1. 删除全部 legacy 文件与路由入口。
2. 更新导航生成与构建配置。
3. 清理失效测试并补齐新契约测试。

### 阶段 3：场景重建与扩展验证（2-3 天）
1. 按模板重建其余物理场景。
2. 每个场景补数值测试 + 最小视觉测试。
3. 全量门禁通过并冻结结构。

## 10. 风险与控制
主要风险：
1. 一次性删除导致短期功能真空。
2. 场景重建期间可视效果与旧版存在差异。

控制措施：
1. 以场景优先级分批重建，先保证核心教学用例。
2. 每个场景完成即过门禁，不累计大批未验证变更。
3. 通过脚手架强制结构一致，避免迁移阶段再次引入风格债。

## 11. 进入实现前的决策冻结
实现前应冻结以下决策：
1. 单一渲染后端：先统一 Canvas2D，不同时引入多后端抽象。
2. 单一场景契约：所有场景必须同接口。
3. 单一索引来源：`catalog` 为唯一事实源。
4. 零兼容保留：legacy 删除后不回滚双轨。

以上冻结点是防止重构后“半新半旧”回潮的硬约束。

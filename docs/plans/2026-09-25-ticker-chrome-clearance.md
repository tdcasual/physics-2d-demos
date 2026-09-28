# 纸带控制条让位与窄屏缩放按钮

> 状态：已执行。归档记录，不作为现行方案。

只修审计已核实的两处行为，外加一处会误导后续修改的注释。不改判分，不改双缝，不改布局选择约束，不改 `makeDraggable` 的 `stopPropagation`。

## 1. 拖动控制条后，各布局的纸带都要让开

`workspaceTapeBand`（`src/scenes/ticker-tape/scene.view.ts` 338–342 行）只在 `.lab-stage-anim` 里找 `.stage-floating-controls`。左右分栏和底部图表的舞台是 `.teaching-stage-frame` / `.srgb-stage-frame`，控制条在对应的 stage slot 里，查找结果为空，重绘后仍用 `chromeFloor: 88`。实验台会按控制条的 `offsetTop` 把纸带排到条的上方或下方。

1920×1080 实测：控制条下移到舞台内 y≈174–244 并触发重绘后，实验台墨迹顶约 40px，左右分栏仍约 90px，尺被条压住。

改法：

- 从画布向上找舞台框：`.lab-stage-anim, .teaching-stage-frame, .srgb-stage-frame, .mobile-animation-section`，再在框内找 `.stage-floating-controls`。
- 找不到、或 `offsetHeight < 1` 时，保持现在的 `{ chromeFloor: 88, bottom: height }`。
- 不要把 `.mobile-control-bar` 算进这条。它不在舞台框里，`offsetTop` 不是画布坐标。375×812 上它底边约 62px，纸带墨迹约 168px，已经分开。
- 让位算法本身不改：贴顶（`offsetTop <= 36`）从条的下沿留白；中间位置优先排到条下面，下面不够 88px 时排到条上面。
- 不给控制条加 `pointerup` 重绘。实验台现在也是等下一次 `render` 才让位；暂停时没有逐帧重绘。只扩查找范围，实验台的让位时机保持原样。不要派发 `window.resize`，也不要在 `dispose` 之外管理监听。
- 坐标继续用 `offsetTop` / `offsetHeight`。分栏里控制条的 offsetParent 是铺满舞台的 slot，和画布同一套局部坐标。

## 2. 手机上缩放按钮不要被控制条盖住

宽度不超过 720px、高度至少 640px 时，纸带数据处理把 `.stage-panzoom-controls` 挪到左上角（`data-workspace.css` 1056–1065 行）。移动端堆叠的 `.mobile-control-bar` 也在这个角，并且拉满宽度，`z-index: 40`，缩放条是 `z-index: 20`。

375×812 实测：缩放条盒子约 (6,6)–(136,50)。实验台点这个位置命中的是缩放按钮。移动端堆叠命中的是播放按钮，放大、缩小、复位点不到。纸带在舞台上半部（尺中线约 208px，舞台约 406px），右下角是空的。

改法：这条左上角规则排除 `.mobile-stack-layout`。移动端继续用默认的右下角。实验台左上角保持不动，可读性契约里「第一个 `.stage-panzoom-controls` 前面 500 字内有 ticker-tape」也不要动。不要给移动端控制条加 `pointer-events: none`，否则播放和返回也会点不到。

## 3. 注释

`src/platform/data-workspace.ts` 143–146 行写着其他布局忽略 `stageHalfSplit`。能力层和样式已经让左右分栏、底部图表、移动端堆叠都遵守。改成：高度至少 640px 时，凡是能找到舞台框的布局都上下各半，边界可拖；不设这个开关则保持该布局自己的舞台高度。

## 不做

- 不改 `?layout=` 在宽度超过 768px 时选不中移动端堆叠。这是原有约束。
- 不改 `makeDraggable` 的 `stopPropagation`。捕获阶段的舞台平移比它更早，没有依赖冒泡的 `pointerdown`。
- 不把 66px 表格、对半分割或图像分析各半再改一遍。

## 验证

- 单元：happy-dom 里画布分别放进 `.lab-stage-anim`、`.teaching-stage-frame`、`.srgb-stage-frame`，都能找到控制条；没有控制条时得到 null。不新增 pointerup 监听。
- 契约：第一个 `.stage-panzoom-controls` 仍紧挨 ticker-tape；移动端排除写在同一条规则上。
- 浏览器 1920×1080：实验台和左右分栏各把控制条下移约 160px，再走一次现有的重绘（验证时可以派发 `resize`，产品代码不派发）。重绘后两边的 `data-tape-band-y` 都避开控制条，画面 `transform` 仍是单位矩阵。
- 浏览器 375×812 移动端堆叠：对缩放按钮中心 `elementFromPoint` 得到 `.stage-panzoom-btn`，播放按钮仍能点到。
- `tests/e2e/ticker-tape-data-workspace.spec.ts` 与可读性契约、data-workspace 能力单元测试。

# 纸带工作区：上下各半、分界可拖、图像分析可先看布局

> 状态：已执行。归档记录，不作为现行方案。

状态：第五稿，复审已同意。同意之后只补了实现备注，没有改需求：even 的 CSS 选择器必须压过现有的五类选择器；尺身的 barFit 用同一套高度上限，避免尺子把空白吃掉；8px 比较的是回顾表容器和图容器；467 行那条测试在看完图像分析后要先回到数据步；删 clamp 时把可读性契约里跟着 clamp 下标切片的断言一起改掉。本文件只写需求和方案，不含实现。

范围只含打点计时器纸带（场景 id `ticker-tape`，数据任务 spec id `ticker-tape-vt`）的 lab-stage。不改判分公式，不在宿主机上更新 `*-linux.png` / `*-darwin.png`。

## 1. 需求读法

### 1.1 数据处理：动画区和下半区各一半

纸带进入数据处理后，动画区现在被收到 `clamp(240px, 28vh, 320px)`（`src/styles/capability/data-workspace.css` 775–794 行）。1080p 上舞台约 302px，其余高度给数据面板。

这次要的默认是上下各一半。下半区是数据面板，不是 v–t 图。纸带在数据处理时图是藏起来的（`src/scenes/ticker-tape/page.ts` 的 `graphInitiallyHidden: true`）。控制区已经 `display: none`（`data-workspace.css` 713 行 `.lab-control-section`）。面板插在 `.lab-stage-anim` 的下一个兄弟（`src/app/layouts/capabilities/data-workspace.ts` 82–96 行），父级是 `.lab-stage-main`。一半一半只分这一列里的舞台和数据面板。

动画区里尺子周围多出来的空白留下，给学生随后缩放纸带用。纸带字号不加大，也不在窄屏上变小。`drawTape` 现在用 `stage.responsiveScale`（`src/scenes/ticker-tape/scene.view.ts` 551 行），而 `getResponsiveScale` 用画布短边除以 400（`src/core/canvas-sizing.ts` 63–70 行）。舞台变高后，若短边跟着变高，尺、刻度和 O 会变大。数据处理步里，参与这个 scale 的高度取「真实画布高度」和「今天这段 CSS 会给舞台的高度」里较小的那个：

- 视口宽度大于 720px：今天是 `clamp(240px, 28vh, 320px)`（`data-workspace.css` 782 行）。1080p 约 302px，1280×720 是 240px。
- 视口宽度不超过 720px、且高度至少 640px：今天是 `calc(40vh - 8px)`（803–805 行）。390×844 约 330px。若这里也按 240px 封顶，字形会从现在的约 0.82 降到 0.6。

这个上限同时用于 `getResponsiveScale` 和 `drawTape` 里决定纸带、尺身高的可用高度（`scene.view.ts` 596–604 行的 `availableBars` / `barFit`）。只封字号的话，1080p 舞台从约 302px 加到约 540px 时 `barFit` 会从约 0.77 升到 1，尺身和刻度线大约再高 29%，空白就被尺子吃掉。尺身、刻度线和字号都保持今天的大小，多出来的舞台留白。

只在舞台真的被拉高时使用这个上限，也就是数据工作区、不是图像分析、视口高度至少 640px。图区画布不封顶。实验页不封顶。高度小于 640px 时舞台高度本方案不改，scale 和 `barFit` 也不封顶。

`ticker-tape` 不在 `tests/contract/scene-standard.spec.ts` 的 `LARGE_RENDER_LITERAL_EXEMPT` 里（54–71 行）。240 和 320 不要放进名字含 width、height、size、radius、font、line 的变量，也不要直接当 `fillText` / `arc` 的参数。放在名字不匹配这条规则的绑定里，例如 `tapeScaleCap`，再交给 `getResponsiveScale`。不要把 `ticker-tape` 加进豁免清单。

高度小于 640px 时不做一半一半。`.lab-stage-anim` 有 `min-height: 220px`（`src/styles/layout/lab-stage.css` 21 行），数据工作区舞台还有 `min-height: 260px`（`data-workspace.css` 756–760 行）。844×390 的一半只有约 195px，小于这些下限。这档保持现有伸缩。

### 1.2 图像分析：没有动画画布，上半只读表，下半图

图像分析不保留动画画布，也不把舞台留成半屏。现在画布和缩放按钮已经关掉（`data-workspace.css` 873–887 行），`.lab-stage-anim` 被收成 `4.5rem`（889–896 行）。这条 4.5rem 留下，不改成 0，也不把 `.lab-stage-toolbar` 搬出去。

工具条是舞台内部的绝对定位节点（`src/app/layouts/layouts/lab-stage/lab-stage.ts` 100–101 行创建，245–268 行含 `.theme-toggle-btn`）。舞台是 `overflow: hidden`（`lab-stage.css` 22 行）。844×390 的图像分析会点 `.theme-toggle-btn:visible`（`tests/e2e/ticker-tape-data-workspace.spec.ts` 1037 行）。这条视口宽度是 844，不进 `max-width: 720px` 里把 `.lab-stage-toolbar` 藏掉的规则（`data-workspace.css` 1057 行）。4.5rem 是导航条（主题、演示、布局，以及「返回数据处理 / 图像分析」），不是动画区，也不算进上下各半。这段规则和 split-right、srgb 共用，不能整段删除。

导航条之下，面板里的结构保持现在的 DOM，不搬节点：

- 标题仍是 `.data-workspace-panel` 的直接子节点，在图表舞台上面，一行，不并进各半。
- `.data-workspace-chart-stage` 里面仍是只读回顾表、分隔条、图（`data-workspace-panel.ts` 287–288、477–479 行）。各一半只指这里面的回顾表和图。
- `.data-workspace-summary` 和 `.data-workspace-result` 继续是面板的直接子节点，排在图表舞台下面（样式 369–381 行）。图像分析时逐差法 a 那一行本来就会隐藏（面板 1157–1161 行，`aDiff` 没有 `step: 'chartAnalysis'`）。`aFit` 留在图下方，作为一行页脚，不并进各半。e2e 用 `.data-workspace-panel > .data-workspace-summary` 量位置（约 1058–1065 行，以及同文件里其它直接子选择器）。

高度至少 640px、且本地没有存过图像分析比例时，回顾表和图彼此等高，高度差不超过 8px。这不是把回顾表设成图表舞台的 `50%`。现有分隔条是 `flex: 0 0 36px`（`data-workspace.css` 408–418 行），写在回顾表和图之间。若回顾表用 `flex-basis: 50%`，图只剩 `50% - 36px`，两者相差 36px，过不了 8px。默认各半的做法见 2.2。

高度小于 640px，尤其 844×390，保持现在的「回顾表贴内容、图留在首屏」（`data-workspace.css` 1120–1156 行，`max-height: min(3.5rem, 26%)`）。这档不改成各半。

### 1.3 两个环节的分界都能拖

鼠标和触屏都用 Pointer Events，`touch-action: none`。键盘上下键步长 1%，PageUp / PageDown 步长 5%。

两条分界不要合成一个控件，范围也不相同。

数据处理，只在纸带 lab-stage、高度至少 640px、且不是图像分析时出现：

- 新类名 `.data-workspace-stage-splitter`。不要复用 `.data-workspace-splitter`，否则「页面上只有一条分隔条」的定位会撞上。
- 盖在 `.lab-stage-anim` 和 `.data-workspace-panel` 的分界上，不占文档流高度（相对 `.lab-stage-main` 绝对定位）。可见线不超过 2px，点按热区不少于 44px。这样舞台和面板仍能各写 50%，高度差可以落在 8px 以内。
- 拖动范围是 `.lab-stage-main` 的 28%–72%。新分隔条自己的 `aria-valuemin` 是 28，`aria-valuemax` 是 72。这只属于这条新分隔条。
- 存储键按 `dw-stage-split-${spec.id}` 拼出。纸带的值是 `dw-stage-split-ticker-tape-vt`。读到越界值就丢掉、回到 50%，不把旧值钳进新范围。源码里不要写死 `ticker-tape`。
- 是否出现由 spec 的可选字段 `stageHalfSplit?: boolean` 决定，纸带设为 true，其它场景不设。判断放在 capability。不要加到所有 lab-stage 上。双缝没有这条分隔条，舞台高度断言保持原样。capability 和面板的源码都不要出现子串 `ticker-tape`：面板被 architecture 测试扫描（8–27 行），`ticker-tape-vt` 同样算出现。

图像分析，沿用现有 `.data-workspace-splitter`：

- 共享 `SPLIT_MIN = 0.18`、`SPLIT_MAX = 0.72` 不改（`data-workspace-panel.ts` 307–315 行）。`aria-valuemin` 保持 18，`aria-valuemax` 保持 72。Home 仍是 18，End 仍是 72。
- 盒子保持 `flex: 0 0 36px; min-height: 36px`。可读性契约用正则钉着这行（`tests/unit/data-workspace-readability-contract.spec.ts` 151–153 行）。36px 热区已经接住指针，可见线仍是 2px 的 `::before`。不把这条改成 44px，也不给它负 margin。短视口契约禁止这个媒体块里的负 margin（同文件 182–184 行）。
- 存储键仍是 `dw-split-fit-ticker-tape-vt`（spec id 在 `src/scenes/ticker-tape/data-task.ts` 44 行，拼键在面板 316 行）。`readStoredSplit` 对越界返回 null（319–332 行），继续丢弃，不钳制。下限不从 0.18 提高到 0.28，已存的 0.18–0.72 继续生效。
- 高度至少 640px、spec 打开了各半、且没有存过比例时，默认是 2.2 的各半模式，不是现在的「按表格内容」。用户一旦拖动或按键，回到现有的 manual，比例仍是 18%–72%。各半模式把 `aria-valuenow` 报成 50（落在 18–72 里，e2e 558–562 行的区间断言不用改），`aria-valuetext` 为「上下各半」，不是「按表格内容」。

播放中纸带的资格不通过（`data-task.ts` 605–608 行，原因是「请先暂停纸带播放再处理数据」），图像分析按钮保持禁用。演示模式也保持禁用。纸带没有双缝的白光或第 6 步门禁；双缝 `chartAnalysis: false`（`src/scenes/double-slit/data-task.ts` 97 行），没有这个按钮。能点的「随时」指：纸带已暂停、不在演示模式时，不必等表填完，也不必先点「数据处理」。

### 1.4 字体：只加大表格和图的数字，不动动画区

不改纸带 `drawTape` 的字号公式，并用 1.1 的高度封顶，避免舞台变高后尺子字跟着变大。

不改 1600×900 第一个媒体块里的共用字号变量（`data-workspace.css` 108–124 行）。可读性契约用 `indexOf` 取这个标题的第一段（`data-workspace-readability-contract.spec.ts` 13–26、99–104 行），并断言 `--dw-canvas-tick` 仍是 32（139 行）。纸带覆盖写在**另一个**同条件媒体块里，放在共用块之后。不要在第一个块里改 `--dw-type-input` 或 `--dw-canvas-tick`，否则双缝和契约一起变。

第二个块里的选择器必须压过 `.layout-master.is-data-workspace`（两个类）。只写 `[data-scene-id='ticker-tape']` 压不过它。沿用现有纸带前缀 `.lab-stage-layout.layout-master.is-data-workspace[data-scene-id='ticker-tape']`（776–778 行那种写法）。`--dw-canvas-*` 设在这个前缀上，图才能读到 48/40/44。

1080p（宽度至少 1600、高度至少 900）且 `[data-scene-id='ticker-tape']`：

| 位置                                             | 现在       | 方案       |
| ------------------------------------------------ | ---------- | ---------- |
| 数据表里的 `.data-workspace-input`               | 36px / 400 | 44px / 700 |
| 只读回顾表 `.data-workspace-review-table` 的数字 | 36px / 400 | 44px / 700 |
| 图的刻度数字                                     | 32 / 400   | 40 / 700   |
| 图的轴名                                         | 36 / 400   | 44 / 700   |
| 图题                                             | 40 / 600   | 48 / 700   |

图的字号来自画布上的 `--dw-canvas-*`（`scene.view.ts` 59–64 行），所以第二个媒体块把这三个变量设在纸带容器上即可。不要乘 `responsiveScale`。

不作用在汇总和结果输入上。选择器排除 `.data-workspace-summary .data-workspace-input` 和 `.data-workspace-result-field .data-workspace-input`。逐差法 a 继续走 `--dw-type-input`。图像拟合 a 继续走 `--dw-type-result-value`（1080p 为 42px）和字重 600（`data-workspace.css` 655–658 行），宽度保持 `.data-workspace-input` 的约 7rem（571–576 行）。44px 的「0.400」塞不进这个宽度。

表头、面板标题、校对按钮维持现有字号和 600。表内输入高度维持 58px（159–173 行）。44px、字重 700、上下内边距为 0 时，内容高度 58 仍大于字号。`ticker-tape-data-workspace.spec.ts` 1355–1356 行锁的是 56–60px，本方案不改高度。

更小视口不升这档。1280×720 仍是现在的 18px 档。

### 1.5 图像分析随时能进，没填完不能画图

现在两道门：

- 悬浮按钮在工作区未打开或 `chartStepReady` 为假时 disabled（`data-workspace.ts` 178–198 行），title 为「请先完成数据处理再进入图像分析」。
- `enterChartMode` 在工作区未打开时直接 return（208–209 行）。
- `setChartMode(true)` 在未就绪时 `return false`（`data-workspace-panel.ts` 565–575 行）。

改成：资格通过且不是演示模式时，按钮可点。表没填完可以点。工作区还没打开时，点击先走现有的 `enterWorkspace()`，再进入图像分析。资格不通过时按钮仍然禁用，title 仍是资格原因（纸带播放中就是暂停提示）。

`setChartMode(true)` 不再因 `chartStepReady` 拒绝。切换前仍收获草稿。

画图门禁留在入口之后：

- `chartStepReady` 为假时，`plotScatter` / `plotFit` 不写 `plotted`，不画实测点，不用理论曲线充数。描点按钮禁用，title 为「数据校对完成后才能描点」。
- 图上只留坐标轴。未就绪时中心文字用这句说明，替换现在的「点击描点」（`scene.view.ts` 929–934 行）。已经允许描点但还没点时，仍显示「点击描点」。
- `scene.view.ts` 不读取数据会话。是否允许描点由 `scene.entry.ts` 决定，再传给 view 一个布尔值。`page.ts` 的描点按钮（117–186 行）按这个状态禁用。取 spec 时要防数据任务模块还没加载完。
- 选填 aDiff 空着仍不算未完成。已经描过之后数据被改，沿用「数据已改」，不放宽。

这是共用能力上的入口变化。纸带和单测里的运动学宿主都变成「能进布局、不能提前描点」。双缝没有这个按钮。

## 2. 方案

### 2.1 数据处理的可拖分界

分隔条插在 `.lab-stage-anim` 和 `.data-workspace-panel` 之间。

- 仅 `stageHalfSplit === true` 的 lab-stage、高度至少 640px、非图像分析。场景名不写进 capability，见 1.3。
- 无存储比例时，舞台 `flex: 0 0 50%`，面板 `flex: 1 1 auto; min-height: 0; max-height: none`。这条规则的选择器必须压过 `data-workspace.css` 756–760 行的 `min-height: 260px` 和 `lab-stage.css` 的 `min-height: 220px`，否则 28% 在 640px 高的视口上会被下限挡住。图像分析时这条不生效，舞台仍是 4.5rem。
- 去掉纸带数据步的 `height: clamp(240px, 28vh, 320px)` 以及配套的 `min-height: 240px`。宽屏这条和窄屏的 `40vh - 8px` 都只留在 `drawTape` 的 scale 上限里，见 1.1。
- 窄屏 `max-width: 720px` 且 `min-height: 640px` 里，只删 `height` / `min-height` / `max-height: calc(40vh - 8px)` 那三行（803–805 行）。同块里把缩放按钮挪到左上角的规则留下（809–817 行）。
- `.lab-stage-main` 今天没有定位（`lab-stage.css` 10–16 行）。给它加上 `position: relative`，分隔条的包含块就是这一列。不要依赖外层 container 碰巧也是 `position: relative`（`lab-stage.ts` 87 行）。
- 分隔条绝对定位，不占流内高度。可见线不超过 2px，热区不少于 44px。比例写舞台的 flex-basis，范围 28%–72%。存储键是 `dw-stage-split-${spec.id}`，纸带上即 `dw-stage-split-ticker-tape-vt`。
- `drawTape` 的 scale 上限和 `barFit` 所用高度按 1.1 的两档计算，变量名避开 scene-standard 的尺寸词。判定用容器上的 `is-data-workspace`，并且没有 `is-data-workspace-chart`，并且视口高度至少 640px。
- 退出数据处理或进入图像分析时隐藏这条分隔条。

1080p 不再要求舞台 240–320px，也不再要求舞台 ≤ 视口的 40%（e2e 1235–1242 行，对所有高度 ≥ 640 的视口生效，包括 390×844）。改为：高度 ≥ 640 且没有存过舞台比例时，舞台与面板高度差不超过 8px。其中宽度 ≥ 1600 且高度 ≥ 900 时，还要求 x、Δx 两行输入在 `scrollTop === 0` 时完整落在视口内。

### 2.2 图像分析的各半

- 画布继续隐藏，缩放按钮继续不显示。舞台继续 `flex: 0 0 4.5rem`。不把高度收成 0，不搬工具条，不改共用规则。
- 不搬 `.data-workspace-summary` 和 `.data-workspace-result`。各一半指 `.data-workspace-chart-stage` 里面的回顾表和图。标题在上，aFit 页脚在下，都不计入这两块。
- 面板和 capability 的源码（含注释）都不得出现 `tests/unit/data-workspace-architecture.spec.ts` 8–27 行里那些场景词；面板会被 `not.toContain` 扫到，`ticker-tape` 是子串。在 `DataWorkspaceSpec`（`src/platform/data-workspace.ts` 120 行附近）加可选布尔字段 `chartEvenSplit`。纸带的 `data-task.ts` 设为 true。运动学单测的 spec 不设，仍是 content。面板只读这个布尔值：为 true、`window.innerHeight >= 640`、且 `readStoredSplit()` 为 null 时，把 `data-split-mode` 设为 `even`，不写 `--dw-split`，也不写 localStorage。`aria-valuenow` 为 50，`aria-valuetext` 为「上下各半」。字段缺省是 content，所以 happy-dom 里 innerHeight 即便 ≥ 640，现有运动学用例也不进入 even。
- CSS 只在 `min-height: 640px` 里让 `even` 的回顾表和图都 `flex: 1 1 0; min-height: 0`，中间仍是 36px 的流内分隔条。两块因此等高。高度差比较的是 `.data-workspace-review` 和 `.data-workspace-chart` 这两个容器，不超过 8px。不要去比容器里面的 canvas 或 `.lab-float-graph`，描点条和内边距会让画布矮一截。其它场景、以及已有存储比例时，仍走现有的 content 或 manual。
- 选择器必须压过现有的回顾表规则（`data-workspace.css` 383–399 行，`flex: 0 0 auto; max-height: 72%`）和图规则（443–458 行，`flex: 1 1 auto`）。只写 `.data-workspace-chart-stage[data-split-mode='even']` 压不过。用 `.lab-stage-layout.layout-master.is-data-workspace.is-data-workspace-chart .data-workspace-chart-stage[data-split-mode='even']` 这种前缀。不靠场景 id。只有 `chartEvenSplit` 的 spec 会写上 `even`。
- 用户拖动或按键后离开 `even`，进入现有 manual。比例算法、18%–72%、存储键都不改。manual 下回顾表仍是 `flex-basis: var(--dw-split)`，图会比「比例 × 舞台高度」少 36px。这是现有拖动语义，默认各半不使用它。
- 高度 < 640：JS 不设 `even`。若属性因缩放残留，520px 媒体块里的 `:not([data-split-mode='manual'])` 仍会把回顾表收到 `min(3.5rem, 26%)`。JS 在高度掉到 640 以下、且用户没拖过时，把 mode 改回 `content`，避免读屏还说上下各半。
- 844×390 的现有断言不改：首屏能看到图和描点条，分隔条 margin 非负、高度至少 32px，Home 键仍是 18。

### 2.3 字体

见 1.4。覆盖块放在共用 1600×900 块之后。

### 2.4 入口和画图

见 1.5。

`tests/unit/data-workspace-architecture.spec.ts` 50 行现在要求 capability 源码含有「请先完成数据处理」。这句 title 要换成资格原因或「进入图像分析环节」，断言一起改。运动学宿主那条「未填完就点图像分析、期望停在数据步」的测试也要改成能够进入（`data-workspace-capability.spec.ts` 约 200–218 行）。

## 3. 要改的测试

- `tests/e2e/ticker-tape-data-workspace.spec.ts`
  - 约 403–407 行：暂停后、表未填完时按钮可点，不再要求 title「请先完成数据处理」。点进后有只读表和图框、没有舞台画布，描点禁用，中心说明是「数据校对完成后才能描点」，再点回到数据处理。主题按钮仍可点。
  - 约 467–475 行：未提交的 x 草稿仍要先收获。点击后进入图像分析，而不是停在数据步并把按钮禁用。描点仍然禁用。这段后面从 477 行起要改数据表，图像分析里表是隐藏的，所以断言完布局后要点「返回数据处理」，再做后面的校对。498 行附近要求 `aria-pressed="true"` 的那一下，发生在已经回到数据步之后。
  - 约 520–589 行：这段跑在 Playwright 默认 1280×720（高度 ≥ 640）。初次进入是 `data-split-mode="even"`，不是 `content`。`aria-valuemin` 仍是 18，`aria-valuemax` 仍是 72，`aria-valuenow` 为 50。没有 `--dw-split`，`dw-split-fit-ticker-tape-vt` 仍是 null。回顾表和图的高度差不超过 8px。`aria-valuetext` 为「上下各半」。删掉 575–589 行「回顾表高度贴近表格内容、差值小于 40px」：各半后回顾表大约 250px，表本身大约 4 行，这条必然失败。607–611 行只比较上下位置，各半后仍然是表、分隔条、图、汇总从上到下，保持不动。
  - 约 617–620 行和 646 行的 `expectSideBySide` 保持 `data-graph-cols=2`。可见高度门槛是 `GRAPH_WIDE_SHORT`（`scene.view.ts` 31、78 行，168px）。按现在的面板内边距，1280×720 各半后可见高度约 180px。实现时不要再给图区加内边距或工具条，把可见高度压到 168 以下。不改成单列，也不为此放弃各半。1920×1080 的并排（约 749 行）同样保持 2。
  - 约 705–718 行：从 `even` 按 ArrowDown 后进入 manual，读数仍在 18–72。不要把这里的下限改成 28。
  - 约 750–768 行：只在 1920×1080 把纸带图的字号改为 48/40/44，回顾表数字 44px 且字重 700。面板标题仍是 52px / 600。1280×720 的 18px 档不动。`typeTargetsFor`（同文件 39–71 行）是 1600 档的来源，四视口测试 1266 行起也读它。只改这一档的 `input`、`review`、`canvasTitle`、`canvasTick`、`canvasAxis`。`table`、`title`、`button`、`status` 保持，因为表元素字号仍是 `--dw-type-table`，标题和按钮不加大。数据步里第一个 `.data-workspace-input` 是表内 x，变成 44px 是预期。
  - 约 773–795 行：aFit 仍须满足 `scrollWidth <= clientWidth + 2`。不把 44px 用到 aFit。
  - 约 883 行之后的 844×390：首屏图、描点条、汇总直接子节点、分隔条非负 margin、高度至少 32px，全部保持。
  - 约 1080–1084 行：这段已经在 844×390 里。Home 仍断言 18，End 仍断言 72。不要改成 28。
  - 约 1235–1242 行：删掉「舞台 ≤ 视口 40%」和「1080p 舞台 240–320px」。高度 ≥ 640 改为默认各半，高度差不超过 8px。1600×900 以上还要求 x、Δx 两行在视口内。输入高度 1355–1356 行保持 56–60px。
- `tests/unit/data-workspace-capability.spec.ts` 约 200–218 行：未填完时点击图像分析进入 `is-data-workspace-chart` 并收养图。资格不通过时按钮仍禁用。
- `tests/unit/data-workspace-architecture.spec.ts` 50 行：不再要求源码含有「请先完成数据处理」。
- `tests/unit/data-workspace-generic.spec.ts` 约 561–580 行：未填完时 `setChartMode(true)` 返回 true，步骤变为 `chartAnalysis`。约 705–950 行把 18–72 写死的断言保持不变。
- `tests/unit/data-workspace-readability-contract.spec.ts`
  - 不再要求 CSS 含有 `height: clamp(240px, 28vh, 320px)`。这条公式改在 view 的 scale 计算里，若单测要锁，锁的是计算而不是这段 CSS。同文件约 191–193 行用 `slice(clampAt, clampAt + 400)`，clamp 删掉后 `clampAt` 会是 -1，这条一起改掉。纸带选择器前缀 `[data-scene-id='ticker-tape']` 仍要留在缩放按钮挪到左上角的规则上，不要连这句断言一起删掉。
  - 第一个 1600×900 块里的 `--dw-canvas-tick: 32` 以及其余共用变量保持不变。
  - `.data-workspace-splitter` 继续是 `flex: 0 0 36px; min-height: 36px`。
  - `max-height: 520px` 块继续禁止负 margin，继续含有 content / manual 的现有声明。纸带的 `even` 不写进这个块。

触控拖动用 Pointer Events 单测或组件测试覆盖新舞台分隔条的 `touch-action: none` 和比例变化。Playwright 的触摸接口不能稳定地拖，不在 e2e 里假装拖过。

## 4. 明确不做

- 不改 Δx、v、a 的判分和有效位数规则。
- 不改动画区尺、刻度、O、说明的绘制公式；只用 1.1 的高度封顶避免舞台变高后字形变大。
- 不把双缝舞台改成 50%，不把新分隔条加到非 `ticker-tape-vt` 的场景。
- 不把图像分析分隔条的下限改成 0.28，不把它的热区改成 44px，不给它负 margin。
- 不把 `.data-workspace-summary` 或 `.data-workspace-result` 搬进图表舞台。
- 不把舞台高度收成 0，不搬 `.lab-stage-toolbar`。
- 不把表内输入高度改到 72px。
- 不把 `ticker-tape` 加进 `LARGE_RENDER_LITERAL_EXEMPT`。
- 不在面板或 capability 的源码里写死 `ticker-tape`。舞台分隔条的存储键用 `dw-stage-split-${spec.id}` 拼出来。
- 不在这台 Linux 宿主机上更新视觉基线。默认页截图不进数据处理，1440×900 也不进 1600 字号档。
- 不让未完成的数据描出点或拟合线。
- 不把 aDiff 从数据处理步里拿掉。

## 5. 验收

1920×1080，纸带，lab-stage，已暂停：

1. 打开数据处理、不填表：动画区与数据面板高度差不超过 8px。鼠标拖舞台分界后松手，比例保持。页面不跟着滚。尺子的字号与舞台高约 302px 时一致。
2. x、Δx 两行在默认分割、`scrollTop === 0` 时完整可见。表内输入和图上刻度数字为 700 字重，且大于改动前。aFit 输入不被裁切，高度仍在 56–60px。
3. 未填表时，「图像分析」可点，包括还没打开数据处理的时候。进入后没有舞台画布。4.5rem 导航条还在，主题按钮可点。`.data-workspace-review` 与 `.data-workspace-chart` 的高度差不超过 8px。标题在表上方，aFit 在图下方，这两行不计入那 8px。描点禁用，图上没有实测点，中心文字是「数据校对完成后才能描点」。播放中按钮仍禁用。
4. 填完并校对后，描点可用，点下去才出现点。数据处理步仍能填写逐差法 a。

844×390：图像分析仍能在首屏看到图和描点条。这档不按各半验收。分隔条 Home 仍是 18。只读表按行撑开，不再被收到只剩表头。

## 6. 只读表行高

图像分析的只读表曾扁成一行字：单元格自己写了 `font-size: var(--dw-type-review)`，44px 只落在 `table` 上；上下内边距是 `0.02rem`。1080p 实测每行 43px、字号 36px，外框 410px 里表只有 172px。844×390 的 `max-height: min(3.5rem, 26%)` 把外框收到 37px，只剩表头。

修复只改纸带的回顾表，不改各半外框，也不把行拉高去填满上半区：

- 视口高度至少 640px：`th`/`td` 高 44px，和这一档的数据输入框一样，字在格里垂直居中。
- 1600×900：格子高 58px，字号 44px、字重 700。这条写在 44px 规则之后，避免被同特异性的矮规则盖住。
- 高度小于 520px：纸带的 content 回顾表不再用 3.5rem 上限，按紧凑行撑开，表头和 x、Δx、v 都能看见。图仍在这张表下面。手动拖过的比例保持原样。

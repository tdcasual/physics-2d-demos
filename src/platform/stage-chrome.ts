/**
 * 舞台 chrome 自标契约。
 *
 * 会成为 animation/stage slot 直接子节点的 chrome（transport 浮条、
 * readout 面板、panzoom 控件、演示模式过继的图表段等）必须在创建点
 * 打上此属性。它是 JS（stage-panzoom wrap 跳过判断）与 CSS（split-right
 * 的 slot 子元素撑满规则 `:not(canvas):not([data-stage-chrome])`）的
 * 单一事实源——不再维护两份类名豁免名单。
 *
 * `.stage-viewport` 不打标（自有 position:absolute; inset:0，撑满规则
 * 对它无害）；挂在 container 而非 slot 的 chrome（mobile-control-bar 等）
 * 与场景内容（canvas、仪器 host）不在本契约范围。
 *
 * 放在 platform 而非 standards.ts：后者是教学渲染 token，本契约是
 * 布局/chrome 结构约定。
 */
export const STAGE_CHROME_ATTR = 'data-stage-chrome';

export const STAGE_FRAME_ATTR = 'data-stage-frame'; // 舞台外层 frame（工作区面板插到它后面）
export const GRAPH_SECTION_ATTR = 'data-graph-section'; // 被收养/过继的那一层图区
export const GRAPH_BODY_ATTR = 'data-graph-body'; // 图区内容体（场景描点工具条锚点）
export const STAGE_TOOLBAR_HOST_ATTR = 'data-stage-toolbar-host'; // 舞台工具条宿主
export const READOUT_SLOT_ATTR = 'data-readout-slot'; // 读数挂载点
export const PANZOOM_PAN_IGNORE_ATTR = 'data-panzoom-pan-ignore'; // 只挡平移、不挡滚轮
/**
 * lab-stage 实验数据浮窗内的数据插槽（lab-stage.ts 创建点打标）。
 * 场景数据面板（projectile-components / mechanical-energy 等）经
 * findXxxDataHost 定位此锚点挂载数据表——正式契约，stage-chrome-contract
 * 兜底，布局改名会跑测试。
 */
export const LAB_DATA_SLOT_ATTR = 'data-lab-data-slot';

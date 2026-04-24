/**
 * 演示配置系统 — 平台层共享契约
 *
 * 每个场景声明自己的演示偏好（"我想要什么"），
 * 布局母版决定怎么实现（"我怎么给你空间"），
 * 场景 view 决定怎么画（"我怎么放大内容"）。
 *
 * 放在 platform 层以避免 app/scenes 循环依赖。
 */

/** 控制面板策略 */
export type DemoControlStrategy =
  | 'hidden' // 完全隐藏，通过浮动控制条操作
  | 'collapsed' // 折叠为标题栏，点击展开
  | 'minimal' // 只显示场景指定的高频控件
  | 'full'; // 保持完整控制面板

/** 读数面板策略 */
export type DemoReadoutStrategy =
  | 'hidden' // 不显示读数
  | 'overlay' // 叠加在动画区上方（半透明背景）
  | 'docked-top' // 固定在动画区上方，占整行
  | 'docked-bottom'; // 固定在动画区下方，占整行

/** 图表区策略 */
export type DemoGraphStrategy = 'hidden' | 'collapsed' | 'visible';

/** 渲染提示（传给场景 view） */
export interface DemoRenderHints {
  /** 内容缩放倍率（相对于标准模式） */
  contentScale: number;
  /** 字体额外缩放（覆盖 contentScale） */
  fontScale?: number;
  /** 线条额外缩放（覆盖 contentScale） */
  strokeScale?: number;
  /** 标记点额外缩放（覆盖 contentScale） */
  markerScale?: number;
  /** 场景自定义参数，view 自行消费 */
  custom?: Record<string, unknown>;
}

/** 交互提示 */
export interface DemoInteractionHints {
  /** 触摸目标最小尺寸（px），布局负责放大控件 */
  touchTargetMinSize?: number;
  /** 演示时可见的控件 key 列表（供 minimal 策略使用） */
  visibleControlKeys?: string[];
}

/** 场景演示配置（场景作者编写） */
export interface SceneDemoProfile {
  /** 控制面板策略 */
  controlPanel: DemoControlStrategy;
  /** 读数面板策略 */
  readoutPanel: DemoReadoutStrategy;
  /** 图表区策略 */
  graphPanel?: DemoGraphStrategy;
  /** 渲染提示（传给 view） */
  renderHints: DemoRenderHints;
  /** 交互提示 */
  interactionHints?: DemoInteractionHints;
}

/**
 * 仪器组件库 — 通用接口合约
 *
 * 设计原则：
 * - 不绑定具体渲染技术（当前 Canvas 2D，未来可扩展）
 * - Sim 与 View 完全解耦，场景自由组合
 * - 支持单一仪器场景和组合场景（通过 Viewport）
 */

import type { TeachingTheme } from '../../platform/standards';

// ───────────────────────────────────────────────
// 参数与状态
// ───────────────────────────────────────────────

/** 仪器参数基接口 — 每个仪器扩展此接口定义自己的参数 */
export interface InstrumentParams {
  readonly [key: string]: unknown;
}

/** 仪器状态基接口 — 每个仪器扩展此接口定义自己的状态 */
export interface InstrumentState {
  readonly [key: string]: unknown;
}

// ───────────────────────────────────────────────
// 模拟器（Sim）
// ───────────────────────────────────────────────

/**
 * 仪器模拟器接口
 *
 * 职责：管理仪器的内部状态、参数更新、物理/逻辑步进
 * 不感知任何渲染或 DOM 细节
 */
export interface InstrumentSim<
  State extends InstrumentState,
  Params extends InstrumentParams,
> {
  /** 获取当前状态快照（只读） */
  getState(): State;

  /** 设置参数 — 部分更新，未提供的字段保持原值 */
  setParams(params: Partial<Params>): void;

  /** 执行一个逻辑/物理步进（dt: 毫秒） */
  step(dt: number): void;

  /** 重置到初始状态（由 createSim 时的 initial 参数决定） */
  reset(): void;
}

// ───────────────────────────────────────────────
// 视口
// ───────────────────────────────────────────────

/**
 * 仪器视口 — 描述仪器在宿主画布上的局部绘制区域
 *
 * 组合场景使用：一个 Canvas 分割为多个区域，每个仪器独占一个区域
 * 单一仪器场景：不设置 viewport，仪器占满整个画布
 */
export interface InstrumentViewport {
  /** 左上角 x 坐标（像素） */
  x: number;
  /** 左上角 y 坐标（像素） */
  y: number;
  /** 绘制区域宽度（像素） */
  width: number;
  /** 绘制区域高度（像素） */
  height: number;
}

// ───────────────────────────────────────────────
// 渲染器（View）
// ───────────────────────────────────────────────

/**
 * 仪器渲染器接口
 *
 * 职责：将仪器状态绘制到 Canvas
 * 通过 setViewport 支持在局部区域绘制（组合场景）
 */
export interface InstrumentView<State extends InstrumentState> {
  /** 渲染给定状态 — View 内部负责处理视口裁剪和坐标变换 */
  render(state: State): void;

  /** 宿主 Canvas 尺寸变化时调用 */
  resize(): void;

  /** 切换主题 */
  setTheme(theme: TeachingTheme): void;

  /**
   * 设置绘制区域
   * 组合场景调用此方法让仪器在 Canvas 的局部区域绘制
   * 单一仪器场景通常不调用（或传入占满全屏的 viewport）
   */
  setViewport(viewport: InstrumentViewport): void;

  /** 清理资源（动画帧、事件监听等） */
  dispose(): void;
}

// ───────────────────────────────────────────────
// 元数据
// ───────────────────────────────────────────────

/** 仪器分类 */
export type InstrumentCategory = 'measurement' | 'electronics' | 'optics' | 'mechanics';

/**
 * 仪器元数据
 *
 * 用于场景注册、控制面板生成、目录展示等
 */
export interface InstrumentMeta<Params extends InstrumentParams> {
  /** 唯一标识，如 'micrometer' */
  id: string;

  /** 显示名称，如 '螺旋测微器' */
  title: string;

  /** 分类 */
  category: InstrumentCategory;

  /** 一句话描述 */
  description: string;

  /** 默认参数 — 场景未提供参数时使用 */
  defaultParams: Params;

  /** 测量单位，如 'mm'、's'、'°' */
  unit?: string;

  /** 精度（最小分度值） */
  precision?: number;
}

// ───────────────────────────────────────────────
// 工厂
// ───────────────────────────────────────────────

/**
 * 仪器工厂 — 每个仪器的唯一入口
 *
 * 场景通过工厂创建 Sim 和 View 实例：
 * ```ts
 * const sim = micrometer.createSim({ reading: 0 });
 * const view = micrometer.createView({ canvas, theme });
 * ```
 */
export interface InstrumentFactory<
  State extends InstrumentState,
  Params extends InstrumentParams,
> {
  /** 仪器元数据 */
  meta: InstrumentMeta<Params>;

  /** 创建模拟器实例 */
  createSim(initial: Params): InstrumentSim<State, Params>;

  /** 创建渲染器实例 */
  createView(options: {
    /** 宿主 Canvas 元素 */
    canvas: HTMLCanvasElement;
    /** 当前主题 */
    theme: TeachingTheme;
    /** 可选：局部绘制区域（组合场景使用） */
    viewport?: InstrumentViewport;
  }): InstrumentView<State>;
}

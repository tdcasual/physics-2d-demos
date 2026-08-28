/**
 * 场景引导器类型定义
 *
 * SceneInstance 和 ScenePageOptions 的独立类型文件，
 * 避免循环导入并提高编译性能。
 */

import type {
  Theme,
  LayoutSlots,
  ReadoutItem,
  TransportState
} from './layouts/types';
import type { SceneMeta } from '../platform/scene-contract';
import type {
  DemoRenderHints,
  SceneDemoProfile
} from '../platform/demo-profile';

/** 场景实例接口（场景实现方提供） */
export type SceneInstance = {
  init(): void;
  resize(): void;
  render(): void;
  dispose(): void;
  setTheme(theme: Theme): void;
  setMode(mode: 'normal' | 'presentation'): void;
  step(dt: number): void;
  reset?(): void;
  startAll?(): void;
  pauseAll?(): void;
  setTimeScale?(scale: number): void;
  getTimeScale?(): number;
  getState?(): unknown;
  getReadoutItems?(): ReadoutItem[];
  getTransportState?(): TransportState;
  subscribe?(listener: () => void): () => void;
  // 允许场景暴露额外方法供控制面板使用
  [key: string]: unknown;
};

/**
 * 场景创建标准参数契约
 *
 * 所有 createScene 回调都会收到这些参数。每个场景的 entry 工厂函数
 * 必须能接受此类型（或兼容的超集），否则在类型测试中会报错。
 */
export type StandardSceneCreateParams = {
  /** 动画区容器（渲染面）。非 canvas 渲染（SVG/DOM/WebGL 等）直接渲染到此容器。 */
  container: HTMLElement;
  /** 动画区内的 canvas（canvas 类场景使用）；非 canvas 渲染时为 undefined。 */
  canvas?: HTMLCanvasElement;
  slots: LayoutSlots;
  theme: Theme;
  mode: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
};

/** 场景页面配置选项 */
export type ScenePageOptions<TScene extends SceneInstance = SceneInstance> = {
  /** 场景元数据 */
  meta: SceneMeta;
  /** 首选布局 ID */
  preferredLayout?: string;
  /** 布局配置 */
  layoutConfig?: Record<string, unknown>;
  /** 演示配置（默认从 meta.demoProfile 读取） */
  demoProfile?: SceneDemoProfile;
  /** 创建场景实例 */
  createScene: (opts: StandardSceneCreateParams) => TScene;
  /** 创建控制面板（可选） */
  createControls?: (opts: {
    mount: HTMLElement;
    scene: TScene;
    onStatus?: (text: string) => void;
    /**
     * rAF 合帧渲染请求（由 bootstrapper 注入）：同帧内多次调用合并为一次
     * scene.render()。控制面板内的参数变更（滑块 input、预设/场景切换）
     * 应优先用它替代直接 scene.render()；需要立即出帧的场景
     * （URL 参数应用后的首绘、transport 单步）仍保留同步 render。
     * 可选：未注入时（如单测直接调用）页面应回退为同步 render。
     */
    scheduleRender?: () => void;
  }) => unknown;
  /** 格式化读数数据（可选，若场景提供 getReadoutItems 则不需要） */
  formatReadout?: (state: unknown) => ReadoutItem[];
  /** 步进间隔（秒），默认 1/60 */
  stepSeconds?: number;
  /** 最大子步数，默认 5 */
  maxSubSteps?: number;
  /** 场景挂载后自动播放动画，默认 false */
  autoPlay?: boolean;
  /**
   * 主题切换回调（可选）。由 bootstrapper 注入 container.setTheme，
   * 让 `t` 快捷键走 container 统一路径（状态同步 + 持久化）；
   * 未提供时 `t` 快捷键退回直接改 DOM 的旧行为。
   */
  onToggleTheme?: (next: Theme) => void;
};

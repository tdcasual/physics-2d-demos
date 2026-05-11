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
import type { DemoRenderHints, SceneDemoProfile } from './demo-profile';

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
  canvas: HTMLCanvasElement;
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
  }) => unknown;
  /** 格式化读数数据（可选，若场景提供 getReadoutItems 则不需要） */
  formatReadout?: (state: unknown) => ReadoutItem[];
  /** 步进间隔（秒），默认 1/60 */
  stepSeconds?: number;
  /** 最大子步数，默认 5 */
  maxSubSteps?: number;
  /** 场景挂载后自动播放动画，默认 false */
  autoPlay?: boolean;
};

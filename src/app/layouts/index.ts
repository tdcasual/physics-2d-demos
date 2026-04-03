/**
 * 布局母版系统 - 统一导出
 * 
 * @review-date 2026-04-02
 * @version 0.1.0
 */

// 类型导出
export type {
  LayoutMaster,
  LayoutMasterConstructor,
  LayoutSlots,
  SlotName,
  SlotConfig,
  Scene,
  SceneContainer,
  Theme,
  LayoutConfig,
  LayoutTransition,
  SwitchOptions,
  CreateContainerOptions,
  ReadoutItem,
  HeaderConfig,
  CanvasConfig,
  LayoutChangeEvent,
  ThemeChangeEvent,
  SceneContainerEvents,
  TransportState,
  SceneStateListener
} from './types';

// 注册表导出
export {
  layoutRegistry,
  registerLayout,
  getDefaultLayoutId,
  saveLayoutPreference,
  type LayoutMetadata
} from './registry';

// 容器导出
export {
  SceneContainerImpl,
  createSceneContainer
} from './container';

// 基类导出
export { BaseLayout } from './masters/base-layout';

// 布局实现导出
export {
  SplitRightLayout,
  type SplitRightConfig
} from './masters/split-right/split-right';

export {
  MobileStackLayout,
  type MobileStackConfig
} from './masters/mobile-stack/mobile-stack';

/**
 * 布局系统导出
 * 
 * 使用方式：
 * ```ts
 * import { SplitRightLayout, registerLayout, createSceneContainer } from './layouts';
 * 
 * // 注册布局
 * registerLayout('split-right', SplitRightLayout, {
 *   name: '左右分栏',
 *   description: '控制区在左，动画区在右'
 * });
 * 
 * // 创建容器
 * const container = createSceneContainer({
 *   mount: document.getElementById('app'),
 *   defaultLayout: 'split-right'
 * });
 * ```
 */

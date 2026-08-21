/**
 * 布局母版系统 - 统一导出
 *
 * @review-date 2026-04-27
 * @version 2.0.0
 */

// 类型导出
export type {
  ILayoutConstructor,
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
  LayoutChangeEvent,
  ThemeChangeEvent,
  SceneContainerEvents,
  TransportState,
  SceneStateListener,
  LayoutInteractionModel,
  LayoutTestViewport,
  LayoutTestProfile
} from './types';

// 注册表导出
export {
  layoutRegistry,
  registerLayout,
  registerLayoutTestAdapter,
  hasLayoutTestAdapter,
  getDefaultLayoutId,
  saveLayoutPreference,
  validateLayoutTestProfile,
  type LayoutMetadata
} from './registry';

// 容器导出
export { SceneContainerImpl, createSceneContainer } from './container';

// Capability 导出
export {
  createTransportBar,
  createReadoutPanel,
  createDemoProfile,
  createThemeToggle,
  createModeToggle,
  createSidebarToggle,
  createResizer,
  createDebugOverlay,
  capabilityFactories
} from './capabilities';
export type {
  TransportBarConfig,
  ReadoutPanelConfig,
  DemoProfileConfig,
  ThemeToggleConfig,
  ModeToggleConfig,
  SidebarToggleConfig,
  ResizerConfig,
  DebugOverlayConfig
} from './capabilities';

// 布局导出
export { SplitRightLayout } from './layouts/split-right/split-right';
export type { SplitRightConfig } from './layouts/split-right/split-right';

export { MobileStackLayout } from './layouts/mobile-stack/mobile-stack';
export type { MobileStackConfig } from './layouts/mobile-stack/mobile-stack';

export { SplitRightGraphBottomLayout } from './layouts/split-right-graph-bottom/split-right-graph-bottom';
export type { SplitRightGraphBottomConfig } from './layouts/split-right-graph-bottom/split-right-graph-bottom';

// 自动注册
export { registerAllLayouts } from './auto-register';

/**
 * 布局系统使用方式（Capability-based）：
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

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

// ILayout v2 布局导出
export { SplitRightLayoutV2 } from './layouts/split-right/split-right-v2';
export type { SplitRightConfig } from './layouts/split-right/split-right-v2';

export { MobileStackLayoutV2 } from './layouts/mobile-stack/mobile-stack-v2';
export type { MobileStackConfig } from './layouts/mobile-stack/mobile-stack-v2';

export { SplitRightGraphBottomLayoutV2 } from './layouts/split-right-graph-bottom/split-right-graph-bottom-v2';
export type { SplitRightGraphBottomConfig } from './layouts/split-right-graph-bottom/split-right-graph-bottom-v2';

// 自动注册
export { registerAllLayouts } from './auto-register';

/**
 * 布局系统使用方式（v2 Capability-based）：
 * ```ts
 * import { SplitRightLayoutV2, registerLayout, createSceneContainer } from './layouts';
 *
 * // 注册布局
 * registerLayout('split-right', SplitRightLayoutV2, {
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

/**
 * 布局系统 - 统一类型导出
 *
 * 所有类型定义在 ./core/types.ts，此文件仅做 re-export。
 *
 * @review-date 2026-04-27
 * @version 0.3.0
 */

// 基础类型
export type { Theme, SlotName } from './core/types';
export type { LayoutSlots, SlotConfig, LayoutConfig } from './core/types';
export type { ReadoutItem, TransportState, SceneStateListener } from './core/types';

// Capability 系统
export { CAPABILITY_IDS } from './core/types';
export type {
  CapabilityId,
  CapabilityDeclaration,
  CapabilityInstance,
  CapabilityContext,
  ILayout,
  ILayoutConstructor
} from './core/types';

// 场景与容器接口
export type { Scene, SceneContainer } from './core/types';

// 事件与配置
export type {
  LayoutTransition,
  SwitchOptions,
  CreateContainerOptions,
  LayoutChangeEvent,
  ThemeChangeEvent,
  SceneContainerEvents
} from './core/types';

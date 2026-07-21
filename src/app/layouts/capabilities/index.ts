/**
 * Capabilities 统一导出
 *
 * 使用方式：
 * ```ts
 * import { createTransportBar } from './capabilities';
 * const layout = new MyLayout();
 * layout.capabilities = [
 *   { id: 'transport-bar', config: { mountSlot: 'animation' } },
 *   { id: 'theme-toggle' }
 * ];
 * ```
 */

export { createTransportBar } from './transport-bar';
export type { TransportBarCallbacks, TransportBarConfig } from './transport-bar';

export { createReadoutPanel } from './readout-panel';
export type { ReadoutPanelConfig } from './readout-panel';

export { createDemoProfile } from './demo-profile';
export type { DemoProfileConfig, DemoProfileUpdateData } from './demo-profile';

export { createThemeToggle } from './theme-toggle';
export type { ThemeToggleConfig } from './theme-toggle';

export { createModeToggle } from './mode-toggle';
export type { ModeToggleConfig } from './mode-toggle';

export { createSidebarToggle } from './sidebar-toggle';
export type { SidebarToggleConfig } from './sidebar-toggle';

export { createResizer } from './resizer';
export type { ResizerConfig } from './resizer';

export { createDebugOverlay } from './debug-overlay';
export type { DebugOverlayConfig } from './debug-overlay';

export { createLayoutSwitch } from './layout-switch';
export type { LayoutSwitchConfig } from './layout-switch';

// Capability factory registry — map of id → factory function
import type {
  CapabilityDeclaration,
  CapabilityDefinition,
  CapabilityId,
  CapabilityScope,
  ReadoutItem,
  TransportState
} from '../types';
import type { TransportBarCallbacks, TransportBarConfig } from './transport-bar';
import type { ReadoutPanelConfig } from './readout-panel';
import type { DemoProfileConfig, DemoProfileUpdateData } from './demo-profile';
import type { ThemeToggleConfig } from './theme-toggle';
import type { ModeToggleConfig } from './mode-toggle';
import type { SidebarToggleConfig } from './sidebar-toggle';
import type { ResizerConfig } from './resizer';
import type { DebugOverlayConfig } from './debug-overlay';
import type { LayoutSwitchConfig } from './layout-switch';

import { createTransportBar } from './transport-bar';
import { createReadoutPanel } from './readout-panel';
import { createDemoProfile } from './demo-profile';
import { createThemeToggle } from './theme-toggle';
import { createModeToggle } from './mode-toggle';
import { createSidebarToggle } from './sidebar-toggle';
import { createResizer } from './resizer';
import { createDebugOverlay } from './debug-overlay';
import { createLayoutSwitch } from './layout-switch';

export interface CapabilityConfigMap {
  'transport-bar': TransportBarConfig;
  'readout-panel': ReadoutPanelConfig;
  'demo-profile': DemoProfileConfig;
  'theme-toggle': ThemeToggleConfig;
  'mode-toggle': ModeToggleConfig;
  'sidebar-toggle': SidebarToggleConfig;
  resizer: ResizerConfig;
  'debug-overlay': DebugOverlayConfig;
  'layout-switch': LayoutSwitchConfig;
}

export interface CapabilityDataMap {
  'transport-bar': TransportState;
  'readout-panel': ReadoutItem[];
  'demo-profile': DemoProfileUpdateData;
  'theme-toggle': unknown;
  'mode-toggle': unknown;
  'sidebar-toggle': unknown;
  resizer: unknown;
  'debug-overlay': unknown;
  'layout-switch': unknown;
}

export interface CapabilityCallbacksMap {
  'transport-bar': TransportBarCallbacks;
  'readout-panel': unknown;
  'demo-profile': unknown;
  'theme-toggle': unknown;
  'mode-toggle': unknown;
  'sidebar-toggle': unknown;
  resizer: unknown;
  'debug-overlay': unknown;
  'layout-switch': unknown;
}

export type CapabilityFactory<K extends CapabilityId> = (
  defaultConfig?: CapabilityConfigMap[K]
) => CapabilityDefinition<
  CapabilityConfigMap[K],
  CapabilityDataMap[K],
  CapabilityCallbacksMap[K]
>;

export type CapabilityFactoryRegistry = {
  [K in CapabilityId]: CapabilityFactory<K>;
};

/** Capability 工厂函数映射表
 *
 * 每个 capability 的 config 类型不同，因此 cast 是必要的。
 * 所有 cast 集中在此单一文件内，外部通过 registry 使用时类型安全。
 */
export const capabilityFactories = {
  'transport-bar': createTransportBar,
  'readout-panel': createReadoutPanel,
  'demo-profile': createDemoProfile,
  'theme-toggle': createThemeToggle,
  'mode-toggle': createModeToggle,
  'sidebar-toggle': createSidebarToggle,
  resizer: createResizer,
  'debug-overlay': createDebugOverlay,
  'layout-switch': createLayoutSwitch
} satisfies CapabilityFactoryRegistry;

export function createCapabilityDefinition(
  declaration: CapabilityDeclaration
): CapabilityDefinition {
  switch (declaration.id) {
    case 'transport-bar':
      return createTransportBar(declaration.config as TransportBarConfig);
    case 'readout-panel':
      return createReadoutPanel(declaration.config as ReadoutPanelConfig);
    case 'demo-profile':
      return createDemoProfile(declaration.config as DemoProfileConfig);
    case 'theme-toggle':
      return createThemeToggle(declaration.config as ThemeToggleConfig);
    case 'mode-toggle':
      return createModeToggle(declaration.config as ModeToggleConfig);
    case 'sidebar-toggle':
      return createSidebarToggle(declaration.config as SidebarToggleConfig);
    case 'resizer':
      return createResizer(declaration.config as ResizerConfig);
    case 'debug-overlay':
      return createDebugOverlay(declaration.config as DebugOverlayConfig);
    case 'layout-switch':
      return createLayoutSwitch(declaration.config as LayoutSwitchConfig);
  }
}

/** Capability 作用域映射 — container 作用域在布局切换时保留，layout 作用域会被销毁重建 */
export const CAPABILITY_SCOPES: Record<CapabilityId, CapabilityScope> = {
  'transport-bar': 'layout',
  'readout-panel': 'layout',
  'demo-profile': 'container',
  'theme-toggle': 'container',
  'mode-toggle': 'container',
  'sidebar-toggle': 'layout',
  'resizer': 'layout',
  'debug-overlay': 'container',
  'layout-switch': 'layout'
};

export function getCapabilityScope(id: CapabilityId): CapabilityScope {
  return CAPABILITY_SCOPES[id] ?? 'layout';
}

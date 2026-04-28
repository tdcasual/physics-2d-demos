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
export type { TransportBarConfig } from './transport-bar';

export { createReadoutPanel } from './readout-panel';
export type { ReadoutPanelConfig } from './readout-panel';

export { createDemoProfile } from './demo-profile';
export type { DemoProfileConfig } from './demo-profile';

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

// Capability factory registry — map of id → factory function
import type { CapabilityId, CapabilityDefinition } from '../core/types';

import { createTransportBar } from './transport-bar';
import { createReadoutPanel } from './readout-panel';
import { createDemoProfile } from './demo-profile';
import { createThemeToggle } from './theme-toggle';
import { createModeToggle } from './mode-toggle';
import { createSidebarToggle } from './sidebar-toggle';
import { createResizer } from './resizer';
import { createDebugOverlay } from './debug-overlay';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CapabilityFactory = (defaultConfig?: any) => CapabilityDefinition<any, any, any>;

/** Capability 工厂函数映射表
 *
 * 每个 capability 的 config 类型不同，因此 cast 是必要的。
 * 所有 cast 集中在此单一文件内，外部通过 registry 使用时类型安全。
 */
export const capabilityFactories: Record<CapabilityId, CapabilityFactory> = {
  'transport-bar': createTransportBar as CapabilityFactory,
  'readout-panel': createReadoutPanel as CapabilityFactory,
  'demo-profile': createDemoProfile as CapabilityFactory,
  'theme-toggle': createThemeToggle as CapabilityFactory,
  'mode-toggle': createModeToggle as CapabilityFactory,
  'sidebar-toggle': createSidebarToggle as CapabilityFactory,
  resizer: createResizer as CapabilityFactory,
  'debug-overlay': createDebugOverlay as CapabilityFactory
};

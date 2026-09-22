/**
 * 四布局共享的能力脊柱：
 * transport（hideTransport 三元）→ data-workspace → theme/mode →
 * demo-profile → debug-overlay。
 *
 * 差异项（readout-panel 配置、layout-switch/sidebar-toggle/resizer 等）
 * 通过两个插入点留在各布局；transport 的配置形态不收进本模块统一
 * （mobile 是 {} + mount 注入 controlBar，桌面是 { mountSlot:'animation' }）。
 */

import type { CapabilityDeclaration, LayoutConfig } from '../types';
import { dataWorkspaceDeclarations } from './data-workspace-declarations';
import { shouldEnableDebugOverlay } from './debug-overlay';

export interface BaseCapabilitiesSlots {
  /** transport-bar 配置（形态归各布局所有） */
  transportConfig?: unknown;
  /** demo-profile 配置（如 lab 的 sidebarSelector） */
  demoProfileConfig?: unknown;
  /** 插在 data-workspace 之后、theme-toggle 之前（如 readout-panel） */
  afterDataWorkspace?: CapabilityDeclaration[];
  /** 插在 mode-toggle 之后、demo-profile 之前（如 layout-switch/resizer） */
  beforeDemoProfile?: CapabilityDeclaration[];
}

export function buildBaseCapabilities(
  cfg: LayoutConfig,
  slots: BaseCapabilitiesSlots = {}
): CapabilityDeclaration[] {
  return [
    ...(cfg.hideTransport
      ? []
      : [
          {
            id: 'transport-bar' as const,
            config: slots.transportConfig ?? {}
          }
        ]),
    ...dataWorkspaceDeclarations(cfg),
    ...(slots.afterDataWorkspace ?? []),
    { id: 'theme-toggle' },
    { id: 'mode-toggle' },
    ...(slots.beforeDemoProfile ?? []),
    {
      id: 'demo-profile' as const,
      ...(slots.demoProfileConfig ? { config: slots.demoProfileConfig } : {})
    },
    ...(shouldEnableDebugOverlay() ? [{ id: 'debug-overlay' as const }] : [])
  ];
}

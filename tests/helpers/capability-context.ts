import type { CapabilityContext } from '../../src/app/layouts/types';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

export function stubCapabilityContext(
  partial: Partial<CapabilityContext> & Pick<CapabilityContext, 'container'>
): CapabilityContext {
  return {
    getTheme: () => 'light',
    setTheme() {},
    getMode: () => 'normal',
    setMode() {},
    switchLayout() {},
    getCurrentLayoutId: () => 'split-right',
    getAvailableLayouts: () => [],
    on: () => () => {},
    requestStageRepaint() {},
    sidebar: new SidebarStateOwner(),
    workspaceUi: new WorkspaceUiState(),
    ...partial
  };
}

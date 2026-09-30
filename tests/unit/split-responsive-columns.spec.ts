import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { applyResponsiveColumns } from '../../src/app/layouts/_shared/split-helpers';
import { createSidebarToggle } from '../../src/app/layouts/capabilities/sidebar-toggle';
import type { CapabilityContext } from '../../src/app/layouts/types';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

/**
 * Fix 7a：侧栏隐藏态单一事实源 = container.dataset.sidebarHidden；
 * applyResponsiveColumns 优先读标记，startsWith('0px') 仅作缺失回退。
 */
describe('sidebar-hidden flag (Fix 7a)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1280px';
    container.style.height = '800px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  function makeSplitGrid(): void {
    container.style.gridTemplateColumns = '300px 8px 1fr';
    const left = document.createElement('aside');
    container.appendChild(left);
  }

  it('treats flag=true as hidden even when the template was rewritten', () => {
    makeSplitGrid();
    // 模板已被重写成非 0px 形态，但标记声明隐藏（用户意图跨断点保持）
    container.dataset.sidebarHidden = 'true';
    container.style.gridTemplateColumns = '260px 8px 1fr';

    applyResponsiveColumns(container, 1280, {}, 0.35);

    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');
  });

  it('treats flag=false as visible even when the template starts with 0px', () => {
    makeSplitGrid();
    container.dataset.sidebarHidden = 'false';
    container.style.gridTemplateColumns = '0px 0px 1fr';

    applyResponsiveColumns(container, 1280, {}, 0.35);

    // 不再嗅探样式串：标记为 false → 按可见重算列
    //（leftWidth = max(260, min(960, 1280 × 0.35)) = 448）
    expect(container.style.gridTemplateColumns).toBe('448px 8px 1fr');
  });

  it('falls back to the 0px prefix sniff when the flag is absent', () => {
    makeSplitGrid();
    container.style.gridTemplateColumns = '0px 0px 1fr';
    delete container.dataset.sidebarHidden;

    applyResponsiveColumns(container, 1280, {}, 0.35);

    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');
  });

  it('sidebar-toggle maintains the flag across hide/show', () => {
    makeSplitGrid();
    const ctx = {
      container,
      getTheme: () => 'light',
      setTheme: () => {},
      getMode: () => 'normal',
      setMode: () => {},
      switchLayout: () => {},
      getCurrentLayoutId: () => 'split-right',
      getAvailableLayouts: () => [],
      on: () => () => {},
      requestStageRepaint: () => {},
      sidebar: new SidebarStateOwner(),
      workspaceUi: new WorkspaceUiState()
    } as unknown as CapabilityContext;

    const instance = createSidebarToggle().mount(
      { control: document.createElement('div'), animation: container },
      {},
      ctx
    );
    const btn = container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();
    expect(container.dataset.sidebarHidden).toBe('true');
    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

    btn.click();
    expect(container.dataset.sidebarHidden).toBe('false');
    expect(container.style.gridTemplateColumns).toBe('300px 8px 1fr');

    instance.dispose();
  });
});

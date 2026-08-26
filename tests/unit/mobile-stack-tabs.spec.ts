import { describe, expect, it } from 'vitest';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';

describe('mobile-stack tab bar keyboard interaction (WAI-ARIA tabs)', () => {
  async function mountLayout() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const layout = new MobileStackLayout(container);
    await layout.mount();
    const tabBar = container.querySelector<HTMLElement>('.mobile-tab-bar')!;
    const tabs = Array.from(
      tabBar.querySelectorAll<HTMLElement>('[role="tab"]')
    );
    const cleanup = async () => {
      await layout.unmount();
      container.remove();
    };
    return { cleanup, tabBar, tabs };
  }

  function pressKey(tab: HTMLElement, key: string) {
    tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  function state(tabs: HTMLElement[]) {
    return {
      tabIndexes: tabs.map((t) => t.tabIndex),
      selected: tabs.map((t) => t.getAttribute('aria-selected'))
    };
  }

  it('initializes roving tabindex on the active tab only', async () => {
    const { cleanup, tabs } = await mountLayout();

    expect(state(tabs).tabIndexes).toEqual([-1, 0, -1]);
    expect(state(tabs).selected).toEqual(['false', 'true', 'false']);

    await cleanup();
  });

  it('links tabs and panels with id / aria-controls / aria-labelledby', async () => {
    const { cleanup, tabBar, tabs } = await mountLayout();

    expect(tabBar.getAttribute('aria-label')).toBe('面板切换');

    for (const tab of tabs) {
      const tabId = tab.dataset.tab!;
      expect(tab.id).toBe(`mobile-tab-${tabId}`);
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel).not.toBeNull();
      expect(panel!.getAttribute('role')).toBe('tabpanel');
      expect(panel!.getAttribute('aria-labelledby')).toBe(tab.id);
    }

    await cleanup();
  });

  it('ArrowRight/ArrowLeft move and activate tabs with wrap-around', async () => {
    const { cleanup, tabs } = await mountLayout();

    pressKey(tabs[1], 'ArrowRight');
    expect(state(tabs).tabIndexes).toEqual([-1, -1, 0]);
    expect(state(tabs).selected).toEqual(['false', 'false', 'true']);
    expect(document.activeElement).toBe(tabs[2]);

    pressKey(tabs[2], 'ArrowRight');
    expect(state(tabs).tabIndexes).toEqual([0, -1, -1]);

    pressKey(tabs[0], 'ArrowLeft');
    expect(state(tabs).tabIndexes).toEqual([-1, -1, 0]);
    expect(document.activeElement).toBe(tabs[2]);

    await cleanup();
  });

  it('Home/End jump to first/last tab and activate them', async () => {
    const { cleanup, tabs } = await mountLayout();

    pressKey(tabs[1], 'Home');
    expect(state(tabs).tabIndexes).toEqual([0, -1, -1]);
    expect(state(tabs).selected).toEqual(['true', 'false', 'false']);

    pressKey(tabs[0], 'End');
    expect(state(tabs).tabIndexes).toEqual([-1, -1, 0]);
    expect(state(tabs).selected).toEqual(['false', 'false', 'true']);
    expect(document.activeElement).toBe(tabs[2]);

    await cleanup();
  });

  it('switches the visible panel alongside the active tab', async () => {
    const { cleanup, tabs } = await mountLayout();
    const panels = Array.from(
      tabs[0]
        .closest('.mobile-stack-layout')!
        .querySelectorAll('.mobile-tab-panel')
    );

    pressKey(tabs[1], 'ArrowLeft');
    const activePanels = panels.filter((p) => p.classList.contains('active'));
    expect(activePanels).toHaveLength(1);
    expect(activePanels[0].id).toBe('mobile-panel-graph');

    await cleanup();
  });
});

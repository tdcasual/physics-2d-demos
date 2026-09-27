/**
 * Capability 系统完整测试
 *
 * 覆盖：10 个 Capability 单测 + v2 布局 + 容器集成
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { capabilityFactories } from '../../src/app/layouts/capabilities';
import { STAGE_CHROME_ATTR } from '../../src/platform/stage-chrome';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';
import { SplitRightGraphBottomLayout } from '../../src/app/layouts/layouts/split-right-graph-bottom/split-right-graph-bottom';
import { SceneContainerImpl } from '../../src/app/layouts/container';
import type {
  CapabilityContext,
  CapabilityId
} from '../../src/app/layouts/types';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

// ============================================================================
// Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<CapabilityContext> = {}
): CapabilityContext {
  let theme: 'light' | 'dark' = 'light';
  let mode: 'normal' | 'presentation' = 'normal';
  const listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  return {
    container: document.createElement('div'),
    getTheme: () => theme,
    setTheme: (t) => {
      theme = t;
      listeners.get('themechange')?.forEach((h) => h({ theme: t }));
    },
    getMode: () => mode,
    setMode: (m) => {
      mode = m;
      listeners.get('modechange')?.forEach((h) => h({ mode: m }));
    },
    on: ((event: string, handler: (payload: unknown) => void): (() => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => {
        listeners.get(event)?.delete(handler);
      };
    }) as CapabilityContext['on'],
    switchLayout: () => {},
    getCurrentLayoutId: () => 'test',
    getAvailableLayouts: () => [],
    requestStageRepaint() {},
    sidebar: new SidebarStateOwner(),
    workspaceUi: new WorkspaceUiState(),
    ...overrides
  };
}

// ============================================================================
// 1. Capability Factory Registry
// ============================================================================

describe('Capability factory registry', () => {
  const expectedIds: CapabilityId[] = [
    'transport-bar',
    'readout-panel',
    'demo-profile',
    'theme-toggle',
    'mode-toggle',
    'sidebar-toggle',
    'resizer',
    'debug-overlay',
    'layout-switch',
    'data-workspace'
  ];

  it('has all factories registered', () => {
    for (const id of expectedIds) {
      expect(capabilityFactories[id]).toBeDefined();
    }
  });

  it('each factory returns definition with correct id', () => {
    for (const id of expectedIds) {
      const def = capabilityFactories[id]();
      expect(def.id).toBe(id);
      expect(typeof def.mount).toBe('function');
    }
  });
});

// ============================================================================
// 2. theme-toggle Capability
// ============================================================================

describe('theme-toggle capability', () => {
  it('mounts and creates a button when none exists', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['theme-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );
    expect(ctx.container.querySelector('.theme-toggle-btn')).toBeTruthy();
    instance.dispose();
  });

  it('click toggles theme from light to dark', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['theme-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = ctx.container.querySelector(
      '.theme-toggle-btn'
    ) as HTMLButtonElement;
    btn.click();
    expect(ctx.getTheme()).toBe('dark');

    btn.click();
    expect(ctx.getTheme()).toBe('light');
    instance.dispose();
  });

  it('reuses existing button matching selector', () => {
    const ctx = createTestContext();
    const preBtn = document.createElement('button');
    preBtn.className = 'my-theme-btn';
    ctx.container.appendChild(preBtn);

    const instance = capabilityFactories['theme-toggle']({
      selector: '.my-theme-btn'
    }).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    preBtn.click();
    expect(ctx.getTheme()).toBe('dark');
    instance.dispose();
  });

  it('dispose removes click listener', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['theme-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = ctx.container.querySelector(
      '.theme-toggle-btn'
    ) as HTMLButtonElement;
    instance.dispose();
    btn.click();
    expect(ctx.getTheme()).toBe('light');
  });
});

// ============================================================================
// 3. mode-toggle Capability
// ============================================================================

describe('mode-toggle capability', () => {
  it('click toggles mode normal ↔ presentation', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['mode-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = ctx.container.querySelector(
      '.mode-toggle-btn'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('演示');

    btn.click();
    expect(ctx.getMode()).toBe('presentation');
    expect(btn.textContent).toBe('标准');

    btn.click();
    expect(ctx.getMode()).toBe('normal');
    expect(btn.textContent).toBe('演示');
    instance.dispose();
  });

  it('dispose removes created button from DOM', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['mode-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    instance.dispose();
    const btn = ctx.container.querySelector('.mode-toggle-btn');
    expect(btn).toBeNull();
  });
});

// ============================================================================
// 4. demo-profile Capability
// ============================================================================

describe('demo-profile capability', () => {
  function resolved(
    partial: Partial<
      import('../../src/platform/demo-profile').ResolvedDemoProfile
    > &
      Pick<
        import('../../src/platform/demo-profile').ResolvedDemoProfile,
        'controlPanel' | 'readoutPanel'
      >
  ): import('../../src/platform/demo-profile').ResolvedDemoProfile {
    return {
      lessonTask: 'unmigrated',
      visibleControlKeys: [],
      readoutKeys: [],
      renderHints: { contentScale: 1 },
      touchTargetMinSize: 48,
      ...partial
    };
  }

  it('filters minimal controls and restores them when leaving presentation mode', () => {
    const container = document.createElement('div');
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const visibleSection = document.createElement('section');
    visibleSection.dataset.controlSection = '参数';
    const visibleField = document.createElement('div');
    visibleField.dataset.controlKey = 'speed';
    visibleSection.appendChild(visibleField);
    const hiddenSection = document.createElement('section');
    hiddenSection.dataset.controlSection = '高级';
    const hiddenField = document.createElement('div');
    hiddenField.dataset.controlKey = 'debug';
    hiddenSection.appendChild(hiddenField);
    sidebar.append(visibleSection, hiddenSection);
    container.appendChild(sidebar);

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation: document.createElement('div') },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'minimal',
        readoutPanel: 'hidden',
        visibleControlKeys: ['speed']
      })
    });

    expect(visibleField.style.display).toBe('');
    expect(hiddenField.style.display).toBe('none');
    expect(hiddenSection.style.display).toBe('none');
    expect(sidebar.classList.contains('is-collapsed-demo')).toBe(false);

    instance.update?.({ mode: 'normal', profile: null });
    expect(hiddenField.style.display).toBe('');
    expect(hiddenSection.style.display).toBe('');
    instance.dispose();
  });

  it('collapses split-grid columns for hidden and collapsed control panels', () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'minmax(260px, 672px) 8px 1fr';
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const resizer = document.createElement('div');
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    container.append(sidebar, resizer);

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation: document.createElement('div') },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'collapsed',
        readoutPanel: 'overlay',
        renderHints: { contentScale: 1.5 }
      })
    });

    expect(sidebar.classList.contains('is-demo-rail')).toBe(true);
    expect(sidebar.classList.contains('is-collapsed-demo')).toBe(false);
    expect(container.style.gridTemplateColumns).toBe('48px 0px 1fr');
    expect(resizer.style.display).toBe('none');

    instance.update?.({ mode: 'normal', profile: null });
    expect(sidebar.classList.contains('is-demo-rail')).toBe(false);
    expect(container.style.gridTemplateColumns).toBe(
      'minmax(260px, 672px) 8px 1fr'
    );
    expect(resizer.style.display).toBe('');

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'hidden',
        readoutPanel: 'docked-bottom',
        renderHints: { contentScale: 1.5 }
      })
    });
    expect(sidebar.style.display).toBe('none');
    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'minimal',
        readoutPanel: 'overlay',
        renderHints: { contentScale: 1.5 },
        visibleControlKeys: ['speed']
      })
    });
    expect(container.style.gridTemplateColumns).toBe(
      'minmax(260px, 22rem) 8px 1fr'
    );

    instance.dispose();
  });

  it('keeps inner button-grid keys visible when the parent key is listed', () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'minmax(260px, 672px) 8px 1fr';
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const grid = document.createElement('div');
    grid.dataset.controlKey = 'preset';
    const innerA = document.createElement('button');
    innerA.dataset.controlKey = 'uniform';
    const innerB = document.createElement('button');
    innerB.dataset.controlKey = 'accelerated';
    grid.append(innerA, innerB);
    sidebar.appendChild(grid);
    container.appendChild(sidebar);

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation: document.createElement('div') },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'hidden',
        readoutPanel: 'docked-bottom',
        visibleControlKeys: ['preset']
      })
    });

    expect(innerA.style.display).toBe('');
    expect(innerB.style.display).toBe('');
    instance.dispose();
  });

  it('hides sibling inner keys when only one child key is listed', () => {
    const container = document.createElement('div');
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const grid = document.createElement('div');
    grid.dataset.controlKey = 'action';
    const step = document.createElement('button');
    step.dataset.controlKey = 'step';
    const reset = document.createElement('button');
    reset.dataset.controlKey = 'reset';
    grid.append(step, reset);
    sidebar.appendChild(grid);
    container.appendChild(sidebar);

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation: document.createElement('div') },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'hidden',
        readoutPanel: 'docked-bottom',
        visibleControlKeys: ['step']
      })
    });

    expect(grid.style.display).toBe('');
    expect(step.style.display).toBe('');
    expect(reset.style.display).toBe('none');
    instance.dispose();
  });

  it('does not reparent a left graph while the control panel stays minimal', () => {
    const container = document.createElement('div');
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const graph = document.createElement('section');
    graph.className = 'graph-section';
    sidebar.appendChild(graph);
    const animation = document.createElement('div');
    animation.className = 'animation-slot';
    container.append(sidebar, animation);
    container.dataset.hasGraph = 'true';

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'minimal',
        readoutPanel: 'overlay',
        graphPanel: 'visible',
        visibleControlKeys: ['lambda']
      })
    });

    expect(graph.parentElement).toBe(sidebar);
    expect(graph.classList.contains('is-demo-stage-graph')).toBe(false);
    instance.dispose();
  });

  it('reparents a left graph onto the stage when the sidebar is hidden', () => {
    const container = document.createElement('div');
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const graph = document.createElement('section');
    graph.className = 'graph-section';
    sidebar.appendChild(graph);
    const animation = document.createElement('div');
    animation.className = 'animation-slot';
    container.append(sidebar, animation);
    container.dataset.hasGraph = 'true';

    const ctx = createTestContext({
      container,
      getCurrentLayoutId: () => 'split-right'
    });
    const instance = capabilityFactories['demo-profile']({}).mount(
      { control: sidebar, animation },
      {},
      ctx
    );

    instance.update?.({
      mode: 'presentation',
      profile: resolved({
        controlPanel: 'hidden',
        readoutPanel: 'docked-bottom',
        graphPanel: 'visible'
      })
    });

    expect(graph.parentElement).toBe(animation);
    expect(graph.classList.contains('is-demo-stage-graph')).toBe(true);
    // 过继进 animation slot 期间是 slot 内 chrome，必须带自标属性
    expect(graph.hasAttribute(STAGE_CHROME_ATTR)).toBe(true);
    expect(animation.classList.contains('is-demo-stage-with-graph')).toBe(true);

    // 还原时移除自标属性，避免污染它在侧栏的常驻地
    instance.update?.({ mode: 'normal', profile: null });
    expect(graph.parentElement).toBe(sidebar);
    expect(graph.hasAttribute(STAGE_CHROME_ATTR)).toBe(false);
    instance.dispose();
  });
});

// ============================================================================
// 5. sidebar-toggle Capability
// ============================================================================

describe('sidebar-toggle capability', () => {
  it('click hides and shows sidebar', () => {
    const ctx = createTestContext();
    ctx.container.style.gridTemplateColumns = '280px 8px 1fr';

    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    ctx.container.appendChild(sidebar);

    ctx.container.appendChild(document.createElement('div')); // resizer placeholder

    const instance = capabilityFactories['sidebar-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = ctx.container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('隐藏控制面板');

    // Click to hide
    btn.click();
    expect(ctx.container.style.gridTemplateColumns).toBe('0px 0px 1fr');
    expect(btn.textContent).toBe('显示控制面板');

    // Click to show
    btn.click();
    expect(ctx.container.style.gridTemplateColumns).toBe('280px 8px 1fr');
    expect(btn.textContent).toBe('隐藏控制面板');
    instance.dispose();
  });

  it('creates button when none exists', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['sidebar-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    expect(ctx.container.querySelector('.sidebar-toggle-btn')).toBeTruthy();
    instance.dispose();
  });

  // Regression: display:none on grid items removes them from flow. Without
  // grid-column-start:3 on the right panel, it collapses to column 1 (0px).
  function createGridFixture(rightPanelClass: string) {
    const container = document.createElement('div');
    container.style.cssText = 'width: 1200px; height: 800px;';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'minmax(260px, 40%) 8px 1fr';

    const leftPanel = document.createElement('aside');
    leftPanel.className = 'layout-left-panel';
    container.appendChild(leftPanel);

    const resizer = document.createElement('div');
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    container.appendChild(resizer);

    const rightPanel = document.createElement('section');
    rightPanel.className = rightPanelClass;
    container.appendChild(rightPanel);

    return { container, leftPanel, resizer, rightPanel };
  }

  it('keeps right panel visible after hiding sidebar (teaching- prefix)', () => {
    const { container, rightPanel } = createGridFixture('teaching-right-panel');
    document.body.appendChild(container);

    const ctx = createTestContext({ container });
    const instance = capabilityFactories['sidebar-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;
    btn.click();

    // Right panel must not be hidden
    const cs = getComputedStyle(rightPanel);
    expect(cs.display).not.toBe('none');

    // Right panel must still be attached to the DOM
    expect(container.contains(rightPanel)).toBe(true);

    instance.dispose();
    container.remove();
  });

  it('keeps right panel visible after hiding sidebar (srgb- prefix)', () => {
    const { container, rightPanel } = createGridFixture('srgb-right-panel');
    document.body.appendChild(container);

    const ctx = createTestContext({ container });
    const instance = capabilityFactories['sidebar-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;
    btn.click();

    // Right panel must not be hidden
    const cs = getComputedStyle(rightPanel);
    expect(cs.display).not.toBe('none');

    // Right panel must still be attached to the DOM
    expect(container.contains(rightPanel)).toBe(true);

    instance.dispose();
    container.remove();
  });

  it('saves and restores CSS-function left widths (minmax)', () => {
    const ctx = createTestContext();
    ctx.container.style.gridTemplateColumns = 'minmax(260px, 40%) 8px 1fr';

    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    ctx.container.appendChild(sidebar);

    const resizer = document.createElement('div');
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    ctx.container.appendChild(resizer);

    const instance = capabilityFactories['sidebar-toggle']({}).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const btn = ctx.container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;

    // Hide -> must save the minmax track
    btn.click();
    expect(ctx.container.style.gridTemplateColumns).toBe('0px 0px 1fr');

    // Show -> must restore the full minmax(260px, 40%) not a truncated string
    btn.click();
    expect(ctx.container.style.gridTemplateColumns).toBe(
      'minmax(260px, 40%) 8px 1fr'
    );

    instance.dispose();
  });
});

// ============================================================================
// 7. debug-overlay Capability
// ============================================================================

describe('debug-overlay capability', () => {
  it('creates FPS overlay element', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['debug-overlay']({
      intervalMs: 100
    }).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    const overlay = ctx.container.querySelector('div[style]');
    expect(overlay).toBeTruthy();
    expect(overlay?.textContent).toContain('FPS');
    instance.dispose();
  });

  it('dispose removes overlay element and clears interval', () => {
    const ctx = createTestContext();
    const instance = capabilityFactories['debug-overlay']({
      intervalMs: 100
    }).mount(
      {
        control: document.createElement('div'),
        animation: document.createElement('div')
      },
      {},
      ctx
    );

    instance.dispose();
    const overlay = ctx.container.querySelector('div[style]');
    expect(overlay).toBeNull();
  });
});

// ============================================================================
// 8. resizer Capability
// ============================================================================

describe('resizer capability', () => {
  it('mounts without error', () => {
    const ctx = createTestContext();
    ctx.container.style.gridTemplateColumns = '280px 8px 1fr';

    const resizerEl = document.createElement('div');
    resizerEl.className = 'layout-resizer-v';
    ctx.container.appendChild(resizerEl);

    const instance = capabilityFactories
      .resizer({
        direction: 'vertical',
        targetSelector: '.layout-left-panel'
      })
      .mount(
        {
          control: document.createElement('div'),
          animation: document.createElement('div')
        },
        {},
        ctx
      );

    expect(instance).toBeDefined();
    expect(typeof instance.dispose).toBe('function');
    instance.dispose();
  });
});

// ============================================================================
// 9. Container + ILayout Integration (wireCapabilities path)
// ============================================================================

vi.mock('../../src/app/layouts/registry', () => {
  const mockLayout = {
    id: 'split-right',
    name: 'Test Layout',
    description: 'mock',
    supportedSlots: ['control', 'animation'],
    capabilities: [],
    getSlots: () => ({
      control: document.createElement('div'),
      animation: document.createElement('div')
    }),
    mount: vi.fn().mockResolvedValue(undefined),
    unmount: vi.fn().mockResolvedValue(undefined),
    setTheme: vi.fn(),
    handleResize: vi.fn(),
    getLayoutState: vi.fn(() => ({})),
    restoreLayoutState: vi.fn(),
    replaceSlotElement: vi.fn(() => null)
  };

  return {
    layoutRegistry: {
      has: vi.fn(() => true),
      create: vi.fn(() => ({
        ...mockLayout,
        capabilities: [] as Array<{ id: string; config?: unknown }>
      })),
      getAllMetadata: vi.fn(() => []),
      // demo-profile 能力的 demoCapable 查询：split-right 为 true，其余缺省 false
      getMetadata: vi.fn((id: string) =>
        id === 'split-right'
          ? ({ id, demoCapable: true } as Record<string, unknown>)
          : undefined
      ),
      returnInstance: vi.fn(),
      clearPool: vi.fn()
    }
  };
});

vi.mock('../../src/app/layouts/selector', () => ({
  layoutSelector: { select: vi.fn(() => 'split-right') }
}));

describe('SceneContainerImpl with ILayout', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
    mount.style.cssText = 'width: 1200px; height: 800px;';
    document.body.appendChild(mount);
    localStorage.clear();
  });

  afterEach(() => {
    mount.remove();
    vi.clearAllMocks();
  });

  it('creates container with default state', () => {
    const container = new SceneContainerImpl({ mount });
    expect(container.currentLayout).toBeNull();
    expect(container.currentScene).toBeNull();
    expect(container.getTheme()).toBe('light');
    container.dispose();
  });

  it('setTheme applies to document.documentElement', () => {
    const container = new SceneContainerImpl({ mount });
    container.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    container.dispose();
  });

  it('dispose cleans without error', () => {
    const container = new SceneContainerImpl({ mount });
    expect(() => container.dispose()).not.toThrow();
  });

  it('event on/off works', () => {
    const container = new SceneContainerImpl({ mount });
    const spy = vi.fn();
    const unsub = container.on('theme:change', spy);
    container.setTheme('dark');
    expect(spy).toHaveBeenCalledTimes(1);

    unsub();
    container.setTheme('light');
    expect(spy).toHaveBeenCalledTimes(1);
    container.dispose();
  });
});

// ============================================================================
// 10. v2 Layout class integrity
// ============================================================================

describe('SplitRightLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.cssText = 'width: 1200px; height: 800px;';
  });

  it('implements ILayout shape', () => {
    const layout = new SplitRightLayout(container);
    expect(layout.id).toBe('split-right');
    expect(Array.isArray(layout.capabilities)).toBe(true);
    expect(layout.capabilities!.length).toBeGreaterThanOrEqual(8);
  });

  it('mount produces DOM with expected structure', async () => {
    const layout = new SplitRightLayout(container, { hideHeader: true });
    const slots = await layout.mount();

    expect(slots.control).toBeInstanceOf(HTMLElement);
    expect(slots.animation).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('.teaching-stage-canvas')).toBeTruthy();
  });

  it('mount includes header when not hidden', async () => {
    const layout = new SplitRightLayout(container, { title: 'Physics' });
    const slots = await layout.mount();
    expect(slots.header).toBeInstanceOf(HTMLElement);
  });

  it('setTheme syncs to the container (documentElement is container-owned)', async () => {
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();
    layout.setTheme('dark');
    expect(container.getAttribute('data-theme')).toBe('dark');
  });

  it('getLayoutState / restoreLayoutState round-trip', async () => {
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    layout.restoreLayoutState({ leftRatio: 0.25 });
    expect(layout.getLayoutState().leftRatio).toBe(0.25);
  });

  it('handleResize switches to single-column on mobile', async () => {
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    layout.handleResize(400, 800);
    expect(container.style.gridTemplateColumns).toBe('1fr');
  });

  it('unmount clears container', async () => {
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();
    expect(container.children.length).toBeGreaterThan(0);

    await layout.unmount();
    expect(container.children.length).toBe(0);
  });
});

describe('MobileStackLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.cssText = 'width: 375px; height: 812px;';
  });

  it('mount produces scroll container with all slots', async () => {
    const layout = new MobileStackLayout(container);
    const slots = await layout.mount();

    expect(slots.control).toBeInstanceOf(HTMLElement);
    expect(slots.animation).toBeInstanceOf(HTMLElement);
    expect(slots.graph).toBeInstanceOf(HTMLElement);
    expect(slots.readout).toBeInstanceOf(HTMLElement);
  });

  it('mount omits graph when hasGraph is false', async () => {
    const layout = new MobileStackLayout(container, { hasGraph: false });
    const slots = await layout.mount();
    expect(slots.graph).toBeUndefined();
  });

  it('declares mobile-appropriate capabilities (no resizer)', () => {
    const layout = new MobileStackLayout(container);
    const ids = layout.capabilities!.map((c) => c.id);
    expect(ids).not.toContain('resizer');
    expect(ids).not.toContain('sidebar-toggle');
    expect(ids).toContain('transport-bar');
    expect(ids).toContain('readout-panel');
  });

  it('handleResize toggles is-landscape class', async () => {
    const layout = new MobileStackLayout(container);
    await layout.mount();

    layout.handleResize(800, 600);
    expect(container.classList.contains('is-landscape')).toBe(true);

    layout.handleResize(375, 812);
    expect(container.classList.contains('is-landscape')).toBe(false);
  });
});

describe('SplitRightGraphBottomLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.cssText = 'width: 1200px; height: 800px;';
  });

  it('mount creates graph section with configurable columns', async () => {
    const layout = new SplitRightGraphBottomLayout(container, {
      hideHeader: true,
      graphColumns: 2
    });
    const slots = await layout.mount();

    expect(slots.graph).toBeInstanceOf(HTMLElement);
    expect(slots.graph!.getAttribute('data-columns')).toBe('2');
  });

  it('mount creates horizontal resizer', async () => {
    const layout = new SplitRightGraphBottomLayout(container, {
      hideHeader: true
    });
    await layout.mount();

    const hResizer = container.querySelector('[aria-orientation="horizontal"]');
    expect(hResizer).toBeTruthy();
    expect(hResizer!.getAttribute('role')).toBe('separator');
  });

  it('getLayoutState / restoreLayoutState preserves graphHeight', async () => {
    const layout = new SplitRightGraphBottomLayout(container, {
      hideHeader: true
    });
    await layout.mount();

    layout.restoreLayoutState({ graphHeight: 350 });
    expect(layout.getLayoutState().graphHeight).toBe(350);
  });
});

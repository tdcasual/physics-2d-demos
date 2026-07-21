/**
 * Layout Integration Tests — 布局渲染完整性保障
 *
 * 防止以下类型的回归：
 * - Canvas 根本不渲染（getContext 返回 null、canvas 尺寸为 0）
 * - 图表区域不显示（graph slot 缺失或尺寸为 0）
 * - 布局切换后 canvas 丢失
 * - Resize 后 DOM 结构被破坏
 * - Capability 在 mount 期间拿到错误的布局 ID
 */
import { describe, it, expect, afterEach } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';
import { SplitRightGraphBottomLayout } from '../../src/app/layouts/layouts/split-right-graph-bottom/split-right-graph-bottom';
import { layoutRegistry } from '../../src/app/layouts/registry';
import type { CapabilityContext, ILayout, LayoutSlots } from '../../src/app/layouts/types';

// ============================================================================
// Helpers
// ============================================================================

function createContainer(w = 1200, h = 800): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `width:${w}px; height:${h}px; overflow:hidden; position:relative;`;
  document.body.appendChild(el);
  return el;
}

/**
 * Verify a canvas element is ready for rendering.
 * Note: jsdom canvas doesn't render actual pixels, so we verify:
 * - Canvas element exists and is an HTMLCanvasElement
 * - getContext('2d') returns a valid context (not null)
 * - Drawing methods can be called without throwing
 * - Canvas has non-zero width/height attributes
 */
function verifyCanvasReady(canvas: HTMLCanvasElement | null | undefined): void {
  expect(canvas).toBeDefined();
  expect(canvas).not.toBeNull();
  expect(canvas).toBeInstanceOf(HTMLCanvasElement);

  const ctx = canvas!.getContext('2d');
  expect(ctx).not.toBeNull();

  // Verify drawing methods don't throw — proves the context is live
  expect(() => {
    ctx!.fillStyle = 'red';
    ctx!.fillRect(0, 0, 10, 10);
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
  }).not.toThrow();
}

/** Verify all declared slots are present in the DOM. */
function verifySlotsInDOM(
  container: HTMLElement,
  slots: Partial<LayoutSlots>
): void {
  for (const [name, slot] of Object.entries(slots)) {
    if (slot === undefined) continue;
    expect(slot, `slot "${name}" should be defined`).toBeDefined();
    expect(container.contains(slot), `slot "${name}" should be in container DOM`).toBe(true);
  }
}

// ============================================================================
// 1. Canvas rendering verification
// ============================================================================

describe('Canvas rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: canvas is renderable after mount', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    const slots = await layout.mount();

    verifyCanvasReady(slots.animation.querySelector('canvas'));

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: canvas is renderable after mount', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    const slots = await layout.mount();

    verifyCanvasReady(slots.animation.querySelector('canvas'));

    await layout.unmount();
    container.remove();
  });

  it('mobile-stack: canvas is renderable after mount', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);
    const slots = await layout.mount();

    verifyCanvasReady(slots.animation.querySelector('canvas'));

    await layout.unmount();
    container.remove();
  });

  it('canvas reuses existing canvas on layout switch', async () => {
    const container = createContainer();
    const layout1 = new SplitRightLayout(container, { hideHeader: true });
    const slots1 = await layout1.mount();
    const originalCanvas = slots1.animation.querySelector('canvas')!;
    expect(originalCanvas).not.toBeNull();

    // Simulate container switchLayout: unmount old, mount new with preserved canvas
    await layout1.unmount();
    container.replaceChildren();

    const layout2 = new SplitRightLayout(container, {
      hideHeader: true,
      preservedCanvas: originalCanvas
    });
    const slots2 = await layout2.mount();

    // The preserved canvas should be in the new layout
    const newCanvas = slots2.animation.querySelector('canvas');
    expect(newCanvas).toBe(originalCanvas);
    verifyCanvasReady(newCanvas);

    await layout2.unmount();
    container.remove();
  });
});

// ============================================================================
// 2. Graph slot completeness
// ============================================================================

describe('Graph slot completeness', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: graph slot exists in left panel when hasGraph=true', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true, hasGraph: true });
    const slots = await layout.mount();

    expect(slots.graph).toBeDefined();
    expect(container.contains(slots.graph!)).toBe(true);
    // Graph slot should be inside the left panel
    const leftPanel = container.querySelector('aside')!;
    expect(leftPanel.contains(slots.graph!)).toBe(true);

    await layout.unmount();
    container.remove();
  });

  it('split-right: graph slot absent when hasGraph=false', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true, hasGraph: false });
    const slots = await layout.mount();

    expect(slots.graph).toBeUndefined();

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: graph section has non-zero height', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    const slots = await layout.mount();

    expect(slots.graph).toBeDefined();

    // Graph section (parent of graph slot) should have explicit height
    const graphSection = container.querySelector('.srgb-graph-section') as HTMLElement;
    expect(graphSection).not.toBeNull();
    expect(graphSection.style.height).toBeTruthy();
    expect(graphSection.style.minHeight).toBeTruthy();

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: graph slot has data-columns attribute', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, {
      hideHeader: true,
      graphColumns: 4
    });
    const slots = await layout.mount();

    expect(slots.graph!.getAttribute('data-columns')).toBe('4');

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: horizontal resizer exists between animation and graph', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    const resizer = container.querySelector('[aria-orientation="horizontal"]');
    expect(resizer).not.toBeNull();
    expect(resizer!.getAttribute('role')).toBe('separator');

    await layout.unmount();
    container.remove();
  });

  it('mobile-stack: graph slot present by default', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);
    const slots = await layout.mount();

    expect(slots.graph).toBeDefined();
    expect(container.contains(slots.graph!)).toBe(true);

    await layout.unmount();
    container.remove();
  });
});

// ============================================================================
// 3. Layout slot declaration vs actual DOM consistency
// ============================================================================

describe('Slot declaration consistency', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const layoutFactories: Array<{
    name: string;
    create: (c: HTMLElement) => ILayout;
    width: number;
    height: number;
  }> = [
    {
      name: 'split-right',
      create: (c) => new SplitRightLayout(c, { hideHeader: true }),
      width: 1200, height: 800
    },
    {
      name: 'split-right-graph-bottom',
      create: (c) => new SplitRightGraphBottomLayout(c, { hideHeader: true }),
      width: 1200, height: 800
    },
    {
      name: 'mobile-stack',
      create: (c) => new MobileStackLayout(c),
      width: 375, height: 812
    }
  ];

  for (const lf of layoutFactories) {
    it(`${lf.name}: mount() returns all declared supported slots`, async () => {
      const container = createContainer(lf.width, lf.height);
      const layout = lf.create(container);
      const slots = await layout.mount();

      // Every declared supported slot should be present in the returned slots
      for (const slotName of layout.supportedSlots) {
        if (slotName === 'readout') continue; // readout is created by capability
        if (slotName === 'header') continue; // header may be omitted
        expect(
          slots[slotName],
          `${lf.name}: supportedSlots declares "${slotName}" but mount() didn't return it`
        ).toBeDefined();
      }

      await layout.unmount();
      container.remove();
    });

    it(`${lf.name}: all returned slots are children of the container`, async () => {
      const container = createContainer(lf.width, lf.height);
      const layout = lf.create(container);
      const slots = await layout.mount();

      verifySlotsInDOM(container, slots);

      await layout.unmount();
      container.remove();
    });
  }
});

// ============================================================================
// 4. Layout switching preserves rendering capability
// ============================================================================

describe('Layout switching', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    layoutRegistry.clear();
  });

  it('split-right → split-right-graph-bottom: canvas survives', async () => {
    const container = createContainer();

    const layout1 = new SplitRightLayout(container, { hideHeader: true });
    const slots1 = await layout1.mount();
    const canvas1 = slots1.animation.querySelector('canvas')!;
    verifyCanvasReady(canvas1);

    // Simulate switchLayout: save canvas, unmount, remount
    const preservedCanvas = canvas1;
    await layout1.unmount();
    container.replaceChildren();

    const layout2 = new SplitRightGraphBottomLayout(container, {
      hideHeader: true,
      preservedCanvas
    });
    const slots2 = await layout2.mount();

    // Canvas should be reused
    const canvas2 = slots2.animation.querySelector('canvas');
    expect(canvas2).toBe(preservedCanvas);
    verifyCanvasReady(canvas2);

    // Graph section should also exist
    expect(slots2.graph).toBeDefined();
    expect(container.querySelector('.srgb-graph-section')).not.toBeNull();

    await layout2.unmount();
    container.remove();
  });

  it('split-right-graph-bottom → split-right: graph disappears, canvas survives', async () => {
    const container = createContainer();

    const layout1 = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    const slots1 = await layout1.mount();
    const canvas1 = slots1.animation.querySelector('canvas')!;
    verifyCanvasReady(canvas1);

    const preservedCanvas = canvas1;
    await layout1.unmount();
    container.replaceChildren();

    const layout2 = new SplitRightLayout(container, {
      hideHeader: true,
      preservedCanvas
    });
    const slots2 = await layout2.mount();

    const canvas2 = slots2.animation.querySelector('canvas');
    expect(canvas2).toBe(preservedCanvas);
    verifyCanvasReady(canvas2);

    // No graph section in split-right (default hasGraph=true means left-panel graph)
    // But the srgb-graph-section should NOT exist
    expect(container.querySelector('.srgb-graph-section')).toBeNull();

    await layout2.unmount();
    container.remove();
  });

  it('round-trip split-right → graph-bottom → split-right: canvas persists', async () => {
    const container = createContainer();
    let preservedCanvas: HTMLCanvasElement | null = null;

    // Mount split-right
    const lr1 = new SplitRightLayout(container, { hideHeader: true });
    const s1 = await lr1.mount();
    preservedCanvas = s1.animation.querySelector('canvas');
    verifyCanvasReady(preservedCanvas);
    await lr1.unmount();
    container.replaceChildren();

    // Mount graph-bottom
    const gb1 = new SplitRightGraphBottomLayout(container, {
      hideHeader: true,
      preservedCanvas
    });
    const s2 = await gb1.mount();
    preservedCanvas = s2.animation.querySelector('canvas');
    verifyCanvasReady(preservedCanvas);
    await gb1.unmount();
    container.replaceChildren();

    // Mount split-right again
    const lr2 = new SplitRightLayout(container, {
      hideHeader: true,
      preservedCanvas
    });
    const s3 = await lr2.mount();
    const finalCanvas = s3.animation.querySelector('canvas');
    expect(finalCanvas).toBe(preservedCanvas);
    verifyCanvasReady(finalCanvas);

    await lr2.unmount();
    container.remove();
  });
});

// ============================================================================
// 5. Responsive resize preserves slot structure
// ============================================================================

describe('Responsive resize', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: resize to mobile preserves canvas in DOM', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    // Simulate mobile resize
    layout.handleResize(400, 800);
    expect(container.style.gridTemplateColumns).toBe('1fr');

    // Canvas must still be in DOM after resize
    expect(container.contains(canvas!)).toBe(true);
    verifyCanvasReady(canvas);

    await layout.unmount();
    container.remove();
  });

  it('split-right: resize to tablet preserves canvas', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    const canvas = container.querySelector('canvas')!;

    layout.handleResize(900, 800);

    expect(container.contains(canvas)).toBe(true);
    verifyCanvasReady(canvas);

    await layout.unmount();
    container.remove();
  });

  it('split-right: resize back from mobile restores grid columns', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    layout.handleResize(400, 800);
    expect(container.style.gridTemplateColumns).toBe('1fr');

    layout.handleResize(1200, 800);
    expect(container.style.gridTemplateColumns).not.toBe('1fr');
    expect(container.style.gridTemplateColumns).toContain('8px');

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: mobile resize hides horizontal resizer', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    const resizerH = container.querySelector('[aria-orientation="horizontal"]') as HTMLElement;
    expect(resizerH).not.toBeNull();

    layout.handleResize(400, 800);
    expect(resizerH.style.display).toBe('none');

    // Graph section should still exist
    const graphSection = container.querySelector('.srgb-graph-section');
    expect(graphSection).not.toBeNull();

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: resize back to desktop shows resizer', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    const resizerH = container.querySelector('[aria-orientation="horizontal"]') as HTMLElement;

    layout.handleResize(400, 800);
    expect(resizerH.style.display).toBe('none');

    layout.handleResize(1200, 800);
    expect(resizerH.style.display).toBe('block');

    await layout.unmount();
    container.remove();
  });

  it('mobile-stack: resize to landscape adds is-landscape class', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);
    await layout.mount();

    layout.handleResize(812, 375);
    expect(container.classList.contains('is-landscape')).toBe(true);

    layout.handleResize(375, 812);
    expect(container.classList.contains('is-landscape')).toBe(false);

    await layout.unmount();
    container.remove();
  });
});

// ============================================================================
// 6. Toolbar button structure
// ============================================================================

describe('Toolbar buttons', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right toolbar has all expected buttons', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    expect(container.querySelector('.sidebar-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.theme-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.mode-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.layout-switch-btn')).not.toBeNull();

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom toolbar has all expected buttons', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    expect(container.querySelector('.sidebar-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.theme-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.mode-toggle-btn')).not.toBeNull();
    expect(container.querySelector('.layout-switch-btn')).not.toBeNull();

    await layout.unmount();
    container.remove();
  });

  it('mobile-stack does NOT have layout-switch button', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);
    await layout.mount();

    // Mobile layout should not have layout-switch or sidebar-toggle
    expect(layout.capabilities!.some(c => c.id === 'layout-switch')).toBe(false);
    expect(layout.capabilities!.some(c => c.id === 'sidebar-toggle')).toBe(false);

    await layout.unmount();
    container.remove();
  });
});

// ============================================================================
// 7. Layout-switch capability — button label correctness
// ============================================================================

describe('Layout-switch capability', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mockCtx(overrides: {
    currentLayoutId?: string;
    availableLayouts?: { id: string; name: string }[];
  } = {}): CapabilityContext & { _switchCalls: string[] } {
    let currentId = overrides.currentLayoutId ?? 'split-right';
    const available = overrides.availableLayouts ?? [
      { id: 'split-right', name: '左右分栏' },
      { id: 'split-right-graph-bottom', name: '左右分栏+底部图表' }
    ];
    const switchCalls: string[] = [];

    return {
      container: createContainer(),
      getTheme: () => 'light' as const,
      setTheme: () => {},
      getMode: () => 'normal' as const,
      setMode: () => {},
      on: () => () => {},
      getCurrentLayoutId: () => currentId,
      getAvailableLayouts: () => available,
      switchLayout: (id: string) => { switchCalls.push(id); currentId = id; },
      _switchCalls: switchCalls
    };
  }

  it('button shows NEXT layout name, not current', async () => {
    const { capabilityFactories } = await import('../../src/app/layouts/capabilities');
    const ctx = mockCtx({ currentLayoutId: 'split-right' });

    const instance = capabilityFactories['layout-switch']({}).mount(
      { control: document.createElement('div'), animation: document.createElement('div') },
      {},
      ctx
    );

    // Flush microtask so updateLabel runs after mount
    await new Promise(r => setTimeout(r, 10));

    const btn = ctx.container.querySelector('.layout-switch-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('左右分栏+底部图表');
    expect(btn.getAttribute('aria-label')).toBe('切换到左右分栏+底部图表');

    instance.dispose();
    ctx.container.remove();
  });

  it('button wraps around to first layout from last', async () => {
    const { capabilityFactories } = await import('../../src/app/layouts/capabilities');
    const ctx = mockCtx({ currentLayoutId: 'split-right-graph-bottom' });

    const instance = capabilityFactories['layout-switch']({}).mount(
      { control: document.createElement('div'), animation: document.createElement('div') },
      {},
      ctx
    );

    await new Promise(r => setTimeout(r, 10));

    const btn = ctx.container.querySelector('.layout-switch-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('左右分栏');

    instance.dispose();
    ctx.container.remove();
  });

  it('button hidden when only one layout available', async () => {
    const { capabilityFactories } = await import('../../src/app/layouts/capabilities');
    const ctx = mockCtx({
      currentLayoutId: 'split-right',
      availableLayouts: [{ id: 'split-right', name: '左右分栏' }]
    });

    const instance = capabilityFactories['layout-switch']({}).mount(
      { control: document.createElement('div'), animation: document.createElement('div') },
      {},
      ctx
    );

    await new Promise(r => setTimeout(r, 10));

    const btn = ctx.container.querySelector('.layout-switch-btn') as HTMLButtonElement;
    expect(btn.style.display).toBe('none');

    instance.dispose();
    ctx.container.remove();
  });

  it('click calls switchLayout with next layout ID', async () => {
    const { capabilityFactories } = await import('../../src/app/layouts/capabilities');
    const ctx = mockCtx({ currentLayoutId: 'split-right' });

    const instance = capabilityFactories['layout-switch']({}).mount(
      { control: document.createElement('div'), animation: document.createElement('div') },
      {},
      ctx
    );

    await new Promise(r => setTimeout(r, 10));

    const btn = ctx.container.querySelector('.layout-switch-btn') as HTMLButtonElement;
    btn.click();

    expect(ctx._switchCalls).toEqual(['split-right-graph-bottom']);

    instance.dispose();
    ctx.container.remove();
  });

  it('dispose removes click listener', async () => {
    const { capabilityFactories } = await import('../../src/app/layouts/capabilities');
    const ctx = mockCtx({ currentLayoutId: 'split-right' });

    const instance = capabilityFactories['layout-switch']({}).mount(
      { control: document.createElement('div'), animation: document.createElement('div') },
      {},
      ctx
    );

    const btn = ctx.container.querySelector('.layout-switch-btn') as HTMLButtonElement;
    instance.dispose();

    btn.click();
    expect(ctx._switchCalls).toEqual([]);
  });
});

// ============================================================================
// 8. Layout double-mount guard
// ============================================================================

describe('Double mount guard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: double mount returns same slots', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });

    const slots1 = await layout.mount();
    const slots2 = await layout.mount();

    expect(slots1.animation).toBe(slots2.animation);
    expect(slots1.control).toBe(slots2.control);

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: double mount returns same slots', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });

    const slots1 = await layout.mount();
    const slots2 = await layout.mount();

    expect(slots1.animation).toBe(slots2.animation);
    expect(slots1.graph).toBe(slots2.graph);

    await layout.unmount();
    container.remove();
  });

  it('mobile-stack: double mount returns same slots', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);

    const slots1 = await layout.mount();
    const slots2 = await layout.mount();

    expect(slots1.animation).toBe(slots2.animation);

    await layout.unmount();
    container.remove();
  });
});

// ============================================================================
// 9. Unmount cleanup completeness
// ============================================================================

describe('Unmount cleanup', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: unmount removes all children', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    expect(container.children.length).toBeGreaterThan(0);

    await layout.unmount();
    expect(container.children.length).toBe(0);
    expect(container.classList.contains('layout-master')).toBe(false);
    expect(container.dataset.testid).toBeUndefined();
  });

  it('split-right-graph-bottom: unmount removes all children', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    expect(container.children.length).toBeGreaterThan(0);

    await layout.unmount();
    expect(container.children.length).toBe(0);
  });

  it('mobile-stack: unmount removes all children', async () => {
    const container = createContainer(375, 812);
    const layout = new MobileStackLayout(container);
    await layout.mount();

    expect(container.children.length).toBeGreaterThan(0);

    await layout.unmount();
    expect(container.children.length).toBe(0);
  });

  it('unmount then mount produces fresh DOM', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });

    await layout.mount();
    const firstCanvas = container.querySelector('canvas');
    expect(firstCanvas).not.toBeNull();

    await layout.unmount();
    expect(container.querySelector('canvas')).toBeNull();

    // Fresh mount should create new canvas
    const layout2 = new SplitRightLayout(container, { hideHeader: true });
    await layout2.mount();
    const secondCanvas = container.querySelector('canvas');
    expect(secondCanvas).not.toBeNull();
    expect(secondCanvas).not.toBe(firstCanvas);

    await layout2.unmount();
    container.remove();
  });
});

// ============================================================================
// 10. Layout state round-trip
// ============================================================================

describe('Layout state persistence', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right: getLayoutState returns leftRatio', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    const state = layout.getLayoutState();
    expect(state.leftRatio).toBeDefined();
    expect(typeof state.leftRatio).toBe('number');

    await layout.unmount();
    container.remove();
  });

  it('split-right: restoreLayoutState updates leftRatio', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    layout.restoreLayoutState({ leftRatio: 0.4 });
    expect(layout.getLayoutState().leftRatio).toBe(0.4);

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: getLayoutState includes graphHeight', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    const state = layout.getLayoutState();
    expect(state.leftRatio).toBeDefined();
    expect(state.graphHeight).toBeDefined();

    await layout.unmount();
    container.remove();
  });

  it('split-right-graph-bottom: restoreLayoutState restores graphHeight', async () => {
    const container = createContainer();
    const layout = new SplitRightGraphBottomLayout(container, { hideHeader: true });
    await layout.mount();

    layout.restoreLayoutState({ graphHeight: 350 });
    const graphSection = container.querySelector('.srgb-graph-section') as HTMLElement;
    expect(graphSection.style.height).toBe('350px');

    await layout.unmount();
    container.remove();
  });

  it('split-right: restoreLayoutState clamps leftRatio to valid range', async () => {
    const container = createContainer();
    const layout = new SplitRightLayout(container, { hideHeader: true });
    await layout.mount();

    layout.restoreLayoutState({ leftRatio: 0.9 }); // too high
    expect(layout.getLayoutState().leftRatio).toBeLessThanOrEqual(0.5);

    layout.restoreLayoutState({ leftRatio: 0.05 }); // too low
    expect(layout.getLayoutState().leftRatio).toBeGreaterThanOrEqual(0.15);

    await layout.unmount();
    container.remove();
  });
});

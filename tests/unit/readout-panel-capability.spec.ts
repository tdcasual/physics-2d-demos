/**
 * Readout Panel Capability 集成测试
 *
 * 在真实 DOM 环境中测试 readout-panel 的挂载、折叠/展开、
 * 拖拽、数据更新、自适列数和销毁流程。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { capabilityFactories } from '../../src/app/layouts/capabilities';
import type {
  CapabilityContext,
  LayoutSlots
} from '../../src/app/layouts/types';

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
    ...overrides
  };
}

function createSlots(): LayoutSlots {
  return {
    animation: document.createElement('div'),
    control: document.createElement('div')
  };
}

// ============================================================================
// Mount
// ============================================================================

describe('readout-panel mount', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;

  beforeEach(() => {
    ctx = createTestContext();
    slots = createSlots();
  });

  it('creates panel with teaching prefix and collapsed state by default', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector('.teaching-readout-panel');
    expect(panel).toBeTruthy();
    expect(panel!.classList.contains('is-collapsed')).toBe(true);
    expect(panel!.getAttribute('role')).toBe('region');
    expect(panel!.getAttribute('aria-label')).toBe('数据读数');

    inst.dispose();
  });

  it('contains header with title and toggle button', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const header = slots.animation.querySelector('.teaching-readout-header');
    expect(header).toBeTruthy();
    expect(header!.querySelector('.teaching-readout-title')?.textContent).toBe(
      '数据读数'
    );

    const toggle = header!.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toBe('展开');
    expect(toggle.getAttribute('aria-label')).toBe('展开');

    inst.dispose();
  });

  it('contains a slot list with adaptive class and data-columns', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const slotList = slots.animation.querySelector('.teaching-readout-slot');
    expect(slotList).toBeTruthy();
    expect(
      slotList!.classList.contains('teaching-readout-slot--adaptive')
    ).toBe(true);
    expect(slotList!.getAttribute('data-columns')).toBe('auto');

    inst.dispose();
  });

  it('uses custom label for title', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, { label: '自定义标签' }, ctx);

    const title = slots.animation.querySelector('.teaching-readout-title');
    expect(title?.textContent).toBe('自定义标签');

    inst.dispose();
  });

  it('uses srgb prefix when configured', () => {
    const def = capabilityFactories['readout-panel']({ cssPrefix: 'srgb' });
    const inst = def.mount(slots, {}, ctx);

    expect(slots.animation.querySelector('.srgb-readout-panel')).toBeTruthy();
    expect(slots.animation.querySelector('.srgb-readout-header')).toBeTruthy();
    expect(slots.animation.querySelector('.srgb-readout-toggle')).toBeTruthy();
    expect(slots.animation.querySelector('.srgb-readout-slot')).toBeTruthy();

    inst.dispose();
  });

  it('starts expanded when collapsed config is false', () => {
    const def = capabilityFactories['readout-panel']({ collapsed: false });
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector('.teaching-readout-panel');
    expect(panel!.classList.contains('is-collapsed')).toBe(false);

    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;
    expect(toggle.textContent).toBe('折叠');

    inst.dispose();
  });

  it('appends to readout slot when position is inline and slot exists', () => {
    const readoutSlot = document.createElement('div');
    slots.readout = readoutSlot;

    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, { position: 'inline' }, ctx);

    expect(readoutSlot.querySelector('.teaching-readout-panel')).toBeTruthy();

    inst.dispose();
  });

  it('falls back to container when no animation slot', () => {
    const emptySlots = {
      control: document.createElement('div'),
      animation: null as unknown as HTMLElement
    };
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(emptySlots, {}, ctx);

    expect(ctx.container.querySelector('.teaching-readout-panel')).toBeTruthy();

    inst.dispose();
  });

  it('sets absolute positioning inline style for top-right position', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    expect(panel.style.position).toBe('absolute');
    expect(panel.style.right).toBe('12px');
    expect(panel.style.top).toBe('60px');

    inst.dispose();
  });

  it('does not set position inline style for inline position', () => {
    slots.readout = document.createElement('div');
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, { position: 'inline' }, ctx);

    const panel = slots.readout!.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    expect(panel.style.position).toBe('');

    inst.dispose();
  });
});

// ============================================================================
// Toggle
// ============================================================================

describe('readout-panel toggle', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;

  beforeEach(() => {
    ctx = createTestContext();
    slots = createSlots();
  });

  it('expands on toggle click when initially collapsed', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;

    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(false);
    expect(toggle.textContent).toBe('折叠');
    expect(toggle.getAttribute('aria-label')).toBe('折叠');

    inst.dispose();
  });

  it('collapses on second toggle click', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;

    // First click → expand
    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(false);

    // Second click → collapse
    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(true);
    expect(toggle.textContent).toBe('展开');

    inst.dispose();
  });

  it('starts expanded and collapses on click when collapsed config is false', () => {
    const def = capabilityFactories['readout-panel']({ collapsed: false });
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;

    expect(panel.classList.contains('is-collapsed')).toBe(false);

    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(true);
    expect(toggle.textContent).toBe('展开');

    inst.dispose();
  });

  it('dispose removes toggle click listener', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;

    inst.dispose();

    // Click should no longer affect panel state
    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(true);

    // Panel should be removed from DOM
    expect(slots.animation.querySelector('.teaching-readout-panel')).toBeNull();
  });
});

// ============================================================================
// Drag
// ============================================================================

describe('readout-panel drag', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;

  beforeEach(() => {
    ctx = createTestContext();
    ctx.container.style.position = 'relative';
    ctx.container.style.width = '800px';
    ctx.container.style.height = '600px';
    document.body.appendChild(ctx.container);

    slots = createSlots();
  });

  afterEach(() => {
    ctx.container.remove();
  });

  function mountPanel() {
    const def = capabilityFactories['readout-panel']({});
    return def.mount(slots, {}, ctx);
  }

  it('sets cursor: move on header for drag affordance', () => {
    const inst = mountPanel();
    const header = slots.animation.querySelector(
      '.teaching-readout-header'
    ) as HTMLElement;
    expect(header.style.cursor).toBe('move');
    inst.dispose();
  });

  it('skips drag initiation when clicking the toggle button', () => {
    const inst = mountPanel();
    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;

    // Set initial position
    panel.style.position = 'absolute';
    panel.style.left = '100px';
    panel.style.top = '100px';

    // Pointer down on toggle button should NOT start drag
    toggle.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 150,
        clientY: 120,
        bubbles: true,
        pointerId: 1
      })
    );

    // Even with subsequent pointermove, position should not change
    const header = slots.animation.querySelector(
      '.teaching-readout-header'
    ) as HTMLElement;
    header.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 250,
        clientY: 220,
        bubbles: true,
        pointerId: 1
      })
    );

    // Panel should NOT have moved (drag was blocked)
    // The left/top should still be the ones we set explicitly
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('100px');

    header.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
    );
    inst.dispose();
  });

  it('moves panel on header pointerdown + pointermove', () => {
    const inst = mountPanel();
    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    const header = slots.animation.querySelector(
      '.teaching-readout-header'
    ) as HTMLElement;

    // Set known position — offsetParent for the panel is slots.animation since panel is appended there
    panel.style.position = 'absolute';
    panel.style.left = '100px';
    panel.style.top = '100px';

    // Simulate drag: start at (100, 100), move to (150, 130) = delta (50, 30)
    header.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
        pointerId: 1
      })
    );
    header.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 130,
        bubbles: true,
        pointerId: 1
      })
    );
    header.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
    );

    // Position should have changed (exact values depend on computed styles)
    expect(panel.style.left).not.toBe('100px');
    expect(panel.style.top).not.toBe('100px');

    inst.dispose();
  });

  it('sets user-select: none during drag', () => {
    const inst = mountPanel();
    const header = slots.animation.querySelector(
      '.teaching-readout-header'
    ) as HTMLElement;

    header.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
        pointerId: 1
      })
    );
    expect(document.body.style.userSelect).toBe('none');

    header.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
    );
    expect(document.body.style.userSelect).toBe('');

    inst.dispose();
  });

  it('does not move without pointerdown', () => {
    const inst = mountPanel();
    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;

    panel.style.position = 'absolute';
    panel.style.left = '50px';
    panel.style.top = '50px';

    // Pointer move without prior pointerdown
    const header = slots.animation.querySelector(
      '.teaching-readout-header'
    ) as HTMLElement;
    header.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
        pointerId: 1
      })
    );

    expect(panel.style.left).toBe('50px');
    expect(panel.style.top).toBe('50px');

    inst.dispose();
  });
});

// ============================================================================
// Data update
// ============================================================================

describe('readout-panel data update', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;

  beforeEach(() => {
    ctx = createTestContext();
    slots = createSlots();
  });

  it('renders readout items with labels and values', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.update?.([
      { label: '全局时间', value: '1.50 s' },
      { label: '振子数量', value: '2' }
    ]);

    const items = slots.animation.querySelectorAll('.teaching-readout-item');
    expect(items.length).toBe(2);

    expect(items[0].querySelector('.teaching-readout-label')?.textContent).toBe(
      '全局时间'
    );
    expect(items[0].querySelector('.teaching-readout-value')?.textContent).toBe(
      '1.50 s'
    );

    expect(items[1].querySelector('.teaching-readout-label')?.textContent).toBe(
      '振子数量'
    );
    expect(items[1].querySelector('.teaching-readout-value')?.textContent).toBe(
      '2'
    );

    inst.dispose();
  });

  it('replaces existing items on subsequent updates', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.update?.([{ label: 'A', value: '1' }]);
    expect(
      slots.animation.querySelectorAll('.teaching-readout-item').length
    ).toBe(1);

    inst.update?.([
      { label: 'X', value: '10' },
      { label: 'Y', value: '20' }
    ]);
    expect(
      slots.animation.querySelectorAll('.teaching-readout-item').length
    ).toBe(2);

    inst.dispose();
  });

  it('adds half-width class for items with layout: half', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.update?.([
      { label: '正常', value: '1' },
      { label: '半宽', value: '2', layout: 'half' }
    ]);

    const items = slots.animation.querySelectorAll('.teaching-readout-item');
    expect(items[0].classList.contains('teaching-readout-item--half')).toBe(
      false
    );
    expect(items[1].classList.contains('teaching-readout-item--half')).toBe(
      true
    );

    inst.dispose();
  });

  it('does nothing when data is undefined', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.update?.([{ label: 'A', value: '1' }]);
    expect(
      slots.animation.querySelectorAll('.teaching-readout-item').length
    ).toBe(1);

    // Runtime callers may still pass invalid data; implementation keeps it as a no-op.
    (inst.update as ((data: unknown) => void) | undefined)?.(undefined);
    expect(
      slots.animation.querySelectorAll('.teaching-readout-item').length
    ).toBe(1);

    inst.dispose();
  });

  it('handles null data gracefully', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.update?.([{ label: 'A', value: '1' }]);
    (inst.update as ((data: unknown) => void) | undefined)?.(null);
    expect(
      slots.animation.querySelectorAll('.teaching-readout-item').length
    ).toBe(1);

    inst.dispose();
  });
});

// ============================================================================
// Resize handle
// ============================================================================

describe('readout-panel resize handle', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;

  beforeEach(() => {
    ctx = createTestContext();
    slots = createSlots();
  });

  it('creates a resize handle element', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const handle = slots.animation.querySelector(
      '.readout-resize-handle'
    ) as HTMLElement;
    expect(handle).toBeTruthy();
    expect(handle.style.cursor).toBe('nwse-resize');

    inst.dispose();
  });

  it('dispose removes resize handle', () => {
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    inst.dispose();
    expect(slots.animation.querySelector('.readout-resize-handle')).toBeNull();
  });
});

// ============================================================================
// Adaptive columns (ResizeObserver)
// ============================================================================

describe('readout-panel adaptive columns', () => {
  let ctx: CapabilityContext;
  let slots: LayoutSlots;
  let origResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    ctx = createTestContext();
    slots = createSlots();
    origResizeObserver = globalThis.ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = origResizeObserver;
  });

  it('observes panel for size changes to set column classes', () => {
    // Track what was observed
    let observedElement: Element | null = null;
    let sizeCallback: ((width: number) => void) | null = null;

    class MockResizeObserver {
      constructor(
        callback: (entries: Array<{ contentRect: { width: number } }>) => void
      ) {
        sizeCallback = (width: number) =>
          callback([{ contentRect: { width } }]);
      }
      observe(el: Element) {
        observedElement = el;
      }
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector('.teaching-readout-panel')!;
    expect(observedElement).toBe(panel);

    const slotList = slots.animation.querySelector('.teaching-readout-slot')!;

    // Simulate narrow width → 1 column
    sizeCallback!(200);
    expect(slotList.classList.contains('teaching-readout-slot--1col')).toBe(
      true
    );

    // Simulate medium width → auto
    sizeCallback!(250);
    expect(slotList.classList.contains('teaching-readout-slot--auto')).toBe(
      true
    );

    // Simulate wider → 2 columns
    sizeCallback!(350);
    expect(slotList.classList.contains('teaching-readout-slot--2col')).toBe(
      true
    );

    // Simulate wide → 3 columns
    sizeCallback!(500);
    expect(slotList.classList.contains('teaching-readout-slot--3col')).toBe(
      true
    );

    inst.dispose();
  });

  it('dispose disconnects ResizeObserver', () => {
    let disconnected = false;
    class MockResizeObserver {
      constructor(_callback: unknown) {}
      observe() {}
      unobserve() {}
      disconnect() {
        disconnected = true;
      }
    }

    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);
    inst.dispose();

    expect(disconnected).toBe(true);
  });
});

// ============================================================================
// Full integration: mount → update → toggle → dispose
// ============================================================================

describe('readout-panel full lifecycle', () => {
  it('mount, update, toggle, drag, dispose without errors', () => {
    const ctx = createTestContext();
    ctx.container.style.position = 'relative';
    ctx.container.style.width = '800px';
    ctx.container.style.height = '600px';
    document.body.appendChild(ctx.container);

    const slots = createSlots();

    // 1. Mount
    const def = capabilityFactories['readout-panel']({});
    const inst = def.mount(slots, {}, ctx);

    const panel = slots.animation.querySelector(
      '.teaching-readout-panel'
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.classList.contains('is-collapsed')).toBe(true);

    // 2. Toggle to expand
    const toggle = slots.animation.querySelector(
      '.teaching-readout-toggle'
    ) as HTMLButtonElement;
    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(false);

    // 3. Update with data
    inst.update?.([
      { label: '时间', value: '3.14 s' },
      { label: '速度', value: '2.71 m/s', layout: 'half' },
      { label: '加速度', value: '1.41 m/s²', layout: 'half' }
    ]);

    const items = slots.animation.querySelectorAll('.teaching-readout-item');
    expect(items.length).toBe(3);
    expect(items[0].querySelector('.teaching-readout-value')?.textContent).toBe(
      '3.14 s'
    );

    // 4. Toggle back to collapse
    toggle.click();
    expect(panel.classList.contains('is-collapsed')).toBe(true);

    // 5. Dispose
    inst.dispose();
    expect(slots.animation.querySelector('.teaching-readout-panel')).toBeNull();
    expect(slots.animation.querySelector('.readout-resize-handle')).toBeNull();

    ctx.container.remove();
  });
});

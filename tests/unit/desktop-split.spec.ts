import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DesktopSplitLayout } from '../../src/app/layouts/masters/desktop-split/desktop-split';
import type { SlotConfig, SlotName } from '../../src/app/layouts/types';

class TestDesktopLayout extends DesktopSplitLayout {
  readonly id = 'test-desktop';
  readonly name = 'Test Desktop';
  readonly description = 'Test desktop split layout';
  protected cssPrefix = 'teaching';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation', 'graph'];

  getGraphSection(): HTMLElement | null {
    return document.createElement('div');
  }

  getExtraSlotConfig(): Partial<Record<SlotName, SlotConfig>> {
    return {};
  }
}

describe('DesktopSplitLayout', () => {
  let container: HTMLElement;
  let layout: TestDesktopLayout;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1200px';
    container.style.height = '800px';
    document.body.appendChild(container);
    layout = new TestDesktopLayout(container);
  });

  afterEach(async () => {
    await layout.unmount();
    container.remove();
  });

  describe('configuration', () => {
    it('should use default left ratio', () => {
      expect((layout as unknown as { leftRatio: number }).leftRatio).toBe(0.35);
    });

    it('should accept custom defaultLeftRatio', () => {
      const custom = new TestDesktopLayout(container, { defaultLeftRatio: 0.5 });
      expect((custom as unknown as { leftRatio: number }).leftRatio).toBe(0.5);
    });

    it('should clamp leftRatio between 0.2 and 0.5 on restore', () => {
      layout.restoreLayoutState({ leftRatio: 0.1 });
      expect((layout as unknown as { leftRatio: number }).leftRatio).toBe(0.2);

      layout.restoreLayoutState({ leftRatio: 0.6 });
      expect((layout as unknown as { leftRatio: number }).leftRatio).toBe(0.5);
    });
  });

  describe('layout state', () => {
    it('should save and restore leftRatio', () => {
      layout.restoreLayoutState({ leftRatio: 0.4 });
      const state = layout.getLayoutState();
      expect(state.leftRatio).toBe(0.4);
    });

    it('should save readoutCollapsed state', () => {
      const state = layout.getLayoutState();
      expect(typeof state.readoutCollapsed).toBe('boolean');
    });
  });

  describe('replaceSlotElement', () => {
    beforeEach(() => {
      layout.render(container);
    });

    it('should replace canvas and return old one', () => {
      const oldCanvas = layout.getCanvas();
      expect(oldCanvas).toBeTruthy();

      const newCanvas = document.createElement('canvas');
      const returned = layout.replaceSlotElement('animation', newCanvas);

      expect(returned).toBe(oldCanvas);
      expect(layout.getCanvas()).toBe(newCanvas);
      expect(newCanvas.className).toBe('teaching-stage-canvas');
    });

    it('should append new canvas when old has no parent', () => {
      const oldCanvas = layout.getCanvas();
      if (oldCanvas?.parentElement) {
        oldCanvas.parentElement.removeChild(oldCanvas);
      }

      const newCanvas = document.createElement('canvas');
      layout.replaceSlotElement('animation', newCanvas);

      expect(layout.getCanvas()).toBe(newCanvas);
    });

    it('should return null for non-animation slot', () => {
      const div = document.createElement('div');
      expect(layout.replaceSlotElement('control', div)).toBeNull();
    });

    it('should return null when no existing canvas', () => {
      (layout as unknown as { stageCanvas: HTMLCanvasElement | null }).stageCanvas = null;
      const newCanvas = document.createElement('canvas');
      expect(layout.replaceSlotElement('animation', newCanvas)).toBeNull();
    });
  });

  describe('handleResize', () => {
    beforeEach(() => {
      layout.render(container);
    });

    it('should use single column below mobileBreakpoint', () => {
      layout.handleResize(500);
      expect(container.style.gridTemplateColumns).toBe('1fr');
    });

    it('should use fixed sidebar at 768-1024px', () => {
      layout.handleResize(899);
      expect(container.style.gridTemplateColumns).toBe('240px 8px 1fr');
    });

    it('should use proportional sidebar above tabletBreakpoint', () => {
      layout.handleResize(1200);
      const cols = container.style.gridTemplateColumns;
      expect(cols).toContain('px 8px 1fr');
    });

    it('should use 280px sidebar for wider tablet', () => {
      layout.handleResize(950);
      expect(container.style.gridTemplateColumns).toBe('280px 8px 1fr');
    });
  });

  describe('theme', () => {
    it('should set data-theme attribute', () => {
      layout.setTheme('dark');
      expect(container.getAttribute('data-theme')).toBe('dark');

      layout.setTheme('light');
      expect(container.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('mount and unmount', () => {
    it('should mount without errors', async () => {
      await layout.mount();
      expect((layout as unknown as { isMounted: boolean }).isMounted).toBe(true);
    });

    it('should unmount and clear container', async () => {
      await layout.mount();
      await layout.unmount();
      expect(container.children.length).toBe(0);
    });

    it('should create debug overlay when enabled', async () => {
      const debugLayout = new TestDesktopLayout(container, { enableDebugPanel: true });
      await debugLayout.mount();
      const overlay = container.querySelector('[style*="z-index: 9999"]');
      expect(overlay).toBeTruthy();
      await debugLayout.unmount();
    });

    it('should clear debug interval on unmount', async () => {
      const debugLayout = new TestDesktopLayout(container, { enableDebugPanel: true });
      await debugLayout.mount();
      await debugLayout.unmount();
      await debugLayout.mount();
      const overlays = container.querySelectorAll('[style*="z-index: 9999"]');
      expect(overlays.length).toBe(1);
      await debugLayout.unmount();
    });
  });
});

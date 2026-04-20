import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseLayout } from '../../src/app/layouts/masters/base-layout';
import type { LayoutSlots, SlotName } from '../../src/app/layouts/types';

class TestLayout extends BaseLayout {
  readonly id = 'test-layout';
  readonly name = 'Test';
  readonly description = 'Test layout';
  readonly supportedSlots: SlotName[] = ['header', 'control', 'animation'];

  render(container: HTMLElement): LayoutSlots {
    const slot = document.createElement('div');
    slot.className = 'test-slot';
    container.appendChild(slot);
    return { header: slot, control: slot, animation: slot };
  }
}

describe('BaseLayout', () => {
  let container: HTMLElement;
  let layout: TestLayout;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    layout = new TestLayout(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('constructor', () => {
    it('should apply default config', () => {
      expect(layout).toBeDefined();
    });

    it('should merge custom config', () => {
      const custom = new TestLayout(container, {
        theme: 'dark',
        mobileBreakpoint: 500
      });
      expect(custom).toBeDefined();
    });
  });

  describe('mount', () => {
    it('should render and mark mounted', async () => {
      await layout.mount();
      expect(container.querySelector('.test-slot')).toBeTruthy();
      expect(container.classList.contains('layout-master')).toBe(true);
      expect(container.classList.contains('layout-test-layout')).toBe(true);
    });

    it('should set initial theme', async () => {
      await layout.mount();
      expect(container.getAttribute('data-theme')).toBe('light');
    });

    it('should warn on double mount', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await layout.mount();
      await layout.mount();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('unmount', () => {
    it('should clear container and reset state', async () => {
      await layout.mount();
      await layout.unmount();
      expect(container.innerHTML).toBe('');
      expect(container.classList.contains('layout-master')).toBe(false);
      expect(container.hasAttribute('data-theme')).toBe(false);
    });

    it('should be safe to unmount when not mounted', async () => {
      expect(async () => await layout.unmount()).not.toThrow();
    });

    it('should abort in-flight animation', async () => {
      await layout.mount();
      const enterPromise = layout.enter();
      await layout.unmount();
      // enter() catches abort internally, so promise resolves
      await enterPromise;
    });
  });

  describe('setTheme', () => {
    it('should update theme attribute', async () => {
      await layout.mount();
      layout.setTheme('dark');
      expect(container.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('enter / exit animations', () => {
    it('should complete enter animation', async () => {
      await layout.mount();
      await layout.enter({ type: 'fade', duration: 10, easing: 'ease-out' });
      expect(container.style.opacity).toBe('1');
    });

    it('should complete exit animation', async () => {
      await layout.mount();
      await layout.exit({ type: 'fade', duration: 10, easing: 'ease-in' });
    });

    it('should abort previous animation on new enter', async () => {
      await layout.mount();
      const first = layout.enter({
        type: 'fade',
        duration: 100,
        easing: 'ease-out'
      });
      const second = layout.enter({
        type: 'fade',
        duration: 10,
        easing: 'ease-out'
      });
      // first enter is aborted internally and resolves via catch
      await first;
      await second;
    });

    it('should abort previous animation on new exit', async () => {
      await layout.mount();
      const first = layout.exit({
        type: 'fade',
        duration: 100,
        easing: 'ease-in'
      });
      const second = layout.exit({
        type: 'fade',
        duration: 10,
        easing: 'ease-in'
      });
      await first;
      await second;
    });
  });

  describe('slot management', () => {
    it('should get slot config', async () => {
      await layout.mount();
      expect(layout.getSlotConfig('header')).toBeUndefined();
    });

    it('should return slot element', async () => {
      await layout.mount();
      expect(layout.getSlot('header')).toBeDefined();
    });

    it('should return all slots', async () => {
      await layout.mount();
      const slots = layout.getSlots();
      expect(slots.header).toBeDefined();
      expect(slots.control).toBeDefined();
    });

    it('should check slot support', () => {
      expect(layout.supportsSlot('header')).toBe(true);
      expect(layout.supportsSlot('graph')).toBe(false);
    });

    it('should toggle slot collapsed', async () => {
      await layout.mount();
      const slot = layout.getSlot('header')!;
      layout.setSlotCollapsed('header', true);
      expect(slot.classList.contains('is-collapsed')).toBe(true);
      expect(slot.getAttribute('data-collapsed')).toBe('true');

      layout.setSlotCollapsed('header', false);
      expect(slot.classList.contains('is-collapsed')).toBe(false);
      expect(slot.getAttribute('data-collapsed')).toBe('false');
    });

    it('should handle collapsing non-existent slot', () => {
      expect(() =>
        layout.setSlotCollapsed('graph' as SlotName, true)
      ).not.toThrow();
    });
  });

  describe('responsive helpers', () => {
    it('should detect mobile', () => {
      expect(layout['isMobile'](500)).toBe(true);
      expect(layout['isMobile'](1000)).toBe(false);
    });

    it('should detect tablet', () => {
      expect(layout['isTablet'](800)).toBe(true);
      expect(layout['isTablet'](500)).toBe(false);
      expect(layout['isTablet'](1200)).toBe(false);
    });

    it('should detect desktop', () => {
      expect(layout['isDesktop'](1200)).toBe(true);
      expect(layout['isDesktop'](800)).toBe(false);
    });

    it('should use container width when not provided', () => {
      Object.defineProperty(container, 'clientWidth', {
        value: 500,
        configurable: true
      });
      expect(layout['isMobile']()).toBe(true);
    });
  });

  describe('protected helpers', () => {
    it('should create slot element', () => {
      const el = layout['createSlot']('header', 'extra-class');
      expect(el.classList.contains('layout-region')).toBe(true);
      expect(el.classList.contains('extra-class')).toBe(true);
      expect(el.getAttribute('data-region')).toBe('header');
    });

    it('should create foldable panel', () => {
      const panel = layout['createFoldablePanel']('control', 'Controls', false);
      expect(panel.classList.contains('foldable-panel')).toBe(true);
      expect(panel.querySelector('.foldable-header')).toBeTruthy();
      expect(panel.querySelector('.foldable-content')).toBeTruthy();
    });

    it('should create foldable panel collapsed by default', () => {
      const panel = layout['createFoldablePanel']('control', 'Controls', true);
      expect(panel.classList.contains('is-collapsed')).toBe(true);
    });

    it('should toggle foldable panel on header click', () => {
      const panel = layout['createFoldablePanel']('control', 'Controls', false);
      const header = panel.querySelector('.foldable-header')!;
      header.dispatchEvent(new MouseEvent('click'));
      expect(panel.classList.contains('is-collapsed')).toBe(true);
      expect(panel.getAttribute('data-collapsed')).toBe('true');
    });

    it('should create resizer', () => {
      const v = layout['createResizer']('vertical');
      expect(v.classList.contains('resizer')).toBe(true);
      expect(v.classList.contains('vertical')).toBe(true);
      expect(v.getAttribute('role')).toBe('separator');

      const h = layout['createResizer']('horizontal');
      expect(h.classList.contains('horizontal')).toBe(true);
      expect(h.getAttribute('aria-orientation')).toBe('horizontal');
    });
  });
});

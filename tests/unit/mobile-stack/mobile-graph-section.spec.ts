import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GraphSectionManager } from '../../../src/app/layouts/masters/mobile-stack/mobile-graph-section';

describe('GraphSectionManager', () => {
  let parent: HTMLElement;
  let manager: GraphSectionManager;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    manager?.destroy();
    parent.remove();
  });

  it('should create graph section with default title', () => {
    manager = new GraphSectionManager(parent, '', false);
    expect(parent.querySelector('.mobile-graph-section')).toBeTruthy();
    expect(manager.section.getAttribute('role')).toBe('region');
  });

  it('should apply initial expanded state', () => {
    manager = new GraphSectionManager(parent, 'Chart', true);
    expect(manager.section.classList.contains('is-expanded')).toBe(true);
    expect(manager.isExpanded()).toBe(true);
  });

  it('should create toggle button with correct attributes', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector('.mobile-section-toggle');
    expect(toggle?.getAttribute('role')).toBe('button');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('tabindex')).toBe('0');
  });

  it('should toggle expanded state on click', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    toggle.click();
    expect(manager.isExpanded()).toBe(true);
    expect(manager.section.classList.contains('is-expanded')).toBe(true);

    toggle.click();
    expect(manager.isExpanded()).toBe(false);
    expect(manager.section.classList.contains('is-expanded')).toBe(false);
  });

  it('should update aria-expanded on toggle', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('should update toggle icon on toggle', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    toggle.click();
    const iconAfterExpand = toggle.querySelector('.toggle-icon');
    expect(iconAfterExpand?.textContent).toBe('▼');

    toggle.click();
    const iconAfterCollapse = toggle.querySelector('.toggle-icon');
    expect(iconAfterCollapse?.textContent).toBe('▶');
  });

  it('should toggle on Enter key', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    toggle.dispatchEvent(event);
    expect(manager.isExpanded()).toBe(true);
  });

  it('should toggle on Space key', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    toggle.dispatchEvent(event);
    expect(manager.isExpanded()).toBe(true);
  });

  it('should not toggle on other keys', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    const toggle = parent.querySelector(
      '.mobile-section-toggle'
    ) as HTMLElement;

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });
    toggle.dispatchEvent(event);
    expect(manager.isExpanded()).toBe(false);
  });

  it('should call onToggle callback', () => {
    const onToggle = vi.fn();
    manager = new GraphSectionManager(parent, 'Chart', false, onToggle);

    manager.toggleExpanded();
    expect(onToggle).toHaveBeenCalledWith(true);

    manager.toggleExpanded();
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should create graph slot with id', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    expect(manager.slot.id).toBe('mobile-graph-content');
    expect(manager.slot.getAttribute('role')).toBe('region');
  });

  it('should use custom title', () => {
    manager = new GraphSectionManager(parent, 'Custom Graph', false);
    const title = parent.querySelector('.toggle-title');
    expect(title?.textContent).toBe('Custom Graph');
  });

  it('should clean up DOM on destroy', () => {
    manager = new GraphSectionManager(parent, 'Chart', false);
    manager.destroy();
    expect(parent.querySelector('.mobile-graph-section')).toBeFalsy();
  });
});

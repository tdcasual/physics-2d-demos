import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadoutBarManager } from '../../../src/app/layouts/masters/mobile-stack/mobile-readout-bar';

describe('ReadoutBarManager', () => {
  let parent: HTMLElement;
  let manager: ReadoutBarManager;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    manager?.destroy();
    parent.remove();
  });

  it('should create readout bar with correct attributes', () => {
    manager = new ReadoutBarManager(parent, 'Readings');
    expect(parent.querySelector('.mobile-readout-bar')).toBeTruthy();
    expect(manager.bar.getAttribute('role')).toBe('region');
    expect(manager.bar.getAttribute('aria-label')).toBe('Readings');
  });

  it('should use default aria-label when title is empty', () => {
    manager = new ReadoutBarManager(parent, '');
    expect(manager.bar.getAttribute('aria-label')).toBe('数据读数');
  });

  it('should render readout items', () => {
    manager = new ReadoutBarManager(parent, '');
    const items = [
      { label: 'Time', value: '1.5s' },
      { label: 'Distance', value: '10m' }
    ];
    manager.setItems(items, 10);

    expect(manager.bar.children.length).toBe(2);
    expect(manager.bar.textContent).toContain('Time');
    expect(manager.bar.textContent).toContain('1.5s');
    expect(manager.bar.textContent).toContain('Distance');
    expect(manager.bar.textContent).toContain('10m');
  });

  it('should limit items by maxItems', () => {
    manager = new ReadoutBarManager(parent, '');
    const items = Array.from({ length: 10 }, (_, i) => ({
      label: `Item${i}`,
      value: `${i}`
    }));
    manager.setItems(items, 3);

    expect(manager.bar.children.length).toBe(3);
  });

  it('should handle numeric values', () => {
    manager = new ReadoutBarManager(parent, '');
    manager.setItems([{ label: 'Speed', value: 42 }], 10);
    expect(manager.bar.textContent).toContain('42');
  });

  it('should handle empty items', () => {
    manager = new ReadoutBarManager(parent, '');
    manager.setItems([], 10);
    expect(manager.bar.innerHTML).toBe('');
  });

  it('should clean up DOM on destroy', () => {
    manager = new ReadoutBarManager(parent, '');
    manager.destroy();
    expect(parent.querySelector('.mobile-readout-bar')).toBeFalsy();
  });
});

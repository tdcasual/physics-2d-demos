import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReadoutPanelManager } from '../../src/app/layouts/masters/split-right/readout-panel';

describe('ReadoutPanelManager', () => {
  let panel: HTMLElement;
  let header: HTMLElement;
  let slot: HTMLElement;
  let toggleBtn: HTMLButtonElement;

  beforeEach(() => {
    panel = document.createElement('div');
    panel.className = 'teaching-readout-panel';
    header = document.createElement('div');
    header.className = 'teaching-readout-header';
    slot = document.createElement('div');
    slot.className = 'teaching-readout-slot';
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'teaching-readout-toggle';
    toggleBtn.textContent = '折叠';
    panel.appendChild(header);
    panel.appendChild(slot);
    panel.appendChild(toggleBtn);
    document.body.appendChild(panel);
  });

  afterEach(() => {
    panel.remove();
    vi.restoreAllMocks();
  });

  function createManager(collapsed = false) {
    return new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed
    });
  }

  it('should create manager with correct initial state', () => {
    const manager = createManager();
    expect(manager.isCollapsed).toBe(false);
    expect(manager.getPanel()).toBe(panel);
    expect(manager.getSlot()).toBe(slot);
  });

  it('should create manager with collapsed state', () => {
    const manager = createManager(true);
    expect(manager.isCollapsed).toBe(true);
  });

  it('should toggle collapsed state', () => {
    const manager = createManager();
    expect(manager.isCollapsed).toBe(false);

    manager.toggle();
    expect(manager.isCollapsed).toBe(true);
    expect(panel.classList.contains('teaching-is-collapsed')).toBe(true);

    manager.toggle();
    expect(manager.isCollapsed).toBe(false);
    expect(panel.classList.contains('teaching-is-collapsed')).toBe(false);
  });

  it('should update toggle button text on toggle', () => {
    const manager = createManager();
    manager.toggle();
    expect(toggleBtn.textContent).toBe('展开');
    expect(toggleBtn.getAttribute('aria-label')).toBe('展开');

    manager.toggle();
    expect(toggleBtn.textContent).toBe('折叠');
    expect(toggleBtn.getAttribute('aria-label')).toBe('折叠');
  });

  it('should find toggle button dynamically if changed', () => {
    const manager = createManager();
    const newToggle = document.createElement('button');
    newToggle.className = 'teaching-readout-toggle';
    newToggle.textContent = '折叠';
    toggleBtn.remove();
    panel.appendChild(newToggle);

    manager.toggle();
    expect(newToggle.textContent).toBe('展开');
  });

  it('should init features without error', () => {
    const manager = createManager();
    expect(() => manager.initFeatures()).not.toThrow();
  });

  it('should dispose without error', () => {
    const manager = createManager();
    manager.initFeatures();
    expect(() => manager.dispose()).not.toThrow();
  });

  it('should dispose safely when called twice', () => {
    const manager = createManager();
    manager.initFeatures();
    manager.dispose();
    expect(() => manager.dispose()).not.toThrow();
  });

  it('should dispose safely without initFeatures', () => {
    const manager = createManager();
    expect(() => manager.dispose()).not.toThrow();
  });

  it('should observe panel resize after initFeatures', () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, 'observe');
    const manager = createManager();
    manager.initFeatures();
    expect(observeSpy).toHaveBeenCalledWith(panel);
    manager.dispose();
    observeSpy.mockRestore();
  });

  it('should create resize handle after initFeatures', () => {
    const manager = createManager();
    manager.initFeatures();
    const handle = panel.querySelector('.readout-resize-handle');
    expect(handle).toBeTruthy();
    manager.dispose();
  });

  it('should set panel position absolute after initFeatures', () => {
    const manager = createManager();
    manager.initFeatures();
    expect(panel.style.position).toBe('absolute');
    manager.dispose();
  });
});

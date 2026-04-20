import { describe, expect, it } from 'vitest';
import { ReadoutPanelManager } from '../../src/app/layouts/masters/split-right/readout-panel';

function createReadoutPanel(): {
  panel: HTMLElement;
  header: HTMLElement;
  slot: HTMLElement;
  toggleBtn: HTMLButtonElement;
} {
  const panel = document.createElement('div');
  panel.className = 'readout-panel is-collapsed';

  const header = document.createElement('div');
  header.className = 'readout-header';
  header.innerHTML = `
    <span class="readout-title">数据读数</span>
    <div class="readout-actions">
      <button type="button" class="readout-resize-toggle" title="调整大小">⤢</button>
      <button type="button" class="readout-toggle" aria-label="展开">展开</button>
    </div>
  `;

  const slot = document.createElement('ul');
  slot.className = 'readout-slot readout-slot--adaptive';
  slot.setAttribute('data-columns', 'auto');

  panel.appendChild(header);
  panel.appendChild(slot);

  const toggleBtn = header.querySelector(
    '.readout-toggle'
  ) as HTMLButtonElement;

  return { panel, header, slot, toggleBtn };
}

describe('ReadoutPanelManager', () => {
  it('should create manager with collapsed state', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    expect(manager.isCollapsed).toBe(true);
    expect(manager.getPanel()).toBe(panel);
    expect(manager.getSlot()).toBe(slot);
  });

  it('should toggle collapsed state', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    manager.toggle();

    expect(manager.isCollapsed).toBe(false);
    expect(panel.classList.contains('is-collapsed')).toBe(false);

    const btn = header.querySelector('.readout-toggle') as HTMLButtonElement;
    expect(btn.textContent).toBe('折叠');
    expect(btn.getAttribute('aria-label')).toBe('折叠');
  });

  it('should toggle back to collapsed', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: false
    });

    manager.toggle();

    expect(manager.isCollapsed).toBe(true);
    expect(panel.classList.contains('is-collapsed')).toBe(true);

    const btn = header.querySelector('.readout-toggle') as HTMLButtonElement;
    expect(btn.textContent).toBe('展开');
    expect(btn.getAttribute('aria-label')).toBe('展开');
  });

  it('should init features and create resize handle', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    manager.initFeatures();

    const handle = panel.querySelector('.readout-resize-handle');
    expect(handle).toBeTruthy();
    expect(panel.style.position).toBe('absolute');
  });

  it('should set resize handle tabindex to -1 to skip tab order', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    manager.initFeatures();

    const handle = panel.querySelector('.readout-resize-handle') as HTMLElement;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('tabindex')).toBe('-1');
  });

  it('should dispose and remove resize handle', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    manager.initFeatures();
    expect(panel.querySelector('.readout-resize-handle')).toBeTruthy();

    manager.dispose();
    expect(panel.querySelector('.readout-resize-handle')).toBeFalsy();
  });

  it('should handle toggle when toggle button is recreated', () => {
    const { panel, header, slot, toggleBtn } = createReadoutPanel();
    const manager = new ReadoutPanelManager({
      panel,
      header,
      slot,
      toggleBtn,
      collapsed: true
    });

    // Simulate button being replaced in DOM
    toggleBtn.remove();
    const newToggle = document.createElement('button');
    newToggle.className = 'readout-toggle';
    newToggle.textContent = '展开';
    newToggle.setAttribute('aria-label', '展开');
    header.querySelector('.readout-actions')!.appendChild(newToggle);

    manager.toggle();

    expect(manager.isCollapsed).toBe(false);
    expect(newToggle.textContent).toBe('折叠');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import { mechanicalEnergyControlsSchema } from '../../src/scenes/mechanical-energy/controls-schema';
import {
  createChromeScheduler,
  createMechanicalEnergyDataPanel,
  findMechanicalEnergyDataHost,
  mountDataPanel,
  syncDataPanelCollapsed
} from '../../src/scenes/mechanical-energy/data-panel';
import {
  createMechanicalEnergySim,
  shouldShowResistance
} from '../../src/scenes/mechanical-energy/scene.sim';

describe('mechanical-energy chrome scheduler', () => {
  const queued: FrameRequestCallback[] = [];
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const nodes: HTMLElement[] = [];

  afterEach(() => {
    queued.length = 0;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
    for (const node of nodes) node.remove();
    nodes.length = 0;
  });

  function installQueue(): void {
    queued.length = 0;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    };
    window.cancelAnimationFrame = () => undefined;
  }

  function track(node: HTMLElement): HTMLElement {
    nodes.push(node);
    return node;
  }

  it('does not run the second frame after dispose', () => {
    installQueue();
    let runs = 0;
    const chrome = createChromeScheduler(() => {
      runs += 1;
    });
    chrome.start();
    expect(queued).toHaveLength(1);
    queued[0](0);
    expect(runs).toBe(1);
    expect(queued).toHaveLength(2);
    const pending = queued[1];
    chrome.dispose();
    pending(0);
    expect(runs).toBe(1);
  });

  it('does not schedule raf2 if disposed during raf1', () => {
    installQueue();
    let runs = 0;
    const chrome = createChromeScheduler(() => {
      runs += 1;
      chrome.dispose();
    });
    chrome.start();
    queued[0](0);
    expect(runs).toBe(1);
    expect(queued).toHaveLength(1);
  });

  it('hides the sample table when the overlay readout is collapsed', () => {
    const host = track(document.createElement('div'));
    host.className = 'srgb-readout-panel is-collapsed';
    document.body.appendChild(host);
    const panel = createMechanicalEnergyDataPanel();
    host.appendChild(panel.element);
    const sim = createMechanicalEnergySim({ autoRun: true });
    sim.step(0.24);
    panel.update(sim.getState());
    syncDataPanelCollapsed(panel.element);
    expect(panel.element.style.display).toBe('none');
    host.classList.remove('is-collapsed');
    syncDataPanelCollapsed(panel.element);
    expect(panel.element.style.display).toBe('');
    expect(panel.element.querySelectorAll('tbody tr')).toHaveLength(5);
    panel.dispose();
  });

  it('mounts the table inside the readout slot so collapse CSS can hide it', () => {
    const panelRoot = track(document.createElement('div'));
    panelRoot.className = 'srgb-readout-panel';
    const slot = document.createElement('ul');
    slot.className = 'srgb-readout-slot readout-slot';
    panelRoot.appendChild(slot);
    document.body.appendChild(panelRoot);
    const panel = createMechanicalEnergyDataPanel();
    mountDataPanel(slot, panel.element);
    const item = slot.querySelector('li[data-energy-table]');
    expect(item).toBeTruthy();
    expect(item?.contains(panel.element)).toBe(true);
    syncDataPanelCollapsed(panel.element);
    expect(panel.element.style.display).not.toBe('none');
    panel.dispose();
  });

  it('prefers the lab data slot then the mobile readout panel', () => {
    const lab = track(document.createElement('div'));
    lab.setAttribute('data-lab-data-slot', 'true');
    document.body.appendChild(lab);
    expect(findMechanicalEnergyDataHost()).toBe(lab);
    lab.remove();
    const mobile = track(document.createElement('div'));
    mobile.className = 'mobile-stack-layout';
    const inner = document.createElement('div');
    inner.className = 'mobile-readout-panel';
    // mobile 读数挂载点由 readout 能力创建点打标
    inner.setAttribute('data-readout-slot', '');
    mobile.appendChild(inner);
    document.body.appendChild(mobile);
    expect(findMechanicalEnergyDataHost()).toBe(inner);
  });

  it('hides the k slider in ideal mode and shows it for resist', () => {
    const mount = track(document.createElement('div'));
    document.body.appendChild(mount);
    const renderer = renderSchema({
      mount,
      schema: mechanicalEnergyControlsSchema,
      onChange() {},
      onAction() {}
    });
    const row = mount.querySelector('[data-control-key="resistance"]');
    expect(row).toBeInstanceOf(HTMLElement);
    renderer.setVisible('resistance', shouldShowResistance('resist'));
    expect((row as HTMLElement).style.display).not.toBe('none');
    renderer.setVisible('resistance', shouldShowResistance('ideal'));
    expect((row as HTMLElement).style.display).toBe('none');
    renderer.setVisible('resistance', shouldShowResistance('resist'));
    expect((row as HTMLElement).style.display).not.toBe('none');
    renderer.dispose();
  });
});

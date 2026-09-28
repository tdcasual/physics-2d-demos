import { afterEach, describe, expect, it } from 'vitest';
import { createChromeScheduler } from '../../src/scenes/page-utils';
import { suppressLabFloatInlineReadoutTitle } from '../../src/scenes/projectile-components/data-panel';

describe('projectile-components chrome scheduler', () => {
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
    // Do not replace queued callbacks with a noop. The regression is: raf2
    // is already captured, then dispose runs, then that captured callback
    // still fires — only the disposed guard may stop it.
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

  it('blocks raf2 via disposed guard even if cancelAnimationFrame is a no-op', () => {
    installQueue();
    window.cancelAnimationFrame = () => undefined;
    let runs = 0;
    const chrome = createChromeScheduler(() => {
      runs += 1;
    });
    chrome.start();
    queued[0](0);
    expect(runs).toBe(1);
    const pending = queued[1];
    chrome.dispose();
    pending(0);
    expect(runs).toBe(1);
  });

  it('cancels the saved raf2 id after raf1 has already run', () => {
    installQueue();
    const cancelled: number[] = [];
    window.cancelAnimationFrame = (id: number) => {
      cancelled.push(id);
    };
    let runs = 0;
    const chrome = createChromeScheduler(() => {
      runs += 1;
    });
    chrome.start();
    queued[0](0);
    expect(runs).toBe(1);
    expect(queued).toHaveLength(2);
    const pending = queued[1];
    chrome.dispose();
    expect(cancelled).toContain(2);
    pending(0);
    expect(runs).toBe(1);
  });

  it('does not attach a detached panel to a replacement host after dispose', () => {
    installQueue();
    const firstHost = track(document.createElement('div'));
    firstHost.setAttribute('data-lab-data-slot', 'true');
    document.body.appendChild(firstHost);
    const panel = track(document.createElement('section'));
    panel.setAttribute('aria-label', '频闪采样');
    const chrome = createChromeScheduler(() => {
      const host =
        document.querySelector('[data-lab-data-slot]') ??
        document.querySelector('#replacement-host');
      if (host instanceof HTMLElement && panel.parentElement !== host) {
        host.appendChild(panel);
      }
    });
    chrome.start();
    queued[0](0);
    expect(panel.parentElement).toBe(firstHost);
    firstHost.remove();
    panel.remove();
    const replacement = track(document.createElement('div'));
    replacement.id = 'replacement-host';
    document.body.appendChild(replacement);
    const pending = queued[1];
    chrome.dispose();
    pending(0);
    expect(replacement.contains(panel)).toBe(false);
    expect(panel.parentElement).toBeNull();
  });

  it('does not start frames after dispose', () => {
    installQueue();
    const chrome = createChromeScheduler(() => undefined);
    chrome.dispose();
    chrome.start();
    expect(queued).toHaveLength(0);
  });
});

describe('projectile-components lab-float title chrome', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('removes nested ReadoutPanel title inside lab-float-data and keeps the float heading', () => {
    const layout = document.createElement('div');
    layout.className = 'layout-master';
    const float = document.createElement('section');
    float.className = 'lab-float-data';
    const slot = document.createElement('div');
    slot.setAttribute('data-lab-data-slot', 'true');
    const heading = document.createElement('h2');
    heading.className = 'lab-float-title';
    heading.textContent = '数据读数';
    const inline = document.createElement('div');
    inline.className = 'mobile-readout-inline-title readout-inline-title';
    inline.textContent = '数据读数';
    const items = document.createElement('ul');
    items.innerHTML =
      '<li class="readout-item">t / T</li><li class="readout-item">x</li>';
    const table = document.createElement('table');
    table.setAttribute('aria-label', '频闪采样记录');
    table.innerHTML = '<tbody><tr><td>0.00</td></tr></tbody>';
    float.append(heading, inline, items, table, slot);
    layout.appendChild(float);
    document.body.appendChild(layout);

    suppressLabFloatInlineReadoutTitle();

    expect(float.querySelector('.lab-float-title')?.textContent).toBe(
      '数据读数'
    );
    expect(float.querySelector('.readout-inline-title')).toBeNull();
    expect(float.querySelectorAll('.readout-item')).toHaveLength(2);
    expect(
      float.querySelectorAll('table[aria-label="频闪采样记录"] tbody tr')
    ).toHaveLength(1);
  });

  it('does not strip the mobile-stack ReadoutPanel title', () => {
    const mobile = document.createElement('div');
    mobile.className = 'mobile-stack-layout';
    const title = document.createElement('div');
    title.className = 'mobile-readout-inline-title readout-inline-title';
    title.textContent = '数据读数';
    mobile.appendChild(title);
    document.body.appendChild(mobile);

    suppressLabFloatInlineReadoutTitle();

    expect(mobile.querySelector('.readout-inline-title')?.textContent).toBe(
      '数据读数'
    );
  });
});

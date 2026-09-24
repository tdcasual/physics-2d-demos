import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDoubleSlitScene } from '../../src/scenes/double-slit/scene.entry';

/**
 * Instrument modules are loaded with a plain dynamic import(). There is no
 * test seam that can pause that import. The race below uses the real gap:
 * setParams returns before import().then runs, which is the same window a
 * layout switch has while the modules are still in flight.
 */
function mountScene() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const parent = document.createElement('div');
  parent.style.width = '800px';
  parent.style.height = '600px';
  parent.appendChild(canvas);
  document.body.appendChild(parent);
  return {
    canvas,
    parent,
    scene: createDoubleSlitScene({ canvas, theme: 'light' })
  };
}

function wraps(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[data-double-slit-instruments="true"]'
    )
  ];
}

/** Instrument views paint inside open shadow roots, not the light DOM. */
function shadowRoots(wrap: ParentNode, selector: string): Element[] {
  const found: Element[] = [];
  const visit = (node: ParentNode) => {
    node.querySelectorAll('*').forEach((el) => {
      if (!(el instanceof HTMLElement) || !el.shadowRoot) return;
      el.shadowRoot.querySelectorAll(selector).forEach((match) => {
        found.push(match);
      });
      visit(el.shadowRoot);
    });
  };
  visit(wrap);
  return found;
}

describe('double-slit instrument lifecycle', () => {
  const scenes: Array<{ dispose(): void }> = [];

  afterEach(() => {
    for (const scene of scenes.splice(0)) scene.dispose();
    document.body.replaceChildren();
  });

  it('rehomes one wrap if the layout moves the canvas before imports settle', async () => {
    const { canvas, parent, scene } = mountScene();
    scenes.push(scene);
    scene.setParams({ step: 6, lightMode: 'mono' });
    const wrap = wraps()[0];
    expect(wrap).toBeTruthy();
    expect(wrap.querySelector('[data-instrument-scroll]')).toBeNull();

    const next = document.createElement('div');
    next.style.width = '800px';
    next.style.height = '600px';
    document.body.appendChild(next);
    next.appendChild(canvas);
    scene.reattach();
    scene.reattach();

    expect(wraps()).toEqual([wrap]);
    expect(wrap.parentElement).toBe(next);
    expect(parent.style.position).toBe('');
    expect(next.style.position).toBe('relative');
    expect(wrap.isConnected).toBe(true);

    await vi.waitFor(() => {
      expect(shadowRoots(wrap, '.microscope-root')).toHaveLength(1);
      expect(shadowRoots(wrap, '.micrometer-root')).toHaveLength(1);
    });
    expect(wrap.querySelectorAll('[data-instrument-scroll]')).toHaveLength(2);
    expect(wraps()).toHaveLength(1);

    wrap.dispatchEvent(
      new CustomEvent('instrument-set-reading', { detail: { mm: 12.5 } })
    );
    const caliper = wrap.dataset.readingMm;
    expect(caliper).toBeTruthy();

    const moved = document.createElement('div');
    document.body.appendChild(moved);
    moved.appendChild(canvas);
    scene.resize();
    expect(wrap.parentElement).toBe(moved);
    expect(next.style.position).toBe('');
    expect(moved.style.position).toBe('relative');
    expect(wrap.dataset.readingMm).toBe(caliper);
    expect(shadowRoots(wrap, '.microscope-root')).toHaveLength(1);
    expect(shadowRoots(wrap, '.micrometer-root')).toHaveLength(1);

    scene.setParams({ activeInstrument: 'micrometer' });
    wrap.dispatchEvent(
      new CustomEvent('instrument-set-reading', { detail: { mm: 3.5 } })
    );
    const micrometer = wrap.dataset.readingMm;
    expect(micrometer).toBeTruthy();
    expect(micrometer).not.toBe(caliper);

    const again = document.createElement('div');
    document.body.appendChild(again);
    again.appendChild(canvas);
    scene.reattach();
    expect(wrap.parentElement).toBe(again);
    expect(wrap.dataset.readingMm).toBe(micrometer);
    scene.setParams({ activeInstrument: 'caliper' });
    expect(wrap.dataset.readingMm).toBe(caliper);
    expect(wraps()).toHaveLength(1);
  });

  it('drops a stale import when step 6 is left before the modules settle', async () => {
    const { scene } = mountScene();
    scenes.push(scene);
    scene.setParams({ step: 6, lightMode: 'mono' });
    const stale = wraps()[0];
    expect(stale).toBeTruthy();
    scene.setParams({ step: 1 });
    expect(wraps()).toHaveLength(0);

    scene.setParams({ step: 6, lightMode: 'mono' });
    const fresh = wraps()[0];
    expect(fresh).toBeTruthy();
    expect(fresh).not.toBe(stale);

    await vi.waitFor(() => {
      expect(shadowRoots(fresh, '.microscope-root')).toHaveLength(1);
      expect(shadowRoots(fresh, '.micrometer-root')).toHaveLength(1);
    });
    expect(wraps()).toEqual([fresh]);
    expect(fresh.querySelectorAll('[data-instrument-scroll]')).toHaveLength(2);
    expect(stale.isConnected).toBe(false);
    expect(shadowRoots(stale, '.microscope-root')).toHaveLength(0);
  });
});

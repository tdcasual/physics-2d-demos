/**
 * Registry-wide layout contract.
 *
 * This suite intentionally discovers layouts from the registry instead of
 * maintaining a second list. Every product layout enters this contract as soon
 * as it is registered by registerAllLayouts().
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import {
  layoutRegistry,
  type LayoutMetadata
} from '../../src/app/layouts/registry';
import type {
  LayoutSlots,
  LayoutTestProfile
} from '../../src/app/layouts/types';

function createContainer(width: number, height: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);
  return container;
}

function expectSlotsInContainer(
  container: HTMLElement,
  slots: Partial<LayoutSlots>
): void {
  const seen = new Set<HTMLElement>();
  for (const [name, slot] of Object.entries(slots)) {
    if (!slot) continue;
    expect(seen.has(slot), `duplicate element returned for slot ${name}`).toBe(
      false
    );
    expect(
      container.contains(slot),
      `slot ${name} is outside the container`
    ).toBe(true);
    seen.add(slot);
  }
}

function requireTestProfile(meta: LayoutMetadata): LayoutTestProfile {
  if (!meta.layoutTestProfile) {
    throw new Error(`${meta.id} missing test profile`);
  }
  return meta.layoutTestProfile;
}

describe('registry-wide layout contract', () => {
  beforeEach(() => {
    layoutRegistry.clear();
    registerAllLayouts();
  });

  afterEach(() => {
    layoutRegistry.clear();
    document.body.innerHTML = '';
  });

  it('provides a profile for every registered product layout', () => {
    const metadata = layoutRegistry.getAllMetadata();
    expect(metadata.length).toBeGreaterThan(0);
    for (const meta of metadata) {
      expect(
        meta.layoutTestProfile,
        `${meta.id} has no test profile`
      ).toBeDefined();
      expect(meta.layoutTestProfile!.viewports.length).toBeGreaterThan(0);
      expect(meta.supportedSlots).toEqual(
        expect.arrayContaining(['control', 'animation'])
      );
    }
  });

  it('mounts, resizes, and unmounts every registered layout without leaked DOM', async () => {
    for (const meta of layoutRegistry.getAllMetadata()) {
      const profile = requireTestProfile(meta);
      const viewport = profile.viewports[0];
      const container = createContainer(viewport.width, viewport.height);
      const layout = layoutRegistry.create(meta.id, container);

      const firstSlots = await layout.mount();
      const secondSlots = await layout.mount();
      expect(secondSlots, `${meta.id} mount should be idempotent`).toBe(
        firstSlots
      );
      expect(firstSlots.control).toBeDefined();
      expect(firstSlots.animation).toBeDefined();
      expectSlotsInContainer(container, firstSlots);

      expect(() => layout.setTheme('dark')).not.toThrow();
      expect(() =>
        layout.handleResize(viewport.width, viewport.height)
      ).not.toThrow();

      await layout.unmount();
      expect(container.childElementCount, `${meta.id} leaked DOM`).toBe(0);
      await layout.unmount();
      expect(container.childElementCount).toBe(0);
    }
  });

  it('exposes tab semantics only for tab interaction models', async () => {
    for (const meta of layoutRegistry.getAllMetadata()) {
      const profile = requireTestProfile(meta);
      const viewport = profile.viewports[0];
      const container = createContainer(viewport.width, viewport.height);
      const layout = layoutRegistry.create(meta.id, container);
      await layout.mount();

      const tabs = container.querySelectorAll('[role="tab"]');
      if (profile.interactionModel === 'tabs') {
        expect(tabs.length, `${meta.id} should expose tabs`).toBeGreaterThan(0);
        for (const tab of tabs) {
          const controls = tab.getAttribute('aria-controls');
          expect(controls).toBeTruthy();
          expect(container.querySelector(`#${controls}`)).not.toBeNull();
        }
      } else {
        expect(tabs.length, `${meta.id} unexpectedly exposes tabs`).toBe(0);
      }

      await layout.unmount();
      container.remove();
    }
  });
});

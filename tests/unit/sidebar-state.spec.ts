import { describe, expect, it } from 'vitest';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';

describe('SidebarStateOwner', () => {
  it('keeps user hidden separate from presentation suppression', () => {
    const owner = new SidebarStateOwner();
    const el = document.createElement('div');
    owner.setUserHidden(true);
    expect(owner.getEffectiveHidden()).toBe(true);
    owner.setPresentationSuppressed(true);
    expect(owner.getUserHidden()).toBe(true);
    owner.setPresentationSuppressed(false);
    expect(owner.getEffectiveHidden()).toBe(true);
    owner.project(el);
    expect(el.dataset.sidebarHidden).toBe('true');
  });

  it('restores a snapshot across layout remounts', () => {
    const owner = new SidebarStateOwner();
    owner.setUserHidden(true);
    const snap = owner.snapshot();
    owner.resetForNewScene();
    expect(owner.getUserHidden()).toBe(false);
    owner.restore(snap);
    expect(owner.getUserHidden()).toBe(true);
    expect(owner.getEffectiveHidden()).toBe(true);
  });
});
